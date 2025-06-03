const http = require("http");

// Customize the path here to test different endpoints
const options = {
  hostname: "localhost",
  port: 4221,
  path: "/echo/Codecrafters", // Change this to test other routes
  method: "GET",
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log("Headers:", res.headers);

  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    console.log("Body:", chunk);
  });
});

req.on("error", (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();
