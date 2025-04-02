import express from 'express';

const PORT = process.env.PORT || 5423;
const app = express();
app.use(express.json());

app.get("/",function(req,res){
    const basicInfo = req.body;
    res.send('hello');
    console.log(basicInfo.name+ ' said hello');
    console.log("ahoj");

});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
