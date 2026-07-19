const db=require("../config/db");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

const generateOTP=require("../utils/generateOTP");
const {sendOTP}=require("../services/emailService");

// ==================== LOGIN ====================

exports.login=async(req,res)=>{

try{

const {email,password}=req.body;

const [rows]=await db.query(

"SELECT * FROM users WHERE email=?",

[email]

);

if(rows.length===0){

return res.status(404).json({

message:"Invalid credentials"

});

}

const user=rows[0];

const match=await bcrypt.compare(password,user.password);

if(!match){

return res.status(401).json({

message:"Invalid credentials"

});

}

if(user.role==="user"){

const token=jwt.sign(

{

id:user.id,

role:user.role

},

process.env.JWT_SECRET,

{

expiresIn:"7d"

}

);

return res.json({

success:true,

role:"user",

token

});

}

const otp=generateOTP();

const expiry=new Date(Date.now()+5*60*1000);

await db.query(

"UPDATE users SET login_otp=?,login_otp_expiry=? WHERE id=?",

[otp,expiry,user.id]

);

await sendOTP(user.email,otp);

return res.json({

success:true,

role:"admin",

requiresOTP:true,

email:user.email

});

}

catch(err){

res.status(500).json({

message:err.message

});

}

};

// ==================== ADMIN OTP VERIFY ====================

exports.verifyOTP=async(req,res)=>{

try{

const {email,otp}=req.body;

const [rows]=await db.query(

"SELECT * FROM users WHERE email=?",

[email]

);

if(rows.length===0){

return res.status(404).json({

message:"Admin not found"

});

}

const admin=rows[0];

if(admin.login_otp!==otp){

return res.status(400).json({

message:"Invalid OTP"

});

}

if(new Date()>new Date(admin.login_otp_expiry)){

return res.status(400).json({

message:"OTP expired"

});

}

await db.query(

"UPDATE users SET login_otp=NULL,login_otp_expiry=NULL WHERE id=?",

[admin.id]

);

const token=jwt.sign(

{

id:admin.id,

role:"admin"

},

process.env.JWT_SECRET,

{

expiresIn:"7d"

}

);

res.json({

success:true,

token,

role:"admin"

});

}

catch(err){

res.status(500).json({

message:err.message

});

}

};

// ==================== FORGOT PASSWORD ====================

exports.forgotPassword=async(req,res)=>{

try{

const {email}=req.body;

const [rows]=await db.query(

"SELECT * FROM users WHERE email=?",

[email]

);

if(rows.length===0){

return res.status(404).json({

message:"Email not registered"

});

}

const user=rows[0];

const otp=generateOTP();

const expiry=new Date(Date.now()+5*60*1000);

await db.query(

"UPDATE users SET reset_otp=?,reset_otp_expiry=? WHERE id=?",

[otp,expiry,user.id]

);

await sendOTP(user.email,otp);

res.json({

success:true,

message:"OTP sent to your email"

});

}

catch(err){

res.status(500).json({

message:err.message

});

}

};

// ==================== VERIFY FORGOT PASSWORD OTP ====================

exports.verifyForgotPasswordOTP=async(req,res)=>{

try{

const {email,otp}=req.body;

const [rows]=await db.query(

"SELECT * FROM users WHERE email=?",

[email]

);

if(rows.length===0){

return res.status(404).json({

message:"User not found"

});

}

const user=rows[0];

if(user.reset_otp!==otp){

return res.status(400).json({

message:"Invalid OTP"

});

}

if(new Date()>new Date(user.reset_otp_expiry)){

return res.status(400).json({

message:"OTP expired"

});

}

await db.query(

"UPDATE users SET reset_otp=NULL,reset_otp_expiry=NULL WHERE id=?",

[user.id]

);

const resetToken=jwt.sign(

{

id:user.id,

purpose:"password-reset"

},

process.env.JWT_SECRET,

{

expiresIn:"10m"

}

);

res.json({

success:true,

message:"OTP verified",

resetToken

});

}

catch(err){

res.status(500).json({

message:err.message

});

}

};

// ==================== RESET PASSWORD ====================

exports.resetPassword=async(req,res)=>{

try{

const {

resetToken,

newPassword,

confirmPassword

}=req.body;

if(!resetToken){

return res.status(401).json({

message:"Reset token missing"

});

}

if(newPassword!==confirmPassword){

return res.status(400).json({

message:"Passwords do not match"

});

}

let decoded;

try{

decoded=jwt.verify(

resetToken,

process.env.JWT_SECRET

);

}

catch{

return res.status(401).json({

message:"Invalid or expired reset token"

});

}

if(decoded.purpose!=="password-reset"){

return res.status(401).json({

message:"Invalid reset token"

});

}

const hashedPassword=await bcrypt.hash(

newPassword,

10

);

await db.query(

"UPDATE users SET password=? WHERE id=?",

[hashedPassword,decoded.id]

);

res.json({

success:true,

message:"Password reset successfully"

});

}

catch(err){

res.status(500).json({

message:err.message

});

}

};
