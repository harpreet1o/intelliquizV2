import express from "express";
import 'dotenv/config';
import admin from "../firebase/firebase-config.js";
import { checkUserByGoogleId,insertUser } from "../databaseSetup/database.js";
const router=express.Router();

router.post("/auth",async (req,res)=>{
    if(req.body.token){
    const decodeValue = await admin.auth().verifyIdToken(req.body.token);
 const check =await checkUserByGoogleId(decodeValue.user_id);
 console.log(check);
      if(!check){
        insertUser(decodeValue.name,decodeValue.email,decodeValue.user_id);
     }
    }
})
export default router;