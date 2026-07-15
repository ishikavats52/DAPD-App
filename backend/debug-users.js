require('dotenv').config();
const { connectDB } = require('./src/config');
const User = require('./src/models/User');

async function debugUsers() {
  await connectDB();
  const phoneUser = await User.findByPhone('7078813158');
  console.log('findByPhone returned:', phoneUser ? { email: phoneUser.email, role: phoneUser.role } : null);
  
  const superadmin = await User.findByEmail('sishika077@gmail.com');
  console.log('Superadmin record:', superadmin ? { email: superadmin.email, phone: superadmin.phone, role: superadmin.role } : null);
  
  process.exit(0);
}

debugUsers().catch(console.error);
