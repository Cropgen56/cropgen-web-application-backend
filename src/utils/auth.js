import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Organization from "../models/organizationModel.js";

export const signJwt = (user, extra = {}) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      organization: user.organization,
      ...extra,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
  );

export const hash = (s) => bcrypt.hash(s, 10);
export const compare = (s, h) => bcrypt.compare(s, h);

export const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const resolveOrganizationByCode = async (codeRaw = "CROPGEN") => {
  const code = String(codeRaw).toUpperCase().trim();
  const org = await Organization.findOne({ organizationCode: code });
  if (!org) {
    const err = new Error(`Organization '${code}' not found.`);
    err.status = 404;
    throw err;
  }
  return { org, orgCode: code };
};

// otp verification email template
export const htmlOtp = (otp) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Code - CropGen</title>
</head>
<body style="margin:0; padding:0; background:#e5e7eb; font-family:Arial,Helvetica,sans-serif;">
  <div style="width:100%;  display:flex; justify-content:center; padding:16px;">
    <div style="max-width:640px; width:100%; background:#fff; border-radius:8px; overflow:hidden;">

      <!-- Header -->
      <div style="padding:12px 16px; display:flex; align-items:center; gap:8px;">
        <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen" style="width:28px; height:28px; display:block; border:0; outline:none;" />
        <span style="font-size:20px; font-weight:600; color:#345D13;">CropGen</span>
      </div>

      <!-- Body -->
      <div style="background:#F5F8FF; padding:32px 24px 16px 24px; display:flex; justify-content:space-between; align-items:flex-end;">
        <!-- Left -->
        <div style="max-width:500px;">
          <h1 style="font-size:40px; font-weight:800; color:#000; margin:0 0 12px 0;">Your CropGen verification code</h1>
          <br>
          <p style="font-size:18px; color:#000; margin:0 0 8px 0; line-height:24px;">Hi Farmer,</p>
          <br>
          <p style="font-size:18px; color:#000; margin:0 0 16px 0; line-height:24px;">To finish logging in to your CropGen account, enter this verification code:</p>
          <br>
          
          <div style="display:inline-block; background:#fff; border-radius:6px; padding:12px 16px; font-size:20px; font-weight:700; color:#111827; box-shadow:0 1px 2px rgba(0,0,0,0.08); margin:0 0 16px 0;">${otp}</div>
          <br>
          <br>
          <br>
          <p style="font-size:16px; color:#000; margin:0;"><span>If you didn’t make this request or need assistance, visit the </span><a href="https://app.cropgenapp.com/help" style="color:#2563eb; text-decoration:underline;">Help Centre</a>.</p>
        </div>

        <!-- Right -->
        <div style="text-align:right;">
          <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/hand-hold-mobile.png" alt="Verification" style=" width:96px; height:auto; display:block; border:0; bottom:0; outline:none;" />
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#345F11; color:#F3F4F6; padding:20px 24px; font-size:12px;">
        <p style="margin:0 0 8px 0;">
          <a href="https://app.cropgenapp.com/login" style="color:#60a5fa; text-decoration:underline; margin-right:12px;">Dashboard</a>•
          <a href="https://app.cropgenapp.com/billing" style="color:#60a5fa; text-decoration:underline; margin-right:12px;">Billing</a>•
          <a href="https://app.cropgenapp.com/help" style="color:#60a5fa; text-decoration:underline;">Help</a>
        </p>
        <p style="margin:0 0 8px 0; line-height:18px;">You received this email because you just signed up for a new account. If it looks weird, <a href="#" style="color:#60a5fa; text-decoration:underline;">view it in your browser</a>.</p>
        <p style="margin:0; line-height:18px;">If these emails get annoying, please feel free to <a href="#" style="color:#60a5fa; text-decoration:underline;">unsubscribe</a>.</p>
      </div>

    </div>
  </div>
</body>
</html>
`;

// Welcome email template
export const htmlWelcome = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to CropGen</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif;">
  <div style="width:100%;  display:flex; justify-content:center; padding:24px 0;">
    <div style="max-width:640px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background:#246B27; text-align:center; padding:24px; color:#fff;">
        <div style="display:inline-flex; align-items:center; gap:8px;">
          <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen Logo" style="vertical-align:middle; width:36px; border:0; outline:none;" />
          <span style="font-size:20px; font-weight:600;  vertical-align:middle;">CropGen</span>
        </div>
        <div style="border-top:1px solid #d1d5db; width:150px; margin:12px auto;"></div>
        <h2 style="font-size:22px; font-weight:700; margin:0; margin-top:12px;">Welcome To CropGen</h2>
      </div>

      <!-- Body -->
      <div style="padding:40px 32px; text-align:center; color:#374151;">
        <h1 style="font-size:28px; font-weight:700; margin:0 0 16px 0;">Hi there, Farmer!</h1>
        <p style="font-size:16px; line-height:24px; margin:0 0 16px 0;">Thank you for joining CropGen. Let’s get started with smarter farming insights tailored just for you.</p>
        <p style="font-size:16px; line-height:24px; margin:0 0 16px 0;">You’ll experience the future of farming — powered by AI, satellite insights, and smart recommendations tailored just for your fields.</p>
        <a href="https://app.cropgenapp.com/login" style="display:inline-block; background:#345F11; color:#fff; font-weight:600; font-size:16px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:24px;">Get Started</a>
        <p style="font-size:14px; color:#246B27 ;line-height:20px; margin:0 0 20px 0;">Need help setting up your account? Our Customer Services team is here to assist you. We’re excited to grow with you 🌱</p>
        
        <br>
        <br>
        
                <p style="font-size:18px; font-weight:600; line-height:24px;  margin:0 0 16px 0;">CropGen</p>
        <p style="font-weight:600; color:#111827; margin:4px 0 0 0;">Smarter Farming Starts Here.</p>
      </div>

      <!-- Footer -->
      <div style="background:#246B27; text-align:center; padding:16px;">
        <a href="https://www.cropgenapp.com/privacy-policy" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Privacy Policy</a>
        <a href="https://www.cropgenapp.com/terms-conditions" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Terms & Conditions</a>
        <a href="https://www.cropgenapp.com/contact" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Contact Us</a>
      </div>

    </div>
  </div>
</body>
</html>
`;

// Welcome Back email template for returning users
export const htmlWelcomeBack = (email) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome Back - CropGen</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif;">
  <div style="width:100%; display:flex; justify-content:center; padding:24px 0;">
    <div style="max-width:640px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background:#246B27; text-align:center; padding:24px; color:#fff;">
        <div style="display:inline-flex; align-items:center; gap:8px;">
          <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen Logo" style="vertical-align:middle; width:36px; border:0; outline:none;" />
          <span style="font-size:20px; font-weight:600;  vertical-align:middle;">CropGen</span>
        </div>
        <div style="border-top:1px solid #d1d5db; width:150px; margin:12px auto;"></div>
        <h2 style="font-size:22px; font-weight:700; margin:0; margin-top:12px;">Welcome Back</h2>
      </div>

      <!-- Body -->
      <div style="padding:40px 32px; text-align:center; color:#374151;">
        <h1 style="font-size:28px; font-weight:700; margin:0 0 16px 0;">Hello again!</h1>
        <p style="font-size:16px; line-height:24px; margin:0 0 16px 0;">
          We’re glad to see you back, <strong>${email}</strong>. Continue exploring your farm insights and smarter farming solutions below.
        </p>
        <a href="https://app.cropgenapp.com/login" style="display:inline-block; background:#345F11; color:#fff; font-weight:600; font-size:16px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:24px;">Go to Dashboard</a>
        <br>

     
        <p style="font-size:16px;  color:#246B27 ; line-height:24px; margin:0 0 16px 0;">Need help accessing your account? Don’t hesitate to contact Customer Services.</p>
        <p style="font-size:16px; color:#246B27 ;  font-weight:600; line-height:24px; margin:0 0 16px 0;">Happy Farming!</p>
        <br>
        <br>
        <p style="font-size:18px; font-weight:600; line-height:24px;  margin:0 0 16px 0;">CropGen</p>
        <p style="font-weight:600; color:#111827; margin:4px 0 0 0;">Smarter Farming Starts Here.</p>
      </div>

      <!-- Footer -->
      <div style="background:#246B27; text-align:center; padding:16px;">
        <a href="https://www.cropgenapp.com/privacy-policy" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Privacy Policy</a>
        <a href="https://www.cropgenapp.com/terms-conditions" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Terms & Conditions</a>
        <a href="https://www.cropgenapp.com/contact" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Contact Us</a>
      </div>

    </div>
  </div>
</body>
</html>
`;
