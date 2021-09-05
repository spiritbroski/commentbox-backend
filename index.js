const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { request, gql } = require('graphql-request')
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
      return {token,msg}
    }
  }else{
    
    try{
      const decoded = jwt.verify(req.headers.authorization, 'secret');
      
        if(decoded.address!==address) return false; else return {msg};
    }catch(e){
      if((await verifySignature(
        address,
        sig,
        hashPersonalMessage(msg)
      ))){
        token = jwt.sign({
          address
        }, 'secret')
        return {token,msg}
        
      }else{
        return false;
      }
      
    }
  }
}
app.post("/add", async (req, res) => {

  try{
    const checkUser=await verifyUser(req);
    if(!checkUser) return res.json({status:false})
    const {token,msg}=checkUser;
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
return res.json({status:false,data:msg})
  }
 
});
app.post("/add_reply", async (req, res) => {
 
  try{
    const checkUser=await verifyUser(req);
    if(!checkUser) return res.json({status:false})
    const {token,msg}=checkUser;
    const {
      author,
      markdown,
      proposal_id,
      main_thread_id,
      reply_to,
      reply,
      reply_thread_id,
    } = JSON.parse(msg);
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
    if (insertedComment) return res.status(201).json({ status: true, data: insertedComment,token });
    else return res.json({ status: false, data: [] });
  }catch(e){
    return res.json({status:false})
  }
  
});
async function checkAuthorOrAdmin(address,author,spaceId){
  const query = gql`
  query {
    space(id: "${spaceId}") {
     admins
    }
  }
`;
try{
  const res=await request('https://hub.snapshot.org/graphql', query)
  return address===author||res.space.admins.length>0?res.space.admins.includes(address):false;
}catch(e){
  return false;
}

 
  
}
app.post("/update/:key", async (req, res) => {
  if (!req.params.key) return res.json({ status: false });

  try {
    const checkUser=await verifyUser(req);
    if(!checkUser) return res.json({status:false})
    const {token,msg}=checkUser;
    const update = JSON.parse(msg);
    update.edit_timestamp = new Date().getTime();
    const getItem = await db.get(req.params.key);
    if(!(await checkAuthorOrAdmin(req.body.address,getItem.author,req.body.space_id))) return res.json({ status: false });
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
    
    return res.json({ status: true,data:getItemFirst,token });
  } catch (e) {
    return res.json({ status: false });
  }
});
app.post("/delete", async (req, res) => {
  try{
    const checkUser=await verifyUser(req);
    if(!checkUser) return res.json({status:false})
    const {token,msg}=checkUser;
    const {key}=JSON.parse(msg)
    if(!key) return res.json({status:false})
    const getItemFirst = await db.get(key);
    if(!(await checkAuthorOrAdmin(req.body.address,getItemFirst.author,req.body.space_id))) return res.json({ status: false });
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
    await db.delete(key);
    const getItem = await db.get(key);
    if (!getItem) {
      // const update = await db.fetch();
      return res.status(201).json({ status: true, data: [],token });
    } else return res.json({ status: false, data: [] });
  }catch(e){
    return res.json({status:false})
  }
  
});

// export 'app'
module.exports = app;
// app.listen(3001)