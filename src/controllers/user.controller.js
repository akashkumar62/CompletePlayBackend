import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateRefreshAndAccessTokens = async(userId) => 
{
   try {

     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken = user.generateRefreshToken()

     user.refreshToken = refreshToken
     await user.save({ validateBeforeSave: false })

     return {accessToken, refreshToken}
      
   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
   }
}
 
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

const loginUser = asyncHandler( async(req, res) => {

   //req body -> data
   //username or email
   //find the user
   //password check
   //access token or refresh token
   //send cookie

   const {email, username, password} = req.body;

   if(!(username || email)) {
      throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
      $or: [{username}, {email}]
   })

   if(!user) {
      throw new ApiError(404, "User does not exist")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid) {
      throw new ApiError(404, "Invalid user credentials")
   }

   const {accessToken, refreshToken} = await generateRefreshAndAccessTokens(user._id)

   const loggedInUser = await User.findById(user._id).
   select("-password -refreshToken")

   //cookie options

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse(
         200,
         {
            user: loggedInUser, accessToken, 
            refreshToken
         },
         "User logged In successfully"
      )
   )

})

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )

   const options = {
      httpOnly: true,
      secure: true
   }
   
   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged Out successfully "))

})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!refreshAccessToken){
      throw new ApiError(401, "unauthorized request")
    }

   try {
       const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
       )
   
      const user = User.findById(decodedToken?._id)
   
      if(!user){
         throw new ApiError(401, "invalid refresh token")
       }
   
      if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh token is expired or used")
      } 
      
      const options = {
         httpOnly : true,
         secure: true
      }
   
     const {accessToken, newRefreshToken} =  await generateRefreshAndAccessTokens(user._id)
   
      return res
      .status(200)
      .cookie("accessToken" , accessToken, options)
      .cookie("refreshToken" , newRefreshToken, options)
      .json(
         new ApiResponse(
            200,
            {
               accessToken, refreshToken : newRefreshToken
            },
            "Access token refreshed Successfully"
         )
      )
   
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid Refresh token")
   }

})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken

}