const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());
const { Deta } = require("deta");
const deta = Deta("c08piu78_wyraVGQooFYPtpARJhkqxykuz9nZSa2b");
const db = deta.Base("simple_db");
const {verifySignature,hashPersonalMessage}=require("./verify")
app.get("/all/:proposal_id", async (req, res) => {
  if (!req.params.proposal_id) return res.json({ status: false });
  const proposalData = await db.fetch(
    { proposal_id: req.params.proposal_id, main_thread: true },
    { limit: 5, last: req.query.last ? req.query.last : null }
  );
 
  return res.json({ status: true, data: proposalData });
});
app.get("/all_reply/:proposal_id/:main_thread_id", async (req, res) => {
  if (!req.params.proposal_id) return res.json({ status: false });
  const proposalData = await db.fetch(
    {
      proposal_id: req.params.proposal_id,
      main_thread: false,
      main_thread_id: req.params.main_thread_id,
    },
    { limit: 5, last: req.query.last ? req.query.last : null }
  );
  return res.json({ status: true, data: proposalData });
});
async function verifyUser(req){
  const { address,msg,sig } = req.body;
  if (!req.body || !address || !msg ) return false;
  let token;
  if(!req.headers.authorization) {
  
    if(!(await verifySignature(
      address,
      sig,
      hashPersonalMessage(msg)
    ))){
      
      return false
    } else {
    
      token = jwt.sign({
        address
      }, 'secret')
      return {token}
    }
  }else{
   
    try{
      const decoded = jwt.verify(req.headers.authorization, 'secret');
        if(decoded.address!==address) return false; else return {msg};
    }catch(e){
     
      return false;
    }
  }
}
app.post("/add", async (req, res) => {
  const checkUser=await verifyUser(req);
  if(!checkUser) return res.json({status:false})
  const {token,msg}=checkUser;
  try{
    const {author,
      markdown,
      proposal_id} = JSON.parse(msg)
     if(!author,!markdown,!proposal_id) return res.json({status:false})
      const insertedComment = await db.put(
        {
          author,
          markdown,
          proposal_id,
          timestamp: new Date().getTime(),
          main_thread: true,
        },
        new Date().getTime().toString()
      );
      if (insertedComment) return res.status(201).json({ status: true, data: insertedComment,token });
      else return res.json({ status: false, data: [] });
  }catch(e){
return res.json({status:false})
  }
 
});
app.post("/add_reply", async (req, res) => {
  const {
    author,
    markdown,
    proposal_id,
    main_thread_id,
    reply_to,
    reply,
    reply_thread_id,
  } = req.body;
  if (
    !author ||
    !markdown ||
    !proposal_id ||
    !main_thread_id ||
    !reply_to ||
    !reply ||
    !reply_thread_id
  )
    return res.json({ status: false, data: [] });
  const insertedComment = await db.put(
    {
      author,
      markdown,
      proposal_id,
      timestamp: new Date().getTime(),
      main_thread: false,
      main_thread_id,
      reply_to,
      reply,
      reply_thread_id,
    },
    new Date().getTime().toString()
  );
  if (insertedComment) return res.status(201).json({ status: true, data: insertedComment });
  else return res.json({ status: false, data: [] });
});
app.post("/update/:key", async (req, res) => {
  if (!req.params.key) return res.json({ status: false });
  try {
    const update = req.body;
    update.edit_timestamp = new Date().getTime();
    await db.update(update, req.params.key);
    const getItemFirst = await db.get(req.params.key);
    if (!getItemFirst.main_thread) {
      let res = await db.fetch({ reply_thread_id: getItemFirst.key });
      let allItems = res.items;
      while (res.last) {
        res = await db.fetch(
          { reply_thread_id: getItemFirst.key },
          { last: res.last }
        );
        allItems = allItems.concat(res.items);
      }
      for (let i = 0; i < allItems.length; i++) {
        await db.update({ deleted: false, edited: true }, allItems[i].key);
      }
    }
    
    return res.json({ status: true,data:getItemFirst });
  } catch (e) {
    return res.json({ status: false });
  }
});
app.delete("/delete/:key", async (req, res) => {
  if (!req.params.key) return res.json({ status: false });
  const getItemFirst = await db.get(req.params.key);
  if (getItemFirst.main_thread) {
    let res = await db.fetch({ main_thread_id: getItemFirst.key });
    let allItems = res.items;
    while (res.last) {
      res = await db.fetch(
        { main_thread_id: getItemFirst.key },
        { last: res.last }
      );
      allItems = allItems.concat(res.items);
    }
    for (let i = 0; i < allItems.length; i++) {
      await db.delete(allItems[i].key);
    }
  } else {
    let res = await db.fetch({ reply_thread_id: getItemFirst.key });
    let allItems = res.items;
    while (res.last) {
      res = await db.fetch(
        { reply_thread_id: getItemFirst.key },
        { last: res.last }
      );
      allItems = allItems.concat(res.items);
    }
    for (let i = 0; i < allItems.length; i++) {
      await db.update({ deleted: true, edited: false }, allItems[i].key);
    }
  }
  await db.delete(req.params.key);
  const getItem = await db.get(req.params.key);
  if (!getItem) {
    const update = await db.fetch();
    return res.status(201).json({ status: true, data: [] });
  } else return res.json({ status: false, data: [] });
});

// export 'app'
module.exports = app;
// app.listen(3001)