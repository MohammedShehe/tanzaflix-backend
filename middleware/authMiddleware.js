const jwt=require("jsonwebtoken");

exports.authenticate=(req,res,next)=>{

    const auth=req.headers.authorization;

    if(!auth){

        return res.status(401).json({
            message:"Unauthorized"
        });

    }

    try{

        const token=auth.split(" ")[1];

        req.user=jwt.verify(token,process.env.JWT_SECRET);

        next();

    }

    catch{

        res.status(401).json({
            message:"Invalid token"
        });

    }

}

exports.isAdmin=(req,res,next)=>{

    if(req.user.role!=="admin"){

        return res.status(403).json({

            message:"Access denied"

        });

    }

    next();

}
