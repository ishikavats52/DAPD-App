const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5050/api/auth/admin-signup', {
      name: "Test Office",
      officeName: "Test Office",
      address: "123 Main St",
      location: "City",
      state: "State",
      pincode: "123456",
      phone: "9876543210",
      email: "test@test.com",
      password: "Password@123"
    });
    console.log(res.status, res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
