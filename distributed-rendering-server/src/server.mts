import express, { NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import cors from "cors";

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
    </head>
    <body>
        <p>You've reached the renderfarm!</p>
    </body>
</html>
    `)
});

app.use(cors());

function getRenderGroup(req: express.Request, res: express.Response, next: NextFunction)
    : req is express.Request & { renderGroup: RenderGroupState } {
    if (!renderGroups.has(req.params.joincode)) {
        res.status(400).end("Failed to find render group.");
        return false;
    }
    //@ts-ignore
    req["renderGroup"] = renderGroups.get(req.params.joincode) as RenderGroupState;
    next();
    return true;
}

function rgs(req: express.Request) {
    //@ts-ignore
    return req["renderGroup"] as RenderGroupState;
}

const renderGroups = new Map<string, RenderGroupState>();
app.post("/create-render-group/:joincode", (req, res) => {
    console.log("Create render group attempt.");
    if (renderGroups.has(req.params.joincode)) {
        res.status(400).end("Failed to create render group.");
        return;
    }
    const secret = uuidv4();
    renderGroups.set(req.params.joincode, {
        secret, joincode: req.params.joincode, 
        outputQueue: [],
        inputQueue: []
    });
    res.end(secret);
});

app.post("/enqueue-output/:joincode/:frameid", getRenderGroup, bodyParser.raw({ type: "image/png", limit: "50mb" }), (req, res) => {
    rgs(req).outputQueue.push({
        frameid: req.params.frameid,
        data: req.body
    });
    res.end();
});

app.post("/dequeue-output/:joincode", getRenderGroup, bodyParser.text({ type: "text/plain" }), (req, res) => {
    const s: RenderGroupState = rgs(req);
    if (s.outputQueue.length == 0) {
        res.status(404).end("outputQueue is empty.");
        return;
    }
    if (s.secret != req.body.toString()) {
        res.status(401).end("Cannot dequeue output: Unauthorized.");
        return;
    }
    const data = s.outputQueue.splice(0, 1);
    res.contentType("image/png").end(data[0].data);
});


app.post("/enqueue-input/:joincode/:frameid", getRenderGroup, bodyParser.json(), (req, res) => {
    const s: RenderGroupState = rgs(req);
    // if (s.secret != req.body) {
    //     res.status(401).end("Cannot dequeue output: Unauthorized.");
    //     return;
    // }
    console.log("\n\nEnqueueing input...");
    s.inputQueue.push(JSON.stringify(req.body));
    res.end();
    console.log("Done enqueueing input!");
});

app.post("/dequeue-input/:joincode", getRenderGroup, (req, res) => {
    const s: RenderGroupState = rgs(req);
    if (s.inputQueue.length == 0) {
        res.status(404).end("inputQueue is empty.");
        return;
    }
    const data = s.inputQueue.splice(0, 1);
    console.log("Dequeued input.");
    res.end(data[0]);
});

app.post("/input-queue-length/:joincode", getRenderGroup, (req, res) => {
    const s = rgs(req);
    res.end(s.inputQueue.length.toString());
})

app.listen("25563");