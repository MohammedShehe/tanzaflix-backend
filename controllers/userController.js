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



if(

!full_name ||
!phone ||
!country ||
!email ||
!password ||
!confirmPassword

){

return res.status(400).json({

success:false,

message:"Please fill all required fields."

});

}



if(password !== confirmPassword){

return res.status(400).json({

success:false,

message:"Passwords do not match."

});

}




if(country==="Tanzania" && !region){

return res.status(400).json({

success:false,

message:"Region is required for Tanzania."

});

}




const [exists]=await db.query(

"SELECT id FROM users WHERE email=?",

[email]

);



if(exists.length){

return res.status(400).json({

success:false,

message:"Email already exists."

});

}



const hashedPassword = await bcrypt.hash(

password,

10

);



let profile_image=null;

let profile_public_id=null;



if(req.file){

profile_image=req.file.path;

profile_public_id=req.file.filename;

}




await db.query(

`

INSERT INTO users

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

VALUES(?,?,?,?,?,?,?,?,?)

`

,

[

full_name,

phone,

country,

country==="Tanzania"?region:null,

email,

hashedPassword,

profile_image,

profile_public_id,

"user"

]

);



res.status(201).json({

success:true,

message:"Registration successful."

});


}


catch(err){

res.status(500).json({

success:false,

message:err.message

});

}


};







exports.getProfile = async(req,res)=>{


try{


const [rows]=await db.query(

`

SELECT

id,

full_name,

phone,

country,

region,

email,

profile_image,

role,

created_at

FROM users

WHERE id=?

`

,

[req.user.id]

);



if(!rows.length){

return res.status(404).json({

message:"User not found."

});

}



res.json({

success:true,

user:rows[0]

});


}


catch(err){

res.status(500).json({

message:err.message

});

}


};







exports.updateProfile = async(req,res)=>{


try{


const {

full_name,

phone,

country,

region

}=req.body;



const [rows]=await db.query(

"SELECT * FROM users WHERE id=?",

[req.user.id]

);



if(!rows.length){

return res.status(404).json({

message:"User not found."

});

}



const user=rows[0];



let image=user.profile_image;

let publicId=user.profile_public_id;



if(req.file){



if(publicId){

await cloudinary.uploader.destroy(

publicId,

{

resource_type:"image"

}

);

}



image=req.file.path;

publicId=req.file.filename;


}




await db.query(

`

UPDATE users SET

full_name=?,

phone=?,

country=?,

region=?,

profile_image=?,

profile_public_id=?

WHERE id=?

`

,

[

full_name,

phone,

country,

country==="Tanzania"?region:null,

image,

publicId,

req.user.id

]

);



res.json({

success:true,

message:"Profile updated."

});


}


catch(err){

res.status(500).json({

message:err.message

});

}


};

