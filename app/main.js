const net = require("net");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const dirFlagIndex = process.argv.indexOf("--directory");
const baseDir = dirFlagIndex !== -1 ? process.argv[dirFlagIndex + 1] : ".";
console.log("Server files from:", baseDir);

const server = net.createServer((socket) => {
  let requestData = "";

  socket.on("data", (chunk) => {
    requestData += chunk.toString();

    while (true) {
      const headerEndIndex = requestData.indexOf("\r\n\r\n");
      if (headerEndIndex === -1) return; // wait for full headers

      const headersPart = requestData.slice(0, headerEndIndex);
      const reqLine = headersPart.split("\r\n")[0];
      const [method, reqPath] = reqLine.split(" ");

      const headers = {};
      const headerLines = headersPart.split("\r\n").slice(1);
      for (const line of headerLines) {
        const [key, value] = line.split(": ");
        if (key && value) headers[key.toLowerCase()] = value;
      }

      const contentLength = parseInt(headers["content-length"] || "0");
      const totalLength = headerEndIndex + 4 + contentLength;

      if (requestData.length < totalLength) return; // wait for full body

      const body = requestData.slice(headerEndIndex + 4, totalLength);
      requestData = requestData.slice(totalLength); // Remove this request from buffer

      if (method === "GET") {
        if (reqPath === "/") {
          socket.write("HTTP/1.1 200 OK\r\n\r\n");
          continue;
        } else if (reqPath.startsWith("/echo/")) {
          const echoStr = reqPath.slice(6);
          let acceptsGzip = false;

          if (headers["accept-encoding"]) {
            const encodings = headers["accept-encoding"].split(",").map(e => e.trim().toLowerCase());
            if (encodings.includes("gzip")) {
              acceptsGzip = true;
            }
          }

          if (acceptsGzip) {
            zlib.gzip(echoStr, (err, compressedBody) => {
              if (err) {
                socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
              } else {
                const response =
                  `HTTP/1.1 200 OK\r\n` +
                  `Content-Type: text/plain\r\n` +
                  `Content-Encoding: gzip\r\n` +
                  `Content-Length: ${compressedBody.length}\r\n\r\n`;
                socket.write(response);
                socket.write(compressedBody);
              }
            });
          } else {
            const contentLen = Buffer.byteLength(echoStr);
            const response =
              `HTTP/1.1 200 OK\r\n` +
              `Content-Type: text/plain\r\n` +
              `Content-Length: ${contentLen}\r\n\r\n` +
              `${echoStr}`;
            socket.write(response);
          }
          continue;
        } else if (reqPath === "/user-agent") {
          let userAgent = headers["user-agent"] || "";
          const contentLen = Buffer.byteLength(userAgent);
          const response =
            `HTTP/1.1 200 OK\r\n` +
            `Content-Type: text/plain\r\n` +
            `Content-Length: ${contentLen}\r\n\r\n` +
            `${userAgent}`;
          socket.write(response);
          continue;
        } else if (reqPath.startsWith("/files/")) {
          const filename = reqPath.slice("/files/".length);
          const filePath = path.join(baseDir, filename);
          fs.readFile(filePath, (err, fileData) => {
            if (err) {
              socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
            } else {
              socket.write(
                `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileData.length}\r\n\r\n`
              );
              socket.write(fileData);
            }
          });
          continue;
        } else {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          continue;
        }
      } else if (method === "POST") {
        if (reqPath.startsWith("/files/")) {
          const filename = reqPath.slice("/files/".length);
          const filePath = path.join(baseDir, filename);
          fs.writeFile(filePath, body, (err) => {
            if (err) {
              socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
            } else {
              socket.write("HTTP/1.1 201 Created\r\n\r\n");
            }
          });
          continue;
        }
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        continue;
      } else {
        socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
        continue;
      }

      // Optional: close if client requested
      if ((headers["connection"] || "").toLowerCase() === "close") {
        socket.end();
        break;
      }
    }
  });

  socket.on("error", () => {
    socket.destroy();
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server listening");
});
