require('dotenv').config();
const { connectDB } = require('./src/config');
const User = require('./src/models/User');

async function fixPassword() {
  await connectDB();
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PASSWORD?.trim();
  
  if (!email || !password) {
    console.error("Missing credentials in .env");
    process.exit(1);
  }
  
  const user = await User.findByEmail(email);
  if (!user) {
    console.log("Superadmin not found in DB!");
  } else {
    await User.updatePasswordPlain(user._id, password);
    console.log(`Successfully updated password for ${email} to match .env`);
  }
  process.exit(0);
}

fixPassword().catch(console.error);
