import { useContext, useState, useRef } from "react";
import axios from "axios";
export default function Experiment(){
    const fileInputRef=useRef(null);
   async function gettingFileValue(event) {
        event.preventDefault();
        const fileValue = fileInputRef.current.files[0];
        const formData = new FormData();
         formData.append("uploadFile", fileValue);
         const res=await axios.post("http://localhost:3000/getpdf", formData, {
           headers: {
             "Content-Type": "multipart/form-data", // Set the correct content type
           },
         })
         console.log(res);
    }

    return (
        <form className="upload">
   <input type="file" name="uploadFile" accept=".pdf" ref={fileInputRef} required />
   <button onClick={gettingFileValue}>click me</button>
</form>
    )

}