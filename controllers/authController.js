const db=require("../config/db");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

const generateOTP=require("../utils/generateOTP");
const {sendOTP}=require("../services/emailService");

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

const token=jwt.sign({

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

"UPDATE users SET otp=?,otp_expiry=? WHERE id=?",

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

if(admin.otp!==otp){

return res.status(400).json({

message:"Invalid OTP"

});

}

if(new Date()>new Date(admin.otp_expiry)){

return res.status(400).json({

message:"OTP expired"

});

}

await db.query(

"UPDATE users SET otp=NULL,otp_expiry=NULL WHERE id=?",

[admin.id]

);

const token=jwt.sign({

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
