/**
 * One-time backfill: strip rolled-forward past-due balances from UNPAID invoices.
 *
 * Invoices used to be generated as `amount = baseAmount + sum(all unpaid prior
 * invoices)`, so every invoice restated the ones before it and the outstanding
 * total compounded. Generation no longer does this; this script repairs the
 * invoices created under the old rule.
 *
 * For each pending/overdue invoice with pastDueAmount > 0:
 *     amount        -> baseAmount        (that period's fee only)
 *     pastDueAmount -> 0
 * The original value is kept in `amountBeforePastDueFix` so this is reversible.
 *
 * PAID invoices are deliberately left alone: their amount is the record of money
 * actually collected, and rewriting it would contradict the Stripe charge.
 *
 * Usage:
 *   node scripts/fix-invoice-balances.js           dry run — writes nothing
 *   node scripts/fix-invoice-balances.js --apply   perform the update
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const APPLY = process.argv.includes('--apply');
const UNPAID = ['pending', 'overdue'];
const BATCH_SIZE = 400;

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = admin.firestore();

const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;

async function main() {
  const snap = await db.collection('invoices').get();
  console.log(`Scanned ${snap.size} invoice(s) in the invoices collection.\n`);

  const toFix = [];
  const noBaseAmount = [];
  const paidRollups = [];
  const unpaidByMember = new Map();

  for (const doc of snap.docs) {
    const d = doc.data();
    const pastDue = Number(d.pastDueAmount ?? 0);
    const row = {
      id: doc.id,
      memberId: d.memberId,
      memberName: d.memberName || d.memberId,
      period: d.period,
      status: d.status,
      amount: Number(d.amount ?? 0),
      baseAmount: d.baseAmount,
      pastDue,
    };

    if (UNPAID.includes(d.status)) {
      if (!unpaidByMember.has(d.memberId)) unpaidByMember.set(d.memberId, []);
      unpaidByMember.get(d.memberId).push(row);
    }

    if (pastDue <= 0) continue;

    if (d.status === 'paid') {
      paidRollups.push(row);
    } else if (UNPAID.includes(d.status)) {
      if (typeof d.baseAmount !== 'number') noBaseAmount.push(row);
      else toFix.push(row);
    }
  }

  // ─── What will change ───────────────────────────────────────────────────────
  console.log(`Unpaid invoices carrying a rolled-up past-due balance: ${toFix.length}`);
  if (toFix.length > 0) {
    const byMember = new Map();
    for (const r of toFix) {
      if (!byMember.has(r.memberId)) byMember.set(r.memberId, []);
      byMember.get(r.memberId).push(r);
    }

    for (const [memberId, rows] of byMember) {
      rows.sort((a, b) => a.period.localeCompare(b.period));
      const all = unpaidByMember.get(memberId) || [];
      const before = all.reduce((s, r) => s + r.amount, 0);
      const after = all.reduce(
        (s, r) => s + (typeof r.baseAmount === 'number' && r.pastDue > 0 ? r.baseAmount : r.amount),
        0
      );
      console.log(`\n  ${rows[0].memberName}`);
      for (const r of rows) {
        console.log(`    ${r.period}  ${r.status.padEnd(7)}  ${money(r.amount)} -> ${money(r.baseAmount)}   (removing ${money(r.pastDue)} past due)`);
      }
      console.log(`    outstanding total: ${money(before)} -> ${money(after)}`);
    }
  }

  const totalBefore = toFix.reduce((s, r) => s + r.amount, 0);
  const totalAfter = toFix.reduce((s, r) => s + r.baseAmount, 0);
  console.log(`\nTotals on affected invoices: ${money(totalBefore)} -> ${money(totalAfter)}`);

  // ─── Things this script will NOT touch, but you should see ──────────────────
  if (noBaseAmount.length > 0) {
    console.log(`\n!! ${noBaseAmount.length} unpaid invoice(s) have a past-due balance but no baseAmount field — skipped, needs a manual decision:`);
    for (const r of noBaseAmount) console.log(`     ${r.memberName}  ${r.period}  ${money(r.amount)}  (doc ${r.id})`);
  }

  if (paidRollups.length > 0) {
    console.log(`\nNote: ${paidRollups.length} PAID invoice(s) include a past-due amount (left untouched).`);
    let stale = 0;
    for (const paid of paidRollups) {
      const older = (unpaidByMember.get(paid.memberId) || []).filter((r) => r.period < paid.period);
      if (older.length > 0) {
        stale += older.length;
        console.log(`     ${paid.memberName}: paid ${paid.period} for ${money(paid.amount)} (incl. ${money(paid.pastDue)} past due), but ${older.map((r) => r.period).join(', ')} are still ${older[0].status}`);
      }
    }
    if (stale > 0) {
      console.log(`     -> ${stale} older invoice(s) were likely settled by a later rolled-up payment but never marked paid.`);
      console.log(`        This script does not resolve those; decide per member whether to mark them paid.`);
    }
  }

  // ─── Write ──────────────────────────────────────────────────────────────────
  if (!APPLY) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to perform the update.');
    return;
  }
  if (toFix.length === 0) {
    console.log('\nNothing to update.');
    return;
  }

  let written = 0;
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const r of toFix.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection('invoices').doc(r.id), {
        amount: r.baseAmount,
        pastDueAmount: 0,
        amountBeforePastDueFix: r.amount,
        pastDueFixedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, toFix.length - i);
    console.log(`Updated ${written}/${toFix.length}...`);
  }
  console.log(`\nDone. ${written} invoice(s) updated.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
