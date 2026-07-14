function resolveCorsOrigins() {
  if (process.env.NODE_ENV === 'development') {
    return '*';
  }
  const origins = process.env.CORS_ORIGIN || process.env.WEB_APP_URL || '*';
  if (origins === '*') return origins;
  return origins.split(',').map((o) => o.trim()).filter(Boolean);
}

function resolveProductionApiUrl() {
  return process.env.API_URL || '';
}

function resolveProductionWebUrl() {
  return process.env.WEB_APP_URL || '';
}

module.exports = {
  resolveCorsOrigins,
  resolveProductionApiUrl,
  resolveProductionWebUrl
};
