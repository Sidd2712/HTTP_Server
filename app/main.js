const net = require("net");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const dirFlagIndex = process.argv.indexOf("--directory");
const baseDir = dirFlagIndex !== -1 ? process.argv[dirFlagIndex + 1] : ".";
console.log("Server files from:", baseDir);

function writeResponse(socket, statusLine, headersObj, body, shouldClose) {
  let headersStr = "";
  for (const key in headersObj) {
    headersStr += `${key}: ${headersObj[key]}\r\n`;
  }
  if (shouldClose) {
    headersStr += `Connection: close\r\n`;
  } else {
    headersStr += `Connection: keep-alive\r\n`;
  }
  const response = `${statusLine}\r\n${headersStr}\r\n`;
  socket.write(response);
  if (body) socket.write(body);
  if (shouldClose) {
    socket.end();
    return;
  }
}

const server = net.createServer((socket) => {
  let requestData = "";

  socket.on("data", (chunk) => {
    requestData += chunk.toString();

    while (true) {
      const headerEndIndex = requestData.indexOf("\r\n\r\n");
      if (headerEndIndex === -1) break;

      const headersPart = requestData.slice(0, headerEndIndex);
      const reqLine = headersPart.split("\r\n")[0];
      const [method, reqPath] = reqLine.split(" ");

      const headers = headersPart.split("\r\n").slice(1);
      const headersMap = {};
      for (const line of headers) {
        const [key, ...rest] = line.split(":");
        if (key && rest.length > 0) {
          headersMap[key.trim().toLowerCase()] = rest.join(":").trim();
        }
      }

      // if we want to close or not
      const connectionHeader = headersMap["connection"] || "";
      const shouldClose = connectionHeader.toLowerCase() === "close";

      let contentLength = 0;
      if (headersMap["content-length"]) {
        contentLength = parseInt(headersMap["content-length"]);
        if (isNaN(contentLength)) contentLength = 0;
      }

      const totalRequestLength = headerEndIndex + 4 + contentLength;
      if (requestData.length < totalRequestLength) break;

      const body = requestData.slice(headerEndIndex + 4, totalRequestLength);

      // Trim request
      requestData = requestData.slice(totalRequestLength);

      if (method === "GET") {
        if (reqPath === "/") {
          writeResponse(socket, "HTTP/1.1 200 OK", {}, null, shouldClose);
          continue;
        } else if (reqPath.startsWith("/echo/")) {
          const echoStr = reqPath.slice(6);
          let acceptsGzip = false;

          if (headersMap["accept-encoding"]) {
            const encodings = headersMap["accept-encoding"]
              .split(",")
              .map((e) => e.trim().toLowerCase());
            if (encodings.includes("gzip")) {
              acceptsGzip = true;
            }
          }

          if (acceptsGzip) {
            zlib.gzip(echoStr, (err, compressedBody) => {
              if (err) {
                writeResponse(socket, "HTTP/1.1 500 Internal Server Error", {}, null, shouldClose);
                return;
              }
              writeResponse(
                socket,
                "HTTP/1.1 200 OK",
                {
                  "Content-Type": "text/plain",
                  "Content-Encoding": "gzip",
                  "Content-Length": compressedBody.length,
                },
                compressedBody,
                shouldClose
              );
            });
          } else {
            writeResponse(
              socket,
              "HTTP/1.1 200 OK",
              {
                "Content-Type": "text/plain",
                "Content-Length": Buffer.byteLength(echoStr),
              },
              echoStr,
              shouldClose
            );
          }
          continue;
        } else if (reqPath === "/user-agent") {
          const userAgent = headersMap["user-agent"] || "";
          writeResponse(
            socket,
            "HTTP/1.1 200 OK",
            {
              "Content-Type": "text/plain",
              "Content-Length": Buffer.byteLength(userAgent),
            },
            userAgent,
            shouldClose
          );
          continue;
        } else if (reqPath.startsWith("/files/")) {
          const filename = reqPath.slice("/files/".length);
          const filePath = path.join(baseDir, filename);
          fs.readFile(filePath, (err, fileData) => {
            if (err) {
              writeResponse(socket, "HTTP/1.1 404 Not Found", {}, null, shouldClose);
            } else {
              writeResponse(
                socket,
                "HTTP/1.1 200 OK",
                {
                  "Content-Type": "application/octet-stream",
                  "Content-Length": fileData.length,
                },
                fileData,
                shouldClose
              );
            }
          });
          continue;
        } else {
          writeResponse(socket, "HTTP/1.1 404 Not Found", {}, null, shouldClose);
          continue;
        }
      } else if (method === "POST") {
        if (reqPath.startsWith("/files/")) {
          const filename = reqPath.slice("/files/".length);
          const filePath = path.join(baseDir, filename);
          fs.writeFile(filePath, body, (err) => {
            if (err) {
              writeResponse(socket, "HTTP/1.1 500 Internal Server Error", {}, null, shouldClose);
            } else {
              writeResponse(socket, "HTTP/1.1 201 Created", {}, null, shouldClose);
            }
          });
          continue;
        }
        writeResponse(socket, "HTTP/1.1 404 Not Found", {}, null, shouldClose);
        continue;
      } else {
        writeResponse(socket, "HTTP/1.1 405 Method Not Allowed", {}, null, shouldClose);
        continue;
      }
    }
  });

  socket.on("error", () => {
    socket.destroy();
  });

  socket.on("end", () => {
    socket.end();
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server listening");
});
