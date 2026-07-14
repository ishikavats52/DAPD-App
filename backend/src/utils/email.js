const DUPLICATE_EMAIL_MESSAGE = 'Email is already registered';

function maskEmail(email) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name[0]}***@${domain}`;
}

module.exports = { DUPLICATE_EMAIL_MESSAGE, maskEmail };
