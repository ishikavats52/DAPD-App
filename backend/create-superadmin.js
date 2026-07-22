require('dotenv').config();
const { createClients } = require('./src/db/client');
const User = require('./src/models/User');
const { ROLES } = require('./src/constants/roles');

async function run() {
  createClients();
  try {
    const existing = await User.findByEmail('neeraj.modf@gmail.com');
    if (existing) {
      console.log('User already exists, updating role to SUPERADMIN...');
      await User.update(existing._id, { role: ROLES.SUPERADMIN, isApproved: true, phone: '9312354769' });
      console.log('User updated successfully.');
      process.exit(0);
    }
    
    const user = await User.create({
      name: 'Neeraj',
      email: 'neeraj.modf@gmail.com',
      phone: '9312354769',
      password: 'Password123!', // Standard initial password
      role: ROLES.SUPERADMIN,
      isApproved: true,
      mustChangePassword: false
    });
    console.log('Created superadmin:', user.email);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
