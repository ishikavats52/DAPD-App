const crypto = require('crypto');

function generateProvisionedPassword() {
  return crypto.randomBytes(4).toString('hex');
}

module.exports = { generateProvisionedPassword };
