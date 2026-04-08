import sgMail from '@sendgrid/mail';

export async function sendEmail(to: string, subject: string, html: string) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!.trim());

  await sgMail.send({
    from: process.env.FROM_EMAIL!.trim(),
    to,
    subject,
    html,
  });
}
