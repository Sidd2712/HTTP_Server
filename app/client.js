const http = require("http");


const options = {
  hostname: "localhost",
  port: 4221,
  path: "/echo/", 
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
