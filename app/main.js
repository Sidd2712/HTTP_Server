const net = require("net");
const fs=require("fs");
const path=require("path");
  // directory via directory flag
const dirFlagIndex=process.argv.indexOf("--directory");
const baseDir=dirFlagIndex!==-1?process.argv[dirFlagIndex+1]:".";
console.log("Server files from:", baseDir);

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();
    console.log("Request recieved:\n", request);
    const reqLine = request.split("\r\n")[0];

    const [method,reqPath] =reqLine.split(" ");
    if (method === "GET") {
      
      // root directory
      if(reqPath==="/"){
        socket.write("HTTP/1.1 200 OK\r\n\r\n");
        socket.end();
        return;
      }      
      else if (reqPath.startsWith("/echo/")) {
        const echoStr = reqPath.slice(6);  // /echo/ length is 6
        const body = echoStr;
        const contentLen = Buffer.byteLength(body);
        let contentEncodingHeader="";
        const headers=request.split("\r\n");
        for(const line of headers){
          if(line.toLowerCase().startsWith("accept-encoding:")){
            const encodings=line.split(":")[1].trim().toLowerCase().split(",");
            if(encodings.includes("gzip")){
              contentEncodingHeader="Content-Encoding: gzip\r\n";
            }
            break;
          }
        }
        const response =
          `HTTP/1.1 200 OK\r\n` +
          `Content-Type: text/plain\r\n` +
          contentEncodingHeader +
          `Content-Length: ${contentLen}\r\n` +
          `\r\n` +
          `${body}`;
        socket.write(response);
        socket.end();
        return;

      } else if (reqPath === "/user-agent") {
        const lines = request.split("\r\n");
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
          `Content-Length: ${contentLen}\r\n` +
          `\r\n` +
          `${userAgent}`;
        socket.write(response);
        socket.end();
        return;

      }else if(reqPath.startsWith("/files/")){
        const filename=reqPath.slice("/files/".length);
        const filePath=path.join(baseDir,filename);
        fs.readFile(filePath,(err,fileData)=>{
          if(err){
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          }else{
            socket.write(
              `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileData.length}\r\n\r\n`
            );
            socket.write(fileData);
          }
          socket.end();
        })
        return;
      }
       else {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      }

    } else if(method==="POST"){
      if(reqPath.startsWith("/files/")){
        const filename=reqPath.slice("/files/".length);
        const [rawHeaders,body=""]=request.split("\r\n\r\n");  // header and body
        const filePath=path.join(baseDir,filename); // body to file
        fs.writeFile(filePath,body,(err)=>{
          if(err){
            socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
          } else{
            socket.write("HTTP/1.1 201 Created\r\n\r\n");
          }
          socket.end();
        });
        return;
      }
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n"); // unknown path
      socket.end();
    }  else {
      socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
    }

    socket.end();
  });
});
//
server.listen(4221, "localhost",()=>{
  console.log("Server listening");
});
