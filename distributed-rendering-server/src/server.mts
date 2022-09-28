import express, { NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";

const app = express();

type FrameInfo = {
    frameid: string,
    data: Buffer
}

type RenderGroupState = {
    secret: string,
    joincode: string,
    outputQueue: FrameInfo[],
    inputQueue: string[]
};

app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Security-Policy" content="default-src *">
    </head>
    <body>
    </body>
</html>
    `)
})

function getRenderGroup(req: express.Request, res: express.Response, next: NextFunction)
    : req is express.Request & { renderGroup: RenderGroupState } {
    if (!renderGroups.has(req.params.joincode)) {
        res.status(400).send("Failed to find render group.");
        return;
    }
    req["renderGroup"] = renderGroups.get(req.params.joincode) as RenderGroupState;
    next();
}

function rgs(req: express.Request) {
    return req["renderGroup"] as RenderGroupState;
}

const renderGroups = new Map<string, RenderGroupState>();
app.post("/create-render-group/:joincode", (req, res) => {
    if (renderGroups.has(req.params.joincode)) {
        res.status(400).send("Failed to create render group.");
        return;
    }
    const secret = uuidv4();
    renderGroups.set(req.params.joincode, {
        secret, joincode: req.params.joincode, 
        outputQueue: [],
        inputQueue: []
    });
    res.send(secret);
});

app.post("/enqueue-output/:joincode/:frameid", getRenderGroup, bodyParser.raw(), (req, res) => {

    rgs(req).outputQueue.push({
        frameid: req.params.frameid,
        data: req.body
    });
});

app.post("/dequeue-output/:joincode", getRenderGroup, (req, res) => {
    const s: RenderGroupState = rgs(req);
    if (s.outputQueue.length == 0) {
        res.status(404).send("outputQueue is empty.");
        return;
    }
    const data = s.outputQueue.splice(0, 1);
    res.send(data[0].data);
});


app.post("/enqueue-input/:joincode/:frameid", getRenderGroup, bodyParser.text(), (req, res) => {
    const s: RenderGroupState = rgs(req);
    s.inputQueue.push(req.body);
});

app.post("/dequeue-input/:joincode", getRenderGroup, (req, res) => {
    const s: RenderGroupState = rgs(req);
    if (s.outputQueue.length == 0) {
        res.status(404).send("inputQueue is empty.");
        return;
    }
    const data = s.inputQueue.splice(0, 1);
    res.send(data);
});

app.listen("25563");