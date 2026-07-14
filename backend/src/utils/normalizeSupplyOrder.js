function normalizeSupplyOrderKey(so) {
  if (!so) return null;
  const s = String(so).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return s.length > 0 ? s : null;
}

module.exports = { normalizeSupplyOrderKey };
