// install express with `npm install express` 
const express = require('express')
const app = express()
const cors = require('cors')
app.use(express.json());
app.use(express.urlencoded());
app.use(cors())
const { Deta } = require('deta');
const deta = Deta('c08piu78_wyraVGQooFYPtpARJhkqxykuz9nZSa2b'); 
const db = deta.Base('simple_db'); 
app.get('/all', async (req, res) => res.json((await db.fetch({},{limit:5}))))
app.post('/add',async (req, res) => {
    const {name,markdown,reply}=req.body
    console.log(req.body)
    const insertedUser = await db.put({
        name,
        markdown,
        reply
    })
    res.status(201).json(req.body.name);
})
app.post('/update', (req, res) => res.send('Hello World!'))
app.post('/delete', (req, res) => res.send('Hello World!'))

// export 'app'
module.exports = app