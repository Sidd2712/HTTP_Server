# Minimal HTTP Server in Node.js

This is a simple HTTP server implemented in Node.js using the native `net` module. It demonstrates how to handle raw TCP connections, parse HTTP/1.1 requests, support persistent connections, handle multiple concurrent clients, and serve basic routes including static files with gzip compression.

---

## Features

- Handles raw TCP connections and HTTP requests without using Express or other HTTP frameworks.
- Supports HTTP/1.1 persistent connections (`Connection: keep-alive`) and explicit connection closure (`Connection: close`).
- Handles multiple concurrent client connections.
- Supports GET and POST requests.
- Basic routing for:
  - `/` — Responds with a 200 OK with no body.
  - `/echo/:string` — Returns the string after `/echo/`, supports gzip compression if requested.
  - `/user-agent` — Returns the `User-Agent` header from the request.
  - `/files/:filename` — Serves files from a configurable base directory on GET, saves files on POST.
- Proper handling of request bodies and Content-Length.
- Responds with appropriate HTTP status codes.
- Gracefully handles socket errors and connection termination.

---

## Prerequisites

- Node.js installed (version 12+ recommended)
- Basic command line usage knowledge

---

## Installation

1. Clone the repository or copy the source code files.

2. Ensure you have Node.js installed by running:

   ```bash
   node -v

---

## Running the Server

   ```bash
   node server.js --directory <path-to-serve-files-from>

---

## Usage and Testing

1. Root path
 ```bash
 curl -v http://localhost:4221/
Returns:

Status: 200 OK

Empty body

2. Echo endpoint
Returns the string after /echo/:

bash
Copy
Edit
curl -v http://localhost:4221/echo/hello-world
Returns:

Status: 200 OK

Body: hello-world

Supports gzip compression if the client requests it:

bash
Copy
Edit
curl -v http://localhost:4221/echo/compressed -H "Accept-Encoding: gzip"
3. User-Agent endpoint
Returns the User-Agent header sent by the client:

bash
Copy
Edit
curl -v http://localhost:4221/user-agent -H "User-Agent: custom-agent/1.0"
Returns:

Status: 200 OK

Body: custom-agent/1.0

4. Files endpoint (GET)
Serves a file from the specified base directory:

bash
Copy
Edit
curl -v http://localhost:4221/files/filename.txt
If the file exists, returns 200 OK and the file content.

If not, returns 404 Not Found.

5. Files endpoint (POST)
Uploads (writes) a file to the base directory:

bash
Copy
Edit
curl -v -X POST http://localhost:4221/files/upload.txt --data-binary @localfile.txt
Saves localfile.txt content to <baseDir>/upload.txt.

Returns 201 Created on success.

6. Connection persistence
The server supports HTTP/1.1 persistent connections by default (Connection: keep-alive).

To explicitly close a connection, send the header:

bash
Copy
Edit
curl -v http://localhost:4221/echo/test -H "Connection: close"
The server response will include Connection: close and close the TCP connection.

Implementation Details
The server listens on port 4221 on localhost.

Uses the net module for TCP sockets.

Parses HTTP requests manually by detecting header/body boundaries.

Supports chunked requests (waiting for full body using Content-Length).

Handles multiple requests per connection.

Manages concurrent connections independently.

Compresses response bodies with gzip if requested.

Supports basic routing logic based on request method and URL.

Handles errors gracefully and closes sockets properly.

Limitations
Does not support HTTPS.

No advanced routing or middleware.

No authentication or security features.

No support for chunked transfer encoding.

Basic content type detection only (application/octet-stream for files).

Designed for learning and experimentation, not production use.

Next Steps / Enhancements (Optional)
Add support for HTTPS with TLS.

Add more MIME types for file serving.

Implement caching and ETag support.

Add chunked transfer encoding support.

Implement more advanced routing and middleware.

Add logging and metrics.

Improve error handling and validation.

License
This project is open for educational and personal use.

Feel free to open issues or ask questions if you want help extending or using this server!

yaml
Copy
Edit

---

If you want, I can help you create some example shell scripts or automated 