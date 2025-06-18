// HTML email template for OTP
export const loginOtpEmail = (otp) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP for Login</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color: #4a90e2; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Login OTP</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; text-align: center;">
            <p style="color: #333333; font-size: 16px; margin: 0 0 20px;">Please use the following One-Time Password (OTP) to log in to your account:</p>
            <div style="display: inline-block; background-color: #f0f8ff; padding: 15px 25px; border-radius: 6px; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; color: #4a90e2; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="color: #333333; font-size: 16px; margin: 20px 0;">This OTP is valid for <strong>5 minutes</strong>. Please enter it in the verification field to complete your login.</p>
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">If you did not request this OTP, please ignore this email or contact our support team.</p>
            <a href="https://app.cropgenapp.com/login" target="_blank" style="display: inline-block; background-color: #4a90e2; color: #ffffff; padding: 12px 25px; text-decoration: none;BR border-radius: 5px; font-size: 16px; margin-top: 20px;">Log In Now</a>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666666; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} CropGen . All rights reserved.</p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0;">Pune, Maharashtra, 411018, India</p>
            <p style="colorshe color: #666666; font-size: 12px; margin: 5px 0;">
              <a href="https://www.cropgenapp.com/terms-conditions" target="_blank" style="color: #4a90e2; text-decoration: none;">Contact Us</a> | 
              <a href="https://www.cropgenapp.com/privacy-policy" style="color: #4a90e2; text-decoration: target="_blank" none;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// HTML email template for OTP
export const signupOtpEmail = (otp) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP for Signup</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color: #4a90e2; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Signup OTP </h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; text-align: center;">
            <p style="color: #333333; font-size: 16px; margin: 0 0 20px;">Thank you for signing up! Please use the following One-Time Password (OTP) to verify your account:</p>
            <div style="display: inline-block; background-color: #f0f8ff; padding: 15px 25px; border-radius: 6px; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; color: #4a90e2; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="color: #333333; font-size: 16px; margin: 20px 0;">This OTP is valid for <strong>5 minutes</strong>. Please enter it in the verification field to complete your signup.</p>
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">If you did not request this OTP, please ignore this email or contact our support team.</p>
            <a href="#" style="display: inline-block; background-color: #4a90e2; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; margin-top: 20px;">Verify Now</a>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666666; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} CropGen . All rights reserved.</p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0;">Pune, Maharashtra, 411018, India</p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0;">
              <a href="https://www.cropgenapp.com/terms-conditions"  target="_blank" style="color: #4a90e2; text-decoration: none;">Contact Us</a> | 
              <a href="https://www.cropgenapp.com/privacy-policy" target="_blank"  style="color: #4a90e2; text-decoration: none;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// HTML email template for welcome email after successful signup
export const welcomeEmail = (firstName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CropGen!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color: #4a90e2; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to CropGen, ${firstName}!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; text-align: center;">
            <p style="color: #333333; font-size: 16px; margin: 0 0 20px;">Congratulations! Your CropGen account has been successfully created.</p>
            <p style="color: #333333; font-size: 16px; margin: 20px 0;">We're excited to have you on board. CropGen is your partner in revolutionizing agriculture with cutting-edge technology. Get started by logging in to explore our platform and discover how we can help you achieve your goals.</p>
            <a href="https://www.cropgenapp.com/login" target="_blank" style="display: inline-block; background-color: #4a90e2; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; margin-top: 20px;">Log In Now</a>
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">If you have any questions or need assistance, our support team is here to help. Feel free to reach out via our <a href="https://www.cropgenapp.com/terms-conditions" target="_blank" style="color: #4a90e2; text-decoration: none;">Contact Us</a> page.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666666; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} CropGen. All rights reserved.</p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0;">Pune, Maharashtra, 411018, India</p>
            <p style="color: #666666; font-size: 12px; margin: 5px 0;">
              <a href="https://www.cropgenapp.com/terms-conditions" target="_blank" style="color: #4a90e2; text-decoration: none;">Contact Us</a> | 
              <a href="https://www.cropgenapp.com/privacy-policy" target="_blank" style="color: #4a90e2; text-decoration: none;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
