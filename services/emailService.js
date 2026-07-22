const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTP = async (email, otp, type = 'login') => {
    // Determine email content based on type
    let subject, title, message, buttonText;
    
    if (type === 'login') {
        subject = "🔐 TanzaFlix - Admin Login Verification";
        title = "Admin Login Verification";
        message = "Please use the verification code below to complete your admin login.";
        buttonText = "Verify Login";
    } else if (type === 'reset') {
        subject = "🔑 TanzaFlix - Password Reset";
        title = "Password Reset Request";
        message = "You requested to reset your password. Use the verification code below to proceed.";
        buttonText = "Reset Password";
    } else {
        subject = "🔐 TanzaFlix - Verification Code";
        title = "Verification Code";
        message = "Please use the verification code below to complete your action.";
        buttonText = "Verify";
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            /* Reset styles */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f4f6f8;
                line-height: 1.6;
                padding: 20px;
            }
            
            .container {
                max-width: 560px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
            }
            
            /* Header */
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px 30px;
                text-align: center;
            }
            
            .logo {
                display: inline-block;
                background: rgba(255, 255, 255, 0.15);
                padding: 10px 24px;
                border-radius: 12px;
                margin-bottom: 12px;
            }
            
            .logo-text {
                color: #ffffff;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            
            .logo-text span {
                color: #ffd700;
            }
            
            .header-title {
                color: #ffffff;
                font-size: 22px;
                font-weight: 600;
                margin-top: 8px;
                opacity: 0.95;
            }
            
            /* Body */
            .body {
                padding: 40px 35px 35px;
            }
            
            .greeting {
                font-size: 18px;
                color: #1a1a2e;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .message {
                color: #4a4a6a;
                font-size: 16px;
                margin-bottom: 28px;
            }
            
            /* OTP Box */
            .otp-container {
                background: linear-gradient(135deg, #f8f9ff 0%, #eef1ff 100%);
                border: 2px dashed #667eea;
                border-radius: 12px;
                padding: 28px 20px;
                text-align: center;
                margin-bottom: 28px;
                position: relative;
            }
            
            .otp-label {
                color: #667eea;
                font-size: 13px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 8px;
            }
            
            .otp-code {
                font-size: 52px;
                font-weight: 700;
                color: #1a1a2e;
                letter-spacing: 12px;
                font-family: 'Courier New', monospace;
                background: white;
                padding: 8px 20px;
                border-radius: 8px;
                display: inline-block;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
            }
            
            .otp-expiry {
                margin-top: 12px;
                color: #8888aa;
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .otp-expiry span {
                font-weight: 600;
                color: #e74c3c;
            }
            
            /* Info Box */
            .info-box {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 16px 20px;
                border-radius: 8px;
                margin-bottom: 28px;
            }
            
            .info-box p {
                color: #4a4a6a;
                font-size: 14px;
                margin: 0;
            }
            
            .info-box strong {
                color: #1a1a2e;
            }
            
            /* Button */
            .btn-container {
                text-align: center;
                margin-bottom: 28px;
            }
            
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                padding: 14px 42px;
                border-radius: 30px;
                font-weight: 600;
                font-size: 16px;
                text-decoration: none;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.35);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
            }
            
            /* Footer */
            .footer {
                background: #f8f9fa;
                padding: 25px 35px;
                border-top: 1px solid #e9ecef;
                text-align: center;
            }
            
            .footer-text {
                color: #8888aa;
                font-size: 13px;
                margin-bottom: 4px;
            }
            
            .footer-text strong {
                color: #4a4a6a;
            }
            
            .footer-links {
                margin-top: 10px;
                font-size: 12px;
                color: #8888aa;
            }
            
            .footer-links a {
                color: #667eea;
                text-decoration: none;
                margin: 0 8px;
            }
            
            .footer-links a:hover {
                text-decoration: underline;
            }
            
            .divider {
                color: #ddd;
                margin: 0 4px;
            }
            
            /* Security Notice */
            .security-notice {
                background: #fff8e1;
                border: 1px solid #ffd54f;
                border-radius: 8px;
                padding: 12px 16px;
                margin-top: 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .security-notice .icon {
                font-size: 20px;
            }
            
            .security-notice p {
                color: #5d4037;
                font-size: 13px;
                margin: 0;
            }
            
            /* Responsive */
            @media (max-width: 480px) {
                .body {
                    padding: 25px 20px 25px;
                }
                
                .header {
                    padding: 30px 20px 25px;
                }
                
                .logo-text {
                    font-size: 22px;
                }
                
                .header-title {
                    font-size: 18px;
                }
                
                .otp-code {
                    font-size: 36px;
                    letter-spacing: 8px;
                    padding: 6px 14px;
                }
                
                .btn {
                    padding: 12px 28px;
                    font-size: 14px;
                }
                
                .footer {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    <span class="logo-text">Tanza<span>Flix</span></span>
                </div>
                <div class="header-title">${title}</div>
            </div>
            
            <!-- Body -->
            <div class="body">
                <div class="greeting">Hello there, 👋</div>
                <p class="message">${message}</p>
                
                <!-- OTP Code -->
                <div class="otp-container">
                    <div class="otp-label">Verification Code</div>
                    <div class="otp-code">${otp}</div>
                    <div class="otp-expiry">
                        ⏱️ This code will expire in <span>5 minutes</span>
                    </div>
                </div>
                
                <!-- Info Box -->
                <div class="info-box">
                    <p>💡 <strong>Tip:</strong> If you didn't request this code, please ignore this email. Your account is secure.</p>
                </div>
                
                <!-- Action Button -->
                <div class="btn-container">
                    <a href="#" class="btn">${buttonText}</a>
                </div>
                
                <!-- Security Notice -->
                <div class="security-notice">
                    <span class="icon">🔒</span>
                    <p>This is an automated security notification from TanzaFlix. Do not share this code with anyone.</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p class="footer-text">
                    Need help? Contact us at <strong>support@tanzaflix.com</strong>
                </p>
                <p class="footer-text" style="font-size:12px; color:#aaa; margin-top:6px;">
                    &copy; 2026 TanzaFlix. All rights reserved.
                </p>
                <div class="footer-links">
                    <a href="#">Privacy Policy</a>
                    <span class="divider">|</span>
                    <a href="#">Terms of Service</a>
                    <span class="divider">|</span>
                    <a href="#">Help Center</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
        from: `"TanzaFlix" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent
    });

    console.log(`✅ OTP email sent to ${email}`);
};

module.exports = { sendOTP };