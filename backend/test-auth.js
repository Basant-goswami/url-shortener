// Save as test-auth.js in backend folder
const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/v1";

const testAuth = async () => {
  try {
    console.log("🧪 Testing Authentication Flow...\n");

    // 1. Register
    console.log("1️⃣ Registering user...");
    const registerResponse = await axios.post(`${BASE_URL}/users/register`, {
      name: "Test User",
      email: `test${Date.now()}@example.com`,
      password: "Test123456",
      confirmPassword: "Test123456",
    });
    console.log("✅ Registration successful!");
    console.log(`   User: ${registerResponse.data.data.user.name}`);
    console.log(
      `   Token: ${registerResponse.data.data.token.substring(0, 20)}...\n`,
    );

    // 2. Login
    console.log("2️⃣ Logging in...");
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: registerResponse.data.data.user.email,
      password: "Test123456",
    });
    console.log("✅ Login successful!");
    console.log(
      `   Token: ${loginResponse.data.data.token.substring(0, 20)}...\n`,
    );

    // 3. Get Profile
    console.log("3️⃣ Getting profile...");
    const profileResponse = await axios.get(`${BASE_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${loginResponse.data.data.token}`,
      },
    });
    console.log("✅ Profile retrieved!");
    console.log(`   Name: ${profileResponse.data.data.name}`);
    console.log(`   Email: ${profileResponse.data.data.email}\n`);

    console.log("✅ All authentication tests passed! 🎉");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
};

testAuth();
