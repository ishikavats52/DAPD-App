require('dotenv').config();
const { connectDB } = require('./src/config');
const User = require('./src/models/User');
const { getSeedConfig } = require('./src/services/seedSuperAdmin.service');

async function forceSeed() {
  await connectDB();
  const { email, password, name, phone } = getSeedConfig();
  
  if (!email || !password || !phone) {
    console.error("Missing credentials in .env");
    process.exit(1);
  }
  
  const existingEmail = await User.findByEmail(email);
  if (existingEmail) {
    console.log("Superadmin email already exists.");
  } else {
    await User.create({
      name,
      email,
      password,
      phone,
      role: 'superadmin'
    });
    console.log(`Forced seed of superadmin ${email} successful!`);
  }
  process.exit(0);
}

forceSeed().catch(console.error);
