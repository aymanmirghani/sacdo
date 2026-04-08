import twilio from 'twilio';

export async function sendSMS(to: string, body: string) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
  });
}
