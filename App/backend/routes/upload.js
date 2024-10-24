import {bucket} from "./firebase/firebase-config.js";
import busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';
import path from "path";


app.post('/save', (req, res) => {
    const bb = busboy({ headers: req.headers });
    console.log("hello");
    let fileData = null;
  
    bb.on('file', (name, file, info) => {
        const { filename, mimeType } = info;
        console.log(`Receiving file: ${filename}, Type: ${mimeType}`);
  
        const uniqueFileName = `${uuidv4()}-${filename}`;
        const fileUpload = bucket.file(uniqueFileName);  
  
        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: mimeType,
            }
        });
  
        // Pipe the file stream into Firebase Storage
        file.pipe(stream);
  
        stream.on('error', (err) => {
            console.error('Error uploading file to Firebase:', err);
            res.status(500).send('Failed to upload file.');
        });
  
        stream.on('finish', async () => {
            // File successfully uploaded to Firebase
            const downloadURL = await fileUpload.getSignedUrl({
                action: 'read',
                expires: '03-09-2491'  // Generate a long-lasting download URL
            });
  
            console.log('File uploaded successfully:', downloadURL);
            res.status(200).json({ message: 'File uploaded', downloadURL });
        });
    });
  
    req.pipe(bb);  // Pipe the incoming request to busboy
  });