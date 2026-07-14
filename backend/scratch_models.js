
require('dotenv').config();

async function checkModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await res.json();
  if (data.models) {
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } else {
    console.log(data);
  }
}

checkModels();
