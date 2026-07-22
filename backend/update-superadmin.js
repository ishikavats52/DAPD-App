require('dotenv').config();
const { createClients } = require('./src/db/client');
const User = require('./src/models/User');

async function run() {
  createClients();
  try {
    const existing = await User.findByEmail('neeraj.modf@gmail.com');
    if (existing) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('DAPD@1234', salt);
      existing.password = hashedPassword;
      await User.putItem(existing);
      console.log('Password updated to DAPD@1234');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
