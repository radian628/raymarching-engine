// content of index.js
const http = require('http');
const fs = require('fs').promises;
const path = require("path");

const port = 42064;


async function getBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += chunk.toString();
        });
        req.on("end", () => {
            resolve(body);
        });
    });
}

const requestHandler = async (request, response) => {
    if (request.method.toUpperCase() == "POST") {
        let body = await getBody(request);
        body = Buffer.from(body.split(",")[1], 'base64');
        await fs.writeFile(path.join("output", request.url), body);
        response.end("Received");
    }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
    if (err) {
        return console.log("Error:", err);
    }

    console.log(`server is listening on ${port}`)
})