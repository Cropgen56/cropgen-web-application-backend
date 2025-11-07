// OTP email template
export const htmlOtp = (otp) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verification Code - CropGen</title>
  <style>
    /* mobile tweaks */
    @media only screen and (max-width:480px) {
      .container { width:100% !important; }
      .two-col, .col-left, .col-right { display:block !important; width:100% !important; }
      .col-right { text-align:center !important; padding:12px 0 18px 0 !important; }
      .headline { font-size:28px !important; }
      .otp-box { margin-left:0 !important; }
      .body-padding { padding:20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f0f2f4; font-family:Arial,Helvetica,sans-serif; -webkit-text-size-adjust:none;">
  <!-- outer wrapper -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f0f2f4">
    <tr>
      <td align="center" style="padding:36px 12px;">
        <!-- card -->
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0"
               style="width:600px; max-width:600px; border-radius:10px; overflow:hidden; background:#ffffff; box-shadow:0 12px 28px rgba(16,24,40,0.08);">
          
          <!-- header (compact) -->
          <tr>
            <td style="padding:12px 20px; border-bottom:1px solid #eef2f7;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                <tr>
                  <td style="width:44px; vertical-align:middle; padding-right:8px;">
                    <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png"
                         alt="CropGen" width="36" height="36"
                         style="display:block; border:0; outline:none; line-height:1; height:auto; max-width:36px;" />
                  </td>
                  <td style="vertical-align:middle; padding:0; font-family:Arial,Helvetica,sans-serif;">
                    <span style="font-size:16px; font-weight:700; color:#2f6b10; line-height:1;">CropGen</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- body: pale blue background area -->
          <tr>
            <td style="background:#F5F8FF; padding:28px 32px 24px 32px;" class="body-padding">
              <!-- two columns table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" class="two-col" style="table-layout:fixed;">
                <tr style="vertical-align:top;">
                  <!-- left column (text + otp) -->
                  <td class="col-left" valign="top" style="padding-right:18px; vertical-align:top;">
                  <h1
                        class="headline"
                        style="
                          font-size: 32px;
                          font-weight: 800;
                          color: #0b1220;
                          margin: 0 0 12px 0;
                          line-height: 1.2;
                          font-family: Arial, Helvetica, sans-serif;
                        "
                      >
                        Your CropGen verification code
                      </h1>

                    <p style="font-size:15px; color:#0b1220; margin:12px 0 6px 0;">Hi Farmer,</p>

                    <p style="font-size:15px; color:#0b1220; margin:0 0 18px 0; line-height:22px;">
                      To finish logging in to your CropGen account, enter this verification code:
                    </p>

                    <!-- OTP box: use inner table for Outlook stability -->
                    <table border="0" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td class="otp-box"
                            style="background:#ffffff; border-radius:8px; padding:14px 20px; font-size:22px; font-weight:800; color:#111827; box-shadow:0 6px 14px rgba(2,6,23,0.06); display:inline-block; letter-spacing:1.5px; font-family:Arial,Helvetica,sans-serif;">
                          ${otp}
                        </td>
                      </tr>
                    </table>

                    <p style="font-size:14px; color:#0b1220; margin:0;">
                      If you didn’t make this request or need assistance, visit the
                      <a href="https://app.cropgenapp.com/help" style="color:#2563eb; text-decoration:underline;">Help Centre</a>.
                    </p>
                  </td>

                  <!-- right column (illustration) anchored bottom-right -->
                  <td class="col-right" valign="bottom" style="width:130px; vertical-align:bottom; text-align:right; padding-left:8px; padding-bottom:10px;">
                    <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/hand-hold-mobile.png"
                         alt="Verification" width="96" style="display:block; border:0; outline:none; margin:0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer (green full-width) -->
          <tr>
            <td style="background:#2f5c11; color:#f3f4f6; padding:18px 24px; font-size:13px;">
              <div style="max-width:540px; margin:0 auto;">
                <p style="margin:0 0 8px 0;">
                  <a href="https://app.cropgenapp.com/login" style="color:#d8f0ff; text-decoration:underline; margin-right:12px;">Dashboard</a>•
                  <a href="https://app.cropgenapp.com/billing" style="color:#d8f0ff; text-decoration:underline; margin:0 12px;">Billing</a>•
                  <a href="https://app.cropgenapp.com/help" style="color:#d8f0ff; text-decoration:underline; margin-left:12px;">Help</a>
                </p>
                <p style="margin:10px 0 6px 0; line-height:20px;">
                  You received this email because you just signed up for a new account. If it looks weird,
                  <a href="#" style="color:#d8f0ff; text-decoration:underline;">view it in your browser</a>.
                </p>
                <p style="margin:0; line-height:20px;">
                  If these emails get annoying, please feel free to <a href="#" style="color:#d8f0ff; text-decoration:underline;">unsubscribe</a>.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Welcome email template
export const htmlWelcome = (firstName) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to CropGen</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f3f4f6; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:640px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.08); box-sizing:border-box; margin:0 auto;">
          <tr>
            <td>
              <!-- Header -->
              <div style="background:#246B27; text-align:center; padding:24px; color:#fff;">
                <div style="display:inline-flex; vertical-align:middle; align-items:center; ">
                  <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen Logo" style="vertical-align:middle; width:36px; border:0; outline:none;padding-right:8px;" />
                  <span style="font-size:20px; font-weight:600; vertical-align:middle;">CropGen</span>
                </div>
                <div style="border-top:1px solid #d1d5db; width:150px; margin:12px auto;"></div>
                <h2 style="font-size:22px; font-weight:700; margin:0; margin-top:12px;">Welcome To CropGen</h2>
              </div>

              <!-- Body -->
              <div style="padding:40px 32px; text-align:center; color:#374151;">
                <h1 style="font-size:28px; font-weight:700; margin:0 0 16px 0;">Hi there, ${firstName}!</h1>
                <p style="font-size:16px; line-height:24px; margin:0 0 16px 0;">Thank you for joining CropGen. Let’s get started with smarter farming insights tailored just for you.</p>
                <p style="font-size:16px; line-height:24px; margin:0 0 16px 0;">You’ll experience the future of farming — powered by AI, satellite insights, and smart recommendations tailored just for your fields.</p>
                <a href="https://app.cropgenapp.com/login" style="display:inline-block; background:#345F11; color:#fff; font-weight:600; font-size:16px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:24px;">Get Started</a>
                <p style="font-size:14px; color:#246B27; line-height:20px; margin:0 0 20px 0;">Need help setting up your account? Our Customer Services team is here to assist you. We’re excited to grow with you 🌱</p>
                <br>
                <br>
                <p style="font-size:18px; font-weight:600; line-height:24px; margin:0 0 16px 0;">CropGen</p>
                <p style="font-weight:600; color:#111827; margin:4px 0 0 0;">Smarter Farming Starts Here.</p>
              </div>

              <!-- Footer -->
              <div style="background:#246B27; text-align:center; padding:16px;">
                <a href="https://www.cropgenapp.com/privacy-policy" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Privacy Policy</a>
                <a href="https://www.cropgenapp.com/terms-conditions" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Terms & Conditions</a>
                <a href="https://www.cropgenapp.com/contact" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Contact Us</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f3f4f6; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:640px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.08); box-sizing:border-box; margin:0 auto;">
          <tr>
            <td>
              <!-- Header -->
              <div style="background:#246B27; text-align:center; padding:24px; color:#fff;">
                <div style="display:inline-flex; vertical-align:middle; align-items:center; ">
                  <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen Logo" style="vertical-align:middle; width:36px; border:0; outline:none;padding-right:8px;" />
                  <span style="font-size:20px; font-weight:600; vertical-align:middle;">CropGen</span>
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
                <a href="https://app.cropgenapp.com/cropgen-analytics" style="display:inline-block; background:#345F11; color:#fff; font-weight:600; font-size:16px; padding:14px 28px; border-radius:6px; text-decoration:none; margin-bottom:24px;">Go to Dashboard</a>
                <br>
                <p style="font-size:16px; color:#246B27; line-height:24px; margin:0 0 16px 0;">Need help accessing your account? Don’t hesitate to contact Customer Services.</p>
                <p style="font-size:16px; color:#246B27; font-weight:600; line-height:24px; margin:0 0 16px 0;">Happy Farming!</p>
                <br>
                <br>
                <p style="font-size:18px; font-weight:600; line-height:24px; margin:0 0 16px 0;">CropGen</p>
                <p style="font-weight:600; color:#111827; margin:4px 0 0 0;">Smarter Farming Starts Here.</p>
              </div>

              <!-- Footer -->
              <div style="background:#246B27; text-align:center; padding:16px;">
                <a href="https://www.cropgenapp.com/privacy-policy" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Privacy Policy</a>
                <a href="https://www.cropgenapp.com/terms-conditions" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Terms & Conditions</a>
                <a href="https://www.cropgenapp.com/contact" style="color:#fff; text-decoration:underline; margin:0 12px; font-size:13px;">Contact Us</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// successfully subscription email template
export const htmlSubscriptionSuccess = (
  userName,
  planName,
  hectares,
  amount,
  currency,
  startDate,
  endDate,
  nextBillingDate,
  paymentMethod = "Card",
  invoiceNumber = "CG/2025/INV-XXXXX"
) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const symbol = currency === "INR" ? "₹" : "$";
  const formattedAmount = `${symbol}${parseFloat(amount).toFixed(2)}`;
  const issuedDate = formatDate(new Date());
  const billingPeriod = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  const finalInvoiceNumber = invoiceNumber.startsWith("CG/")
    ? invoiceNumber
    : `CG/${new Date().getFullYear()}/INV-${Math.floor(
        10000 + Math.random() * 90000
      )}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CropGen Invoice</title>
</head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f9fafb; padding:20px 0;">
    <tr>
      <td align="center">

        <!-- View in Browser -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto 16px;">
          <tr>
            <td align="center" style="font-size:12px; color:#6b7280;">
              <a href="#" style="color:#345d13; text-decoration:underline;">View in browser</a>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Green Header -->
          <tr>
            <td style="background:#246B27; padding:20px; text-align:center;">
              <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen" width="36" height="36" style="display:inline-block; vertical-align:middle;" />
              <span style="color:#ffffff; font-size:20px; font-weight:600; margin-left:8px; vertical-align:middle;">CropGen</span>
            </td>
          </tr>

          <!-- Illustration -->
          <tr>
            <td style="padding:32px 40px 24px; text-align:center;">
              <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/invoice-illustration.png" alt="Payment Success" width="280" style="max-width:100%; height:auto; display:block; margin:0 auto;" />
            </td>
          </tr>

          <!-- Success Message -->
          <tr>
            <td style="padding:0 40px 16px; text-align:center;">
              <h1 style="font-size:28px; font-weight:700; color:#111827; margin:0 0 8px;">Your Payment Successful</h1>
              <p style="font-size:16px; color:#374151; margin:0 0 4px;">
                Thank you for your payment of <strong>${formattedAmount}</strong> on <strong>${issuedDate}</strong>
              </p>
              <p style="font-size:16px; color:#374151; margin:0;">Using ${paymentMethod}</p>
            </td>
          </tr>

          <!-- Dashed Line -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-bottom:2px dashed #86d72f; margin:20px 0;"></div>
            </td>
          </tr>

          <!-- Invoice Summary -->
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="font-size:14px; font-weight:600; color:#111827; margin:0 0 12px;">Invoice Summary Box:</p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f0fdf4; border-radius:8px; padding:16px; font-size:14px;">
                <tr>
                  <td style="padding:6px 0; color:#374151; width:50%;"><strong>Invoice No.</strong></td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${finalInvoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#374151;"><strong>Date Issued</strong></td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${issuedDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#374151;"><strong>Plan</strong></td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${planName} - ${hectares} ha</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#374151;"><strong>Billing Period</strong></td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${billingPeriod}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#374151;"><strong>Amount Due</strong></td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#374151;"><strong>Payment Status</strong></td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">Paid (${paymentMethod})</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Download Button -->
          <tr>
            <td style="padding:0 40px 32px; text-align:center;">
              <a href="https://app.cropgenapp.com/dashboard-icon" style="display:inline-flex; align-items:center; gap:8px; background:#345F11; color:#ffffff; font-weight:600; font-size:16px; padding:12px 24px; border-radius:6px; text-decoration:none;">
                <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/download-icon.png" alt="Download" width="16" height="16" style="display:inline-block;" />
                Download Invoice PDF
              </a>
            </td>
          </tr>

          <!-- Tip -->
          <tr>
            <td style="padding:0 40px 24px; text-align:center; font-size:12px; color:#6b7280;">
              <strong>Tip:</strong> Add <strong>no-reply@cropgen.in</strong> to your contacts to always see images.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#246B27; color:#ffffff; padding:20px; text-align:center; font-size:13px;">
              <p style="margin:0 0 8px;">
                You can view and manage your invoices anytime from your CropGen Dashboard.<br>
                For queries, contact <a href="mailto:support@cropgen.in" style="color:#d8f0ff; text-decoration:underline;">support@cropgen.in</a>
              </p>
              <p style="margin:12px 0 0; font-size:12px;">
                This email was sent to you by <strong>CropGen</strong> – AI-Powered Crop Monitoring & Precision Farming
              </p>
              <p style="margin:16px 0 0;">
                <a href="https://app.cropgenapp.com/login" style="color:#d8f0ff; text-decoration:underline; margin:0 8px;">Visit Dashboard</a> |
                <a href="https://www.cropgenapp.com/contact" style="color:#d8f0ff; text-decoration:underline; margin:0 8px;">Contact us</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer Note -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; margin:16px auto 0;">
          <tr>
            <td align="center" style="font-size:11px; color:#9ca3af;">
              © 2025 CropGen. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// admin otp email template
// src/utils/emailTemplate.js

export const htmlAdminOtp = (code, userName = "Farmer") => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm Verification Code</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Poppins", sans-serif; }
    body { background: #ffffff; padding: 40px 0; display: flex; justify-content: center; }
    .email-container { width: 600px; border-radius: 12px; padding: 30px 40px; background: #ffffff; border: 1px solid #e5e7eb; }
    .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
    .logo img { width: 57px; height: auto; }
    .logo h2 { font-size: 18px; font-weight: 600; color: #345d13; }
    .title { font-size: 32px; font-weight: bold; margin-bottom: 25px; color: #000; }
    .message-wrapper p { font-size: 15px; line-height: 24px; font-weight: 500; color: #000000; margin-bottom: 12px; }
    .otp-wrapper { display: flex; gap: 18px; justify-content: flex-start; margin: 30px 0; }
    .otp-box { width: 55px; height: 55px; border: 2px solid #9a9898; border-radius: 8px; font-size: 28px; font-weight: 700; color: #000; display: flex; justify-content: center; align-items: center; background: #effff7; }
    .security-note { margin: 20px 0; font-size: 14px; color: #d00; font-weight: 600; }
    .divider { margin: 30px 0; border-top: 2px dashed #86d72f; }
    footer { text-align: center; font-size: 13px; color: #6b7280; }
    .footer-links a { margin: 0 10px; text-decoration: none; color: #000; font-weight: 400; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cropgen-assets.s3.ap-south-1.amazonaws.com/cropgen/logo1.png" alt="CropGen Logo" />
      <h2>CropGen</h2>
    </div>

    <h2 class="title">Confirm Verification Code</h2>
    <div class="message-wrapper">
      <p>Hello <strong>${userName || "Admin"}</strong>,</p>
      <p>We received a request to log in to your <strong>CropGen Admin Account</strong>.</p>
      <p>Please use the One-Time Password (OTP) below to complete your login:</p>

      <div class="otp-wrapper">
        ${code
          .split("")
          .map((digit) => `<div class="otp-box">${digit}</div>`)
          .join("")}
      </div>

      <p>This code is valid for <strong>10 minutes</strong> and can be used only once.</p>
      <p class="security-note">
        ⚠️ This is an <strong>ADMIN</strong> login attempt. If you didn’t initiate this, secure your account immediately.
      </p>
      <p>If you didn’t request this, ignore this email or contact us at <a href="mailto:security@cropgen.in">security@cropgen.in</a></p>
    </div>

    <div style="margin: 20px 0;">
      <p style="margin-bottom: 0">Stay secure,</p>
      <p style="margin-bottom: 0"><strong>Team CropGen 🌾</strong></p>
      <p style="margin-bottom: 0">
        <a href="mailto:support@cropgen.in" style="color: #345d13; text-decoration: none;">support@cropgen.in</a>
      </p>
    </div>

    <div class="divider"></div>

    <footer>
      <p><strong>CropGen - AI + Satellite Intelligence for Smarter Farming</strong></p>
      <p style="margin-top: 20px; font-size: 12px; font-style: italic;">
        This email was sent by CropGen – AI-Powered Crop Monitoring & Precision Farming
      </p>
      <p class="footer-links">
        <a href="https://app.cropgenapp.com/admin">Admin Dashboard</a> |
        <a href="https://app.cropgenapp.com/help">Contact Support</a>
      </p>
    </footer>
  </div>
</body>
</html>
  `.trim();
};
