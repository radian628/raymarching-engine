import express from "express";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
var app = express();
app.get("/", function (req, res) {
    res.send("<!DOCTYPE html>\n<html>\n    <head>\n        <meta http-equiv=\"Content-Security-Policy\" content=\"default-src *\">\n    </head>\n    <body>\n    </body>\n</html>\n    ");
});
var renderGroups = new Map();
app.post("/create-render-group/:joincode", function (req, res) {
    if (renderGroups.has(req.params.joincode)) {
        res.status(400).send("Failed to create render group.");
        return;
    }
    var secret = uuidv4();
    renderGroups.set(req.params.joincode, {
        secret: secret,
        joincode: req.params.joincode, queue: []
    });
    res.send(secret);
});
app.post("/enqueue/:joincode/:frameid", bodyParser.raw(), function (req, res) {
    if (!renderGroups.has(req.params.joincode)) {
        res.status(400).send("Failed to find render group.");
        return;
    }
    var rgs = renderGroups.get(req.params.joincode);
    rgs.queue.push({
        frameid: req.params.frameid,
        data: req.body
    });
});
app.post("/dequeue/:joincode", function (req, res) {
    if (!renderGroups.has(req.params.joincode)) {
        res.status(400).send("Failed to find render group.");
        return;
    }
    var rgs = renderGroups.get(req.params.joincode);
    if (rgs.queue.length == 0) {
        res.status(404).send("Queue is empty.");
        return;
    }
    var data = rgs.queue.splice(0, 1);
    res.send(data[0].data);
});
app.post("/get-queue-length/:joincode", function (req, res) {
    if (!renderGroups.has(req.params.joincode)) {
        res.status(400).send("Failed to find render group.");
        return;
    }
    var rgs = renderGroups.get(req.params.joincode);
    if (rgs.queue.length == 0) {
        res.status(404).send("Queue is empty.");
        return;
    }
    return rgs.queue[0].frameid;
});
app.listen("25563");
