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

    const headerEndIndex = requestData.indexOf("\r\n\r\n");
    if (headerEndIndex === -1) return; // wait for full headers

    const headersPart = requestData.slice(0, headerEndIndex);
    const body = requestData.slice(headerEndIndex + 4);
    const reqLine = headersPart.split("\r\n")[0];
    const [method, reqPath] = reqLine.split(" ");

    if (method === "GET") {
      if (reqPath === "/") {
        socket.write("HTTP/1.1 200 OK\r\n\r\n");
        socket.end();
        return;
      } else if (reqPath.startsWith("/echo/")) {
        const echoStr = reqPath.slice(6);
        let acceptsGzip = false;

        const headers = headersPart.split("\r\n");
        for (const line of headers) {
          if (line.toLowerCase().startsWith("accept-encoding:")) {
            const encodings = line.split(":")[1].split(",").map(e => e.trim().toLowerCase());
            if (encodings.includes("gzip")) {
              acceptsGzip = true;
            }
            break;
          }
        }

        if (acceptsGzip) {
          zlib.gzip(echoStr, (err, compressedBody) => {
            if (err) {
              socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
              socket.end();
              return;
            }
            const response =
              `HTTP/1.1 200 OK\r\n` +
              `Content-Type: text/plain\r\n` +
              `Content-Encoding: gzip\r\n` +
              `Content-Length: ${compressedBody.length}\r\n\r\n`;
            socket.write(response);
            socket.write(compressedBody);
            socket.end();
          });
        } else {
          const contentLen = Buffer.byteLength(echoStr);
          const response =
            `HTTP/1.1 200 OK\r\n` +
            `Content-Type: text/plain\r\n` +
            `Content-Length: ${contentLen}\r\n\r\n` +
            `${echoStr}`;
          socket.write(response);
          socket.end();
        }
        return;
      } else if (reqPath === "/user-agent") {
        const lines = headersPart.split("\r\n");
        let userAgent = "";
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].toLowerCase().startsWith("user-agent:")) {
            userAgent = lines[i].split(": ")[1];
            break;
          }
        }
        const contentLen = Buffer.byteLength(userAgent);
        const response =
          `HTTP/1.1 200 OK\r\n` +
          `Content-Type: text/plain\r\n` +
          `Content-Length: ${contentLen}\r\n\r\n` +
          `${userAgent}`;
        socket.write(response);
        socket.end();
        return;
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
          socket.end();
        });
        return;
      } else {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.end();
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
          socket.end();
        });
        return;
      }
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.end();
    } else {
      socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
      socket.end();
    }
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server listening");
});
