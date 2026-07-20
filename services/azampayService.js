const axios = require("axios");


// ============================
// AZAMPAY CONFIG
// ============================

const AUTH_URL = process.env.AZAMPAY_AUTH_URL;

const CHECKOUT_URL = process.env.AZAMPAY_CHECKOUT_URL;



// ============================
// CLEAN ENV VALUES
// ============================

const cleanEnv = (value) => {

    if (!value) return "";

    return value
        .replace(/"/g, "")
        .trim();

};




// ============================
// GENERATE TOKEN
// ============================

const getAccessToken = async () => {

    try {


        const appName =
        cleanEnv(process.env.AZAMPAY_APP_NAME);


        const clientId =
        cleanEnv(process.env.AZAMPAY_CLIENT_ID);


        const clientSecret =
        cleanEnv(process.env.AZAMPAY_CLIENT_SECRET);



        console.log(
            "========== AZAMPAY CONFIG CHECK =========="
        );


        console.log({

            authUrl: AUTH_URL,

            checkoutUrl: CHECKOUT_URL,


            appNameRaw:
            JSON.stringify(
                process.env.AZAMPAY_APP_NAME
            ),


            appNameClean:
            appName,


            clientId:
            clientId
            ? "Loaded"
            : "Missing",


            secretLength:
            clientSecret.length

        });


        console.log(
            "=========================================="
        );



        if(
            !appName ||
            !clientId ||
            !clientSecret
        ){

            throw new Error(
                "Missing AzamPay credentials"
            );

        }




        const response = await axios.post(

            AUTH_URL,

            {

                appName: appName,


                clientId: clientId,


                clientSecret: clientSecret

            },


            {

                headers:{

                    "Content-Type":
                    "application/json"

                }

            }

        );




        if(
            !response.data ||
            !response.data.accessToken
        ){

            console.log(
                "AzamPay Token Response:",
                response.data
            );


            throw new Error(
                "AzamPay token not returned"
            );

        }



        console.log(
            "AzamPay Token Generated Successfully"
        );


        return response.data.accessToken;



    }


    catch(error){


        console.log(
            "========== AZAMPAY AUTH ERROR =========="
        );


        console.log(

            error.response?.data ||
            error.message

        );


        console.log(
            "========================================="
        );


        throw error;


    }

};





// ============================
// CREATE CHECKOUT
// ============================

exports.createCheckout = async(payload)=>{


    try{


        const token =
        await getAccessToken();



        console.log(
            "Sending Checkout Request To AzamPay..."
        );


        console.log(
            "Checkout URL:",
            CHECKOUT_URL
        );



        const response = await axios.post(

            CHECKOUT_URL,

            payload,


            {

                headers:{

                    "Content-Type":
                    "application/json",


                    "Authorization":
                    `Bearer ${token}`

                }

            }

        );



        console.log(
            "AzamPay Checkout Success"
        );



        return response.data;



    }


    catch(error){


        console.log(
            "========== AZAMPAY CHECKOUT ERROR =========="
        );


        console.log(

            error.response?.data ||
            error.message

        );


        console.log(
            "============================================"
        );


        throw error;


    }


};
