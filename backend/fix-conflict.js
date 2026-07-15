require('dotenv').config();
const { connectDB } = require('./src/config');
const User = require('./src/models/User');

async function fixConflict() {
  await connectDB();
  const phoneUser = await User.findByEmail('ishivats251@gmail.com');
  if (phoneUser) {
    await User.deleteById(phoneUser._id);
    console.log('Deleted conflicting Admin account (ishivats251@gmail.com) sharing the same phone number.');
  } else {
    console.log('Conflicting account not found.');
  }
  process.exit(0);
}

fixConflict().catch(console.error);
