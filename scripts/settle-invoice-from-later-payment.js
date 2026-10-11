/**
 * Marks an unpaid invoice as paid when a LATER invoice already collected its
 * amount as a rolled-forward past-due balance.
 *
 * Under the old billing rule each invoice restated every unpaid prior invoice,
 * so paying the later one settled the earlier month in practice -- but nothing
 * ever marked the earlier invoice paid, leaving a phantom balance behind.
 *
 * Edit TARGET below, then:
 *   node scripts/settle-invoice-from-later-payment.js           dry run
 *   node scripts/settle-invoice-from-later-payment.js --apply
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const APPLY = process.argv.includes('--apply');

// Invoice to settle, and the later paid invoice that actually covered it.
const TARGET = {
  unpaidInvoiceId: 'GGGLubILVGzg5jr0leR5', // Mohammed Alameen, 2026-08, $40 pending
  paidInvoiceId: 'rlMlZppE0AQyuDAhJfml',   // Mohammed Alameen, 2026-09, $80 paid (incl. $40 past due)
  admin: { id: 'GShb1D759YgSFuiF9jaI0YXqWEO2', name: 'Ayman Mirghani' },
};

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = admin.firestore();
const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;

async function main() {
  const unpaidRef = db.collection('invoices').doc(TARGET.unpaidInvoiceId);
  const paidRef = db.collection('invoices').doc(TARGET.paidInvoiceId);
  const [unpaidSnap, paidSnap] = await Promise.all([unpaidRef.get(), paidRef.get()]);

  if (!unpaidSnap.exists) throw new Error(`Unpaid invoice ${TARGET.unpaidInvoiceId} not found.`);
  if (!paidSnap.exists) throw new Error(`Paid invoice ${TARGET.paidInvoiceId} not found.`);

  const unpaid = unpaidSnap.data();
  const paid = paidSnap.data();

  // Sanity checks -- refuse to touch anything that does not match the story.
  if (unpaid.memberId !== paid.memberId) throw new Error('The two invoices belong to different members.');
  if (unpaid.status === 'paid') throw new Error('Invoice is already marked paid.');
  if (paid.status !== 'paid') throw new Error('The covering invoice is not paid.');
  if (!(unpaid.period < paid.period)) throw new Error('The covering invoice is not from a later period.');
  if (Number(paid.pastDueAmount ?? 0) < Number(unpaid.amount ?? 0)) {
    throw new Error(`Covering invoice past due (${money(paid.pastDueAmount)}) is less than the outstanding amount (${money(unpaid.amount)}).`);
  }

  const paidDate = paid.paidDate;
  const reference = paid.stripePaymentIntentId || paid.paymentReference || '';
  const settledOn = paidDate ? paidDate.toDate().toISOString().slice(0, 10) : 'unknown date';

  const update = {
    status: 'paid',
    paidDate,
    paymentMethod: paid.paymentMethod || 'Credit Card',
    paymentReference: reference,
    notes: `Settled by the ${paid.period} payment of ${money(paid.amount)} on ${settledOn}, which included this invoice as ${money(paid.pastDueAmount)} past due under the old rolled-forward billing. Reconciled 2026-10-11.`,
    processedBy: `${TARGET.admin.name} (reconciliation)`,
    settledByInvoiceId: TARGET.paidInvoiceId,
  };

  console.log(`${unpaid.memberName} -- invoice ${unpaid.period} (${money(unpaid.amount)})`);
  console.log(`  status           ${unpaid.status} -> paid`);
  console.log(`  paidDate         -> ${settledOn}  (from the ${paid.period} payment)`);
  console.log(`  paymentMethod    -> ${update.paymentMethod}`);
  console.log(`  paymentReference -> ${reference}`);
  console.log(`  processedBy      -> ${update.processedBy}`);
  console.log(`  notes            -> ${update.notes}`);

  if (!APPLY) {
    console.log('\nDRY RUN -- nothing was written. Re-run with --apply.');
    return;
  }

  await unpaidRef.update(update);

  await db.collection('auditLog').add({
    adminId: TARGET.admin.id,
    adminName: TARGET.admin.name,
    action: 'invoice_marked_paid',
    collection: 'invoices',
    itemId: TARGET.unpaidInvoiceId,
    itemDescription: `Invoice ${unpaid.period} - ${unpaid.memberName}`,
    changes: [
      { field: 'status', oldValue: unpaid.status, newValue: 'paid' },
      { field: 'paymentReference', oldValue: unpaid.paymentReference ?? null, newValue: reference },
      { field: 'notes', oldValue: unpaid.notes ?? null, newValue: update.notes },
    ],
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('\nDone. Invoice marked paid and an audit log entry was written.');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
