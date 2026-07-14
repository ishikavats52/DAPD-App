const twilio = require('twilio');
const { normalizePhoneToE164 } = require('../utils/phone');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

function getVerifyServiceSid() {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!sid) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID not configured');
  }
  return sid;
}

function isTwilioOtpEnabled() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  );
}

function isConsoleOtpEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_CONSOLE_OTP === 'true';
}

function isOtpDeliveryEnabled() {
  return isTwilioOtpEnabled() || isConsoleOtpEnabled();
}

function logOtpToConsole({ kind, toPhone, toEmail, otp }) {
  console.log(`\n================= OTP DEBUG (${kind}) =================`);
  console.log(`To Phone: ${toPhone}`);
  if (toEmail) console.log(`To Email: ${toEmail}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`=======================================================\n`);
}

async function sendOtpViaTwilioVerify(toPhone) {
  const to = normalizePhoneToE164(toPhone);
  if (!to) {
    throw new Error('Invalid phone number format');
  }
  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();
  
  await client.verify.v2.services(serviceSid).verifications.create({
    to,
    channel: 'sms'
  });
  return { to };
}

async function verifyOtpViaTwilioVerify(toPhone, code) {
  const to = normalizePhoneToE164(toPhone);
  if (!to) {
    throw new Error('Invalid phone number');
  }

  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();

  const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
    to,
    code
  });

  return check.status === 'approved';
}

async function sendLoginOtpSms(toPhone, otp) {
  if (isConsoleOtpEnabled()) {
    logOtpToConsole({ kind: 'login', toPhone, otp });
    return { to: toPhone, useLocalVerify: true };
  }
  const result = await sendOtpViaTwilioVerify(toPhone);
  return { ...result, useLocalVerify: false };
}

async function sendResetPasswordOtpSms(toPhone, otp) {
  if (isConsoleOtpEnabled()) {
    logOtpToConsole({ kind: 'password reset', toPhone, otp });
    return { to: toPhone, useLocalVerify: true };
  }
  const result = await sendOtpViaTwilioVerify(toPhone);
  return { ...result, useLocalVerify: false };
}

async function sendChangePasswordOtpSms(toPhone, otp) {
  if (isConsoleOtpEnabled()) {
    logOtpToConsole({ kind: 'password change', toPhone, otp });
    return { to: toPhone, useLocalVerify: true };
  }
  const result = await sendOtpViaTwilioVerify(toPhone);
  return { ...result, useLocalVerify: false };
}

module.exports = {
  isTwilioOtpEnabled,
  isConsoleOtpEnabled,
  isOtpDeliveryEnabled,
  logOtpToConsole,
  sendLoginOtpSms,
  sendResetPasswordOtpSms,
  sendChangePasswordOtpSms,
  verifyOtpViaTwilioVerify
};
