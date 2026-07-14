require('dotenv').config();
const { createClients } = require('./src/db/client');
const User = require('./src/models/User');

(async () => {
  try {
    createClients();
    const { rows } = await User.listUsersFiltered({ skip: 0, limit: 100 });
    for (const u of rows) {
      if (u.role === 'employee') {
        console.log(`User: ${u.email}, Phone: ${u.phone}, mustChangePassword: ${u.mustChangePassword}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
})();
