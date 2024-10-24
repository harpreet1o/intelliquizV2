import axios from "axios";
import qs from "qs";
import jsZip from "jszip";
import busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';
import express from "express";

const router=express.Router();

const clientID = process.env.VITE_PDF_CLIENT_ID;
const clientSecret = process.env.VITE_PDF_CLIENT_SECRET;



router.post('/upload', async (req, res) => {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let mimeType = "";
  
    bb.on('file', async (name, file, info) => {
      const { filename, mimeType: fileMimeType } = info;
      console.log(`Received file: ${filename}, Type: ${fileMimeType}`);
  
      mimeType = fileMimeType;
      const fileChunks = [];
  
      file.on('data', (chunk) => {
        fileChunks.push(chunk);
      });
  
      file.on('end', async () => {
        fileBuffer = Buffer.concat(fileChunks);
  
        try {
          // Call extractText to process the file and extract text
          const extractedText = await extractText(fileBuffer);
          res.status(200).json({ message: 'File uploaded and processed successfully', text: extractedText });
        } catch (error) {
          console.error("Error processing file:", error);
          res.status(500).send('Error processing the file.');
        }
      });
    });
  
    req.pipe(bb);
  });
  router.post("/download",async(req,res)=>
{
    try{
        const uri=await downloadQuiz(req.body.quiz,req.body.questionType,req.body.pwd,req.body.ansCheckbox);
        console.log(uri+"sending uri");
        res.send(uri).status(200);
    }
    catch(error){
    console.error("Error processing file:", error);
    res.status(500).send('Error processing the file.');
    }
    
})

// Adobe PDF Services API access token generation
const generateAccessToken = async () => {
    console.log("generating access token...");

    const apiURL = "https://pdf-services-ue1.adobe.io/token";
    console.log(clientID);
    console.log(clientSecret)

    const data = {
        "client_id": clientID,
        "client_secret": clientSecret
    }

    try{
        const response = await axios.post(apiURL, qs.stringify(data), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
             
        return response.data.access_token;
    }catch(error){
        console.error("Error: ", error);
    }
};

// generate presignedURI to upload files and assetID to locate files 
const generatePresignedURI = async (token, type) => {
    console.log("generating presigned URI...");

    const mediaType = type === "pdf" ? "application/pdf" : 
"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    const apiURL = "https://pdf-services-ue1.adobe.io/assets";

    const data = {
        "mediaType": mediaType
    }

    try{
        const response = await axios.post(apiURL, data, {
            headers: {
                "Authorization": token,
                "x-api-key": clientID,
                "Content-Type": "application/json"
            }
        });

        return response.data;
    } catch(error){
        console.log("Error: ", error);
    }
}

// upload file to presignedURI
const uploadFile = async (file, uploadURI, type) => {
    console.log("uploading to presigned URI...");

    const contentType = type === "pdf" ? "application/pdf" : 
"application/vnd.openxmlformats-officedocument.wordprocessingml.document"    
    try{
        const response = await axios.put(uploadURI, file, {
            headers: {
                "Content-Type": contentType
            }
        });

        return response.status;
    } catch(error){
        console.log("Error: ", error);
    }
}

// extracts text and generates compressed JSON file 
const startExtractJob = async(token, assetID) => {
    console.log("Attempting text extraction...");

    const apiURL = "https://pdf-services-ue1.adobe.io/operation/extractpdf";

    const data = {
        assetID: assetID,
        elementsToExtract: ["text"],
    };

    try {
        // starts the extraction job on Adobe's servers
        const response = await axios.post(apiURL, data, {
            headers: {
                Authorization: token,
                "x-api-key": clientID,
                "Content-Type": "application/json",
            },
        });

        console.log("polling for job completion...");
        let jobStatus;
        let result;
        do {
            // checks for poll completion status
            result = await axios.get(response.headers.location, {
                headers: {
                    Authorization: token,
                    "x-api-key": clientID,
                },
            });

            jobStatus = result.data.status;
            console.log("Current job status: ", jobStatus);

            await new Promise((resolve) => setTimeout(resolve, 1000));
        } while (jobStatus !== "done" && jobStatus !== "failed");

        if (jobStatus === "done") {
            return result.data.resource.downloadUri;
        } else if (jobStatus === "failed") {
            console.log("Text extraction failed :(");
            console.log("Code: ", result.data.error.code);
            console.log("Message: ", result.data.error.message);
            return 500;
        }
    } catch (error) {
        console.log("Error: ", error);
    }
}

// decompress and return data
const downloadData = async(downloadURI) => {
    console.log("downloading...")

    try{
        const response = await axios.get(downloadURI, {
            responseType: "arraybuffer"
        });

        const zip = await jsZip.loadAsync(response.data);

        const fileName = Object.keys(zip.files)[0];
        const file = zip.files[fileName];

        const fileContent = await file.async("text");

        const jsonData = JSON.parse(fileContent);

        const elements = jsonData.elements;

        let extractedText = "";

        elements.forEach(element => {
            extractedText += element.Text;
        })

        return extractedText;

    }catch(error){
        console.log("Error: ", error);
    }
}

// text extraction function
export const extractText = async (file) => {
    const token = await generateAccessToken();

    const {uploadUri, assetID} = await generatePresignedURI(token, "pdf");

    const uploadSuccessful = await uploadFile(file, uploadUri, "pdf");

    if(uploadSuccessful === 200){
        const downloadUri = await startExtractJob(token, assetID);

        const text = await downloadData(downloadUri);
        return text;
        
    } else {
        console.log("Something went wrong uploading the file.");
    }
};

const quizDataBuilder = (quiz) => {
    
    const convertOptionsToObject = (options) =>{
        const optionsObject = {}

        options.forEach((option, index) => {
            optionsObject[String.fromCharCode(97 + index)] = option;
        });

        return optionsObject;
    }
    
    const quizData = {
        "questions": quiz.map(question => ({
            ...question,
            "options": convertOptionsToObject(question.options)
        }))
    }

    return quizData; 
}

// retrieve docx template from public folder
const retrieveDocxTemplate = async (template) => {
    console.log("Retrieving doc template...")
    try {
        const file = await fetch(`http://localhost:3000/${template}`);

        const arrayBuffer = await file.arrayBuffer();
        
        const docxTemplate = new Blob([new Uint8Array(arrayBuffer)], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
                
        return docxTemplate;
    } catch(error){
        console.log("Error: ", error);
    }
}

// extracts text and generates compressed JSON file 
const startDocGeneration = async(token, assetID, jsonData) => {
    console.log("Merging data with quiz template...");

    const apiURL = "https://pdf-services-ue1.adobe.io/operation/documentgeneration";

    const data = {
        assetID: assetID,
        outputFormat: "pdf",
        jsonDataForMerge: jsonData
    };

    try {
        // starts the extraction job on Adobe's servers
        const response = await axios.post(apiURL, data, {
            headers: {
                Authorization: token,
                "x-api-key": clientID,
                "Content-Type": "application/json",
            },
        });

        console.log("polling for job completion...");
        let jobStatus;
        let result;
        do {
            // checks for poll completion status
            result = await axios.get(response.headers.location, {
                headers: {
                    Authorization: token,
                    "x-api-key": clientID,
                },
            });

            jobStatus = result.data.status;
            console.log("Current job status: ", jobStatus);

            await new Promise((resolve) => setTimeout(resolve, 1000));
        } while (jobStatus !== "done" && jobStatus !== "failed");

        if (jobStatus === "done") {
            console.log(result.data.asset.downloadUri)
            return result.data.asset.downloadUri;
        } else if (jobStatus === "failed") {
            console.log("Document generation failed :(");
            console.log("Code: ", result.data.error.code);
            console.log("Message: ", result.data.error.message);
        }
    } catch (error) {
        console.log("Error: ", error);
    }
}


const encryptPDF = async (token, downloadURI, pwd) => {

    const apiURL = "https://pdf-services-ue1.adobe.io/operation/protectpdf"
    
    try{
        const response = await axios.get(downloadURI, {
            responseType: "blob"
        });

        const pdfFile = new Blob([response.data]);

        const {uploadUri, assetID} = await generatePresignedURI(token, "pdf");

        const uploadSuccessful = await uploadFile(pdfFile, uploadUri, "pdf");

        if(uploadSuccessful === 200){
            const data = {
                assetID: assetID,
                passwordProtection: {
                    userPassword: pwd
                },
                encryptionAlgorithm: "AES_256"
            }

            const response = await axios.post(apiURL, data, {
                headers: {
                    Authorization: token,
                    "x-api-key": clientID,
                    "Content-Type": "application/json"
                }
            });

            console.log("polling for job completion...");
            let jobStatus;
            let result;
            do {
                result = await axios.get(response.headers.location, {
                    headers: {
                        Authorization: token,
                        "x-api-key": clientID
                    }
                });

                jobStatus = result.data.status;
                console.log("Current job status: ", jobStatus);

                await new Promise((resolve) => setTimeout(resolve, 1000));
            } while (jobStatus != "done" && jobStatus !== "failed");

            if(jobStatus === "done") {
                return result.data.asset.downloadUri;
            } else if(jobStatus === "failed") {
                console.log("Document encryption failed :(");
                console.log("Code: ", result.data.error.code);
                console.log("Message: ", result.data.error.message);
            }
        }
        
    } catch(error){
        console.log("Error: ", error);
    }
}

// quiz download function
export const downloadQuiz = async (quiz, template, pwd = null, ansCheckbox,report = false) => {
    let templatePath="";
    if(tempate=="report")
        templatePath="report-template.docx";
      if(template === "multiple choice"){
        templatePath = ansCheckbox ? "quiz-mcq-wa-template.docx" : "quiz-mcq-na-template.docx"
      } else if(questionType === "true/false") {
        templatePath = ansCheckbox ? "quiz-tf-wa-template.docx" : "backendquiz-tf-na-template.docx"
      }
      
    let data;
    if(!report){
        data = quizDataBuilder(quiz); 
    } else {
        data = quiz; 
    }
    
    const templateDoc = await retrieveDocxTemplate(templatePath);
    
    const token = await generateAccessToken();

    const {uploadUri, assetID} = await generatePresignedURI(token, "docx");

    const uploadSuccessful = await uploadFile(templateDoc, uploadUri, "docx")
    try{

    if(uploadSuccessful === 200){
        const downloadUri = await startDocGeneration(token, assetID, data);
        console.log(downloadUri)

        if(pwd){
            console.log("Encrypting file...");
            const encryptedPDFUri = await encryptPDF(token, downloadUri, pwd);
            return encryptedPDFUri;
            // await downloadPDF(encryptedPDFUri);            
        } else {
            return downloadUri;
            // await downloadPDF(downloadUri);
        }
    }
}catch (error) {
    console.error("Error during file generation:", error);
    throw new Error("Error during file generation.");
}
}
export default router;