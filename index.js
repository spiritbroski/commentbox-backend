// install express with `npm install express`
const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());
const { Deta } = require("deta");
const deta = Deta("c08piu78_wyraVGQooFYPtpARJhkqxykuz9nZSa2b");
const db = deta.Base("simple_db");
app.get("/all/:proposal_id", async (req, res) => {
  if (!req.params.proposal_id) return res.json({ status: false, data: [] });
  const proposalData = await db.fetch(
    { proposal_id: req.params.proposal_id },
    { limit: 5, last: req.query.last ? req.query.last : null }
  );
  return res.json({ status: true, data: proposalData });
});
app.post("/add", async (req, res) => {
  const { author, markdown, reply,proposal_id,timestamp } = req.body;
  if (!author || !markdown || !reply|| !proposal_id|| !timestamp)
    return res.json({ status: false, data: [] });
  const insertedComment = await db.put({
    author,
    markdown,
    reply,
    proposal_id,
    timestamp
  });
  return res.status(201).json({status:true,data:insertedComment});
});
app.post("/update", (req, res) => res.send("Hello World!"));
app.post("/delete", (req, res) => res.send("Hello World!"));

// export 'app'
module.exports = app;
