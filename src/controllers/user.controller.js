import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

 
const registerUser = asyncHandler( async(req, res) => {
    
    //get users details from frontend
    //validation 
    //check if user already exists
    //check for images or avatar 
    //upload images to cloudinary
    //create user object - create entry in db
    //remove password and refresh token fields
    //check for user creation
    //return res

const {fullname , email, username, password} = req.body


      if([fullname , email , username, password].some((field) => field?.trim() === ""))
          {
             throw new ApiError(400, "All fields are necessary")
          }

      const existedUser = await User.findOne({
        $or: [{username} , {email}]
       })  
       
     if(existedUser) {
        throw new ApiError(409, "User already exists")
     }  

     const avatarLocalPath =  req.files?.avatar[0]?.path
     //const coverLocalPath =  req.files?.coverImage[0]?.path
     
     let coverLocalPath;
     if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
     {
        coverLocalPath = req.files.coverImage[0].path
     }
     
     //console.log(req.files)

     if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
     }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverLocalPath)

    

    if(!avatar) {
        throw new ApiError(400 , "Avatar file is required")
    }

   const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

   const createdsUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   
   if(!createdsUser) {
    throw new ApiError(500, "Something went wrong while user creation")
   }

   return res.status(201).json(
    new ApiResponse(200, createdsUser, "User registered successfully")
   )
      
})

export {registerUser}