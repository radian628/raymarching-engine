import express from "express";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import cors from "cors";
var app = express();
app.get("/", function (req, res) {
    res.send("<!DOCTYPE html>\n<html>\n    <head>\n        <meta http-equiv=\"Content-Security-Policy\" content=\"default-src *\">\n    </head>\n    <body>\n    </body>\n</html>\n    ");
});
app.use(cors());
function getRenderGroup(req, res, next) {
    if (!renderGroups.has(req.params.joincode)) {
        res.status(400).end("Failed to find render group.");
        return false;
    }
    //@ts-ignore
    req["renderGroup"] = renderGroups.get(req.params.joincode);
    next();
    return true;
}
function rgs(req) {
    //@ts-ignore
    return req["renderGroup"];
}
var renderGroups = new Map();
app.post("/create-render-group/:joincode", function (req, res) {
    console.log("Create render group attempt.");
    if (renderGroups.has(req.params.joincode)) {
        res.status(400).end("Failed to create render group.");
        return;
    }
    var secret = uuidv4();
    renderGroups.set(req.params.joincode, {
        secret: secret,
        joincode: req.params.joincode,
        outputQueue: [],
        inputQueue: []
    });
    res.end(secret);
});
app.post("/enqueue-output/:joincode/:frameid", getRenderGroup, bodyParser.raw(), function (req, res) {
    rgs(req).outputQueue.push({
        frameid: req.params.frameid,
        data: req.body
    });
});
app.post("/dequeue-output/:joincode", getRenderGroup, function (req, res) {
    var s = rgs(req);
    if (s.outputQueue.length == 0) {
        res.status(404).end("outputQueue is empty.");
        return;
    }
    var data = s.outputQueue.splice(0, 1);
    res.end(data[0].data);
});
app.post("/enqueue-input/:joincode/:frameid", getRenderGroup, bodyParser.text(), function (req, res) {
    var s = rgs(req);
    s.inputQueue.push(req.body);
});
app.post("/dequeue-input/:joincode", getRenderGroup, function (req, res) {
    var s = rgs(req);
    if (s.outputQueue.length == 0) {
        res.status(404).end("inputQueue is empty.");
        return;
    }
    var data = s.inputQueue.splice(0, 1);
    res.end(data);
});
app.listen("25563");
