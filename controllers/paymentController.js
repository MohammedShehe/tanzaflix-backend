const db = require("../config/db");

const crypto = require("crypto");

const azampay = require("../services/azampayService");


// ==================== CREATE PAYMENT ====================

exports.createPayment = async (req, res) => {

    try {

        const userId = req.user.id;


        const {
            planId,
            paymentMethod,
            phoneNumber
        } = req.body;



        // Validate input

        if (!planId || !paymentMethod || !phoneNumber) {

            return res.status(400).json({

                success: false,

                message: "All fields are required."

            });

        }



        // Get plan from database

        const [plans] = await db.query(

            `
            SELECT *
            FROM plans
            WHERE id=? 
            AND status='active'
            `,

            [planId]

        );



        if (plans.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Plan not found."

            });

        }



        const plan = plans[0];



        // Generate unique reference

        const paymentReference =
            "TFX-" +
            Date.now() +
            "-" +
            crypto
            .randomBytes(3)
            .toString("hex")
            .toUpperCase();



        // Save pending payment

        const [payment] = await db.query(

            `
            INSERT INTO payments
            (
                user_id,
                plan_id,
                payment_reference,
                payment_method,
                phone_number,
                amount,
                status
            )

            VALUES (?,?,?,?,?,?,?)
            `,

            [

                userId,

                plan.id,

                paymentReference,

                paymentMethod,

                phoneNumber,

                plan.price,

                "pending"

            ]

        );



        // ============================
        // SEND PAYMENT TO AZAMPAY
        // ============================


        const checkoutPayload = {

            provider: paymentMethod,


            merchantAccountNumber:
            process.env.AZAMPAY_ACCOUNT_NUMBER,


            merchantName:
            "TanzaFlix",


            merchantMobileNumber:
            phoneNumber,


            currencyCode:
            "TZS",


            amount:
            plan.price.toString(),


            referenceId:
            paymentReference,


            merchantReferenceId:
            paymentReference,


            additionalProperties: {

                provider:
                paymentMethod

            },


            source:
            "TanzaFlix"

        };



        const checkoutResponse =
        await azampay.createCheckout(checkoutPayload);



        // Save AzamPay response

        await db.query(

            `
            UPDATE payments
            SET
            status=?,
            gateway_response=?
            WHERE id=?
            `,

            [

                "processing",

                JSON.stringify(checkoutResponse),

                payment.insertId

            ]

        );




        // Return response

        res.json({

            success:true,


            paymentId:
            payment.insertId,


            reference:
            paymentReference,


            amount:
            plan.price,


            currency:
            plan.currency,


            plan:
            plan.name,


            azampay:
            checkoutResponse,


            message:
            "Payment initiated successfully."

        });



    }


    catch(err){


        console.log(
            "Payment Error:",
            err.response?.data || err.message
        );



        res.status(500).json({

            success:false,

            message:
            err.response?.data || err.message

        });


    }

};



// ============================
// AZAMPAY CALLBACK / WEBHOOK
// ============================


exports.azamPayCallback = async(req,res)=>{


    try{


        console.log(
            "AzamPay Callback:",
            req.body
        );



        const {

            initiatorReferenceId,

            fspReferenceId,

            pgReferenceId,

            amount,

            status,

            message,

            operator


        } = req.body;




        const [payments] = await db.query(

            `
            SELECT *
            FROM payments
            WHERE payment_reference=?
            `,

            [
                initiatorReferenceId
            ]

        );



        if(payments.length===0){


            return res.status(404).json({

                message:
                "Payment not found"

            });


        }



        const payment = payments[0];



        let paymentStatus =
        status.toLowerCase();



        if(paymentStatus==="success"){

            paymentStatus="paid";

        }

        else if(paymentStatus==="failed"){

            paymentStatus="failed";

        }



        await db.query(

            `
            UPDATE payments

            SET

            gateway_transaction_id=?,

            status=?,

            gateway_response=?,

            paid_at=NOW()

            WHERE id=?

            `,


            [

                pgReferenceId,

                paymentStatus,

                JSON.stringify(req.body),

                payment.id

            ]

        );



        res.json({

            success:true

        });



    }


    catch(err){


        console.log(err);


        res.status(500).json({

            success:false,

            message:err.message

        });


    }


};
