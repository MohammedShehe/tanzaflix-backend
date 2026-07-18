const nodemailer=require("nodemailer");

const transporter=nodemailer.createTransport({

service:"gmail",

auth:{

user:process.env.EMAIL_USER,

pass:process.env.EMAIL_PASS

}

});

const sendOTP=async(email,otp)=>{

await transporter.sendMail({

from:process.env.EMAIL_USER,

to:email,

subject:"Admin Login OTP",

html:`
<h2>Tanzaflix Admin Login</h2>

<p>Your OTP is</p>

<h1>${otp}</h1>

<p>Expires in 5 minutes.</p>
`

});

}

module.exports={sendOTP};
