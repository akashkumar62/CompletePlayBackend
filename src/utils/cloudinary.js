import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: CLOUDINARY_API_KEY, 
  api_secret: CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        //upload file on cloudinary
       const response = await cloudinary.uploader.upload
        (localFilePath, {
            resource_type : "auto"
        })

        // file has been uploaded successfully
        console.log("File uploaded"  , response.url)

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove locally saved temp file as the upload operationg got failed

        return null;

    }
}

export {uploadOnCloudinary}