const db = require("../config/db");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");


exports.createUser = async(req,res)=>{

try{


const {

full_name,
phone,
country,
region,
email,
password,
confirmPassword

}=req.body;



if(!full_name || !phone || !country || !email || !password || !confirmPassword){

return res.status(400).json({

message:"Please fill all required fields."

});

}



if(password !== confirmPassword){

return res.status(400).json({

message:"Passwords do not match."

});

}



if(country==="Tanzania" && !region){

return res.status(400).json({

message:"Region is required."

});

}




const [exists]=await db.query(

"SELECT id FROM users WHERE email=?",

[email]

);



if(exists.length){

return res.status(400).json({

message:"Email already exists."

});

}



const hashedPassword=await bcrypt.hash(password,10);



let image=null;

let imagePublicId=null;



if(req.file){

image=req.file.path;

imagePublicId=req.file.filename;

}



await db.query(

`INSERT INTO users

(
full_name,
phone,
country,
region,
email,
password,
profile_image,
profile_public_id,
role
)

VALUES(?,?,?,?,?,?,?,?,?)`,

[

full_name,

phone,

country,

country==="Tanzania"?region:null,

email,

hashedPassword,

image,

imagePublicId,

"user"

]

);



res.status(201).json({

success:true,

message:"User registered successfully."

});


}


catch(err){

res.status(500).json({

message:err.message

});

}


};







exports.getUsers = async(req,res)=>{

try{


const [users]=await db.query(

`
SELECT

id,
full_name,
phone,
country,
region,
email,
role,
profile_image,
created_at

FROM users

WHERE role='user'

ORDER BY id DESC

`

);



res.json({

success:true,

total:users.length,

users

});


}


catch(err){

res.status(500).json({

success:false,

message:err.message

});

}


};









exports.updateUser = async(req,res)=>{


try{


const {id}=req.params;



const {

full_name,
phone,
country,
region,
email

}=req.body;




const [rows]=await db.query(

"SELECT * FROM users WHERE id=? AND role='user'",

[id]

);



if(!rows.length){

return res.status(404).json({

success:false,

message:"User not found."

});

}



const user=rows[0];




const [existingEmail]=await db.query(

"SELECT id FROM users WHERE email=? AND id<>?",

[email,id]

);



if(existingEmail.length){

return res.status(400).json({

success:false,

message:"Email already exists."

});

}




let image=user.profile_image;

let imagePublicId=user.profile_public_id;




if(req.file){



if(imagePublicId){


await cloudinary.uploader.destroy(

imagePublicId,

{

resource_type:"image"

}

);


}



image=req.file.path;

imagePublicId=req.file.filename;


}




await db.query(

`
UPDATE users SET

full_name=?,

phone=?,

country=?,

region=?,

email=?,

profile_image=?,

profile_public_id=?

WHERE id=?

`,

[


full_name,

phone,

country,

country==="Tanzania"?region:null,

email,

image,

imagePublicId,

id


]

);




res.json({

success:true,

message:"User updated successfully."

});


}


catch(err){


res.status(500).json({

success:false,

message:err.message

});


}


};









exports.deleteUser = async(req,res)=>{


try{


const {id}=req.params;



const [rows]=await db.query(

"SELECT * FROM users WHERE id=? AND role='user'",

[id]

);



if(!rows.length){

return res.status(404).json({

success:false,

message:"User not found."

});

}



const user=rows[0];




if(user.profile_public_id){


await cloudinary.uploader.destroy(

user.profile_public_id,

{

resource_type:"image"

}

);


}




await db.query(

"DELETE FROM users WHERE id=?",

[id]

);




res.json({

success:true,

message:"User deleted successfully."

});


}


catch(err){


res.status(500).json({

success:false,

message:err.message

});


}


};
