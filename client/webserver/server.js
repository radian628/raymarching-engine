import express from "express";

const app = (express)();

app.use(express.static("../dist"));

app.listen(25564);