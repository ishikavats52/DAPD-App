function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const exposeMessage = status < 500 || process.env.NODE_ENV === 'development' || err.isOperational;
  const message = exposeMessage ? err.message || 'Server error' : 'Server error';

  if (status >= 500) {
    console.error(err);
  }

  const body = { message };
  if (req.id) {
    body.requestId = req.id;
  }
  if (err.existingTag) {
    body.existingTag = err.existingTag;
  }
  res.status(status).json(body);
}

module.exports = errorHandler;
