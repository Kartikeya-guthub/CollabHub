const axios = require("axios");
const jwt = require("jsonwebtoken");

const token = jwt.sign({ userId: "test-user-id" }, process.env.JWT_SECRET || "default_jwt_secret");

async function test() {
  try {
    const res = await axios.post("http://localhost:4000/api/ai/diagram", 
      { description: "three boxes in a pipe", mode: "fast" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
