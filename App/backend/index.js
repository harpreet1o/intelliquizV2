import express from "express";
import cors from "cors";
import logger from "morgan";
import indexRouter from "./routes/gptapi.js"
import auth from "./routes/auth.js";
import pdf from "./routes/pdf.js";
import {connect,createTables} from "./databaseSetup/database.js";

const app=express();
app.use(cors());

 app.use(express.json());
 app.use(express.static('templates'));

app.use(logger("dev"));
const db=async ()=>{
  await connect();
  await createTables();
}
db();
  // Connect to the database
  // sql.connect(dbConfig).then(pool => {
  //   if (pool.connected) {
  //     console.log('Connected to Azure SQL Database');
  //   }
  // }).catch(err => {
  //   console.error('Database connection failed: ', err);
  // });
app.get("/",(req,res)=>{
res.json("hello from the server side");
})
app.use("/",indexRouter);
app.use("/",auth);
app.use("/",pdf);

app.listen(3000,()=>{
    console.log("server started");
})