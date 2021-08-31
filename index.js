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
  const { author, markdown, reply, proposal_id, timestamp } = req.body;
  if (!author || !markdown || !reply || !proposal_id || !timestamp)
    return res.json({ status: false, data: [] });
  const insertedComment = await db.put({
    author,
    markdown,
    reply,
    proposal_id,
    timestamp,
  });
  if (insertedComment) return res.status(201).json({ status: true, data: [] });
  else return res.json({ status: false, data: [] });
});
app.post("/update/:keys", async (req, res) => {
  if(!req.params.key) return res.json({status:false});
  try{
    const update=req.body;
    await db.update(update,req.params.key)
    return res.json({status:true})
  }catch(e){
    return res.json({status:false})
  }
});
app.delete("/delete/:key", async (req, res) => {
  if (!req.params.key) return res.json({ status: false });
  await db.delete(req.params.key);
  const getItem = await db.get(req.params.key);
  if (!getItem) return res.status(201).json({ status: true, data: [] });
  else return res.json({ status: false, data: [] });
});

// export 'app'
module.exports = app;
