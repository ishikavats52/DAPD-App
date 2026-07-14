function normalizePhoneToE164(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) return cleaned.length >= 10 ? cleaned : null;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  return null; // Invalid
}

function maskPhone(phone) {
  if (!phone) return '';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

function formatPhoneForDisplay(phone) {
  if (!phone) return '';
  return phone; // could be formatted better
}

module.exports = { normalizePhoneToE164, maskPhone, formatPhoneForDisplay };
