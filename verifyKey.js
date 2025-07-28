require('dotenv').config();
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set in your .env file.");
  process.exit(1);
}

axios.get("https://api.openai.com/v1/models", {
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`
  }
})
.then(response => {
  console.log("✅ API key is valid. Available models:");
  response.data.data.forEach(model => {
    console.log("•", model.id);
  });
})
.catch(error => {
  if (error.response && error.response.status === 401) {
    console.error("❌ Invalid API key (401 Unauthorized).");
  } else {
    console.error("❌ Error verifying API key:", error.message);
  }
});
