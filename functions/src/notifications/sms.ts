import twilio from 'twilio';

// Numbers reserved for testing. They cannot receive a real SMS, so they are
// never handed to Twilio — sendSMS resolves without sending. The codes are used
// by the phone OTP flow in auth/phoneOTP.ts, which looks them up here so there
// is one list to maintain.
export const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+16505551234': '123456',
};

export function isTestPhoneNumber(phone: string): boolean {
  return phone in TEST_PHONE_NUMBERS;
}

export async function sendSMS(to: string, body: string) {
  if (isTestPhoneNumber(to)) {
    console.log(`Skipping SMS to test number ${to}.`);
    return;
  }

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
