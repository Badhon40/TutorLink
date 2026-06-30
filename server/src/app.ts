import express from "express";

const app = express()

app.get('/', (req, res)=>{
    res.send("TutorLink api is running")
})

export default app;