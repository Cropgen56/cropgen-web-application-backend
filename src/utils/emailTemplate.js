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

// Subscription Success Invoice email template
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

  // Generate dynamic invoice number (you can improve this logic)
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `CG/${year}/INV-${random}`;
  };

  const finalInvoiceNumber = invoiceNumber.startsWith("CG/")
    ? invoiceNumber
    : generateInvoiceNumber();

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CropGen Invoice</title>
    <style>
      body {
        font-family: "Poppins", sans-serif;
        background-color: #fff;
        margin: 0;
        padding: 0;
        color: #222;
      }

      .invoice-container {
        max-width: 600px;
        margin: 40px auto;
        background: #f8f8fc;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 25px 25px 10px;
      }

      .logo-box {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .logo-box img {
        width: 39px;
        height: 39px;
      }

      .logo-box span {
        font-size: 16px;
        font-weight: 600;
        color: #345d13;
      }

      .socials {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .socials img {
        opacity: 0.85;
        transition: 0.2s;
      }

      .socials img:hover {
        opacity: 1;
        transform: scale(1.05);
      }

      .illustration {
        text-align: center;
        padding: 20px;
      }

      .illustration img {
        width: 260px;
        max-width: 100%;
        height: 270px;
      }

      .payment-info {
        text-align: center;
        padding: 20px;
        border-bottom: 2px dashed #86d72f;
        margin: 0 20px;
      }

      .payment-info h2 {
        margin: 10px 0;
        font-size: 26px;
        color: #000;
        font-weight: 700;
      }

      .payment-info p {
        margin: 6px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .highlight {
        font-weight: 700;
        font-size: 20px;
      }

      .summary-title {
        font-size: 15px;
        font-weight: 600;
        color: #000;
        margin: 20px 30px;
      }

      .summary {
        background: #2ab6731a;
        border-radius: 12px;
        padding: 20px;
        margin: 0px 30px 20px;
        font-size: 15px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 14px;
        color: #000;
      }

      .summary-row span:first-child {
        font-weight: 500;
      }

      .summary-row span:last-child {
        font-weight: 700;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #345d13;
        color: #fff;
        text-align: center;
        padding: 12px 20px;
        font-size: 15px;
        border-radius: 8px;
        text-decoration: none;
        transition: 0.3s;
        margin: 0 30px 20px;
        cursor: pointer;
      }

      .footer {
        font-size: 13px;
        color: #000;
        padding: 20px;
        margin: 0 20px;
        border-top: 2px dashed #86d72f;
        line-height: 28px;
      }

      .footer p {
        text-align: left;
        font-weight: 500;
      }

      .footer a {
        color: #198754;
        text-decoration: none;
      }

      .footer small {
        display: block;
        margin-top: 10px;
        font-style: italic;
        color: black;
        text-align: center;
      }

      .footer span {
        display: block;
        text-align: center;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="header">
        <div class="logo-box">
          <img src="https://www.cropgenapp.com/assets/logo.svg" alt="CropGen Logo" />
          <span>CropGen</span>
        </div>

        <div class="socials">
          <a href="https://www.facebook.com/people/CropGen/61554177574869/" target="_blank">
            <img src="https://www.cropgenapp.com/assets/facebook.svg" alt="Facebook" />
          </a>
          <a href="https://www.instagram.com/cropgen" target="_blank">
            <img src="https://www.cropgenapp.com/assets/instagram.svg" alt="Instagram" />
          </a>
          <a href="https://x.com/cropgen" target="_blank">
            <img src="https://www.cropgenapp.com/assets/twitter.svg" alt="Twitter" />
          </a>
          <a href="https://www.linkedin.com/company/cropgen/posts/?feedView=all&viewAsMember=true" target="_blank">
            <img src="https://www.cropgenapp.com/assets/linkedin.svg" alt="LinkedIn" />
          </a>
          <a href="https://www.youtube.com/channel/UCuU7d-rByYZfMkfoj0Pgq0w" target="_blank">
            <img src="https://www.cropgenapp.com/assets/youtube.svg" alt="YouTube" />
          </a>
        </div>
      </div>

      <div class="illustration">
        <img src="https://www.cropgenapp.com/assets/illustration.svg" alt="Payment Illustration" />
      </div>

      <div class="payment-info">
        <h2>Your Payment Successful</h2>
        <p>
          Thank you for your payment of
          <span class="highlight">${formattedAmount}</span> on
          <span class="highlight">${issuedDate}</span>
        </p>
        <p>Using ${paymentMethod}</p>
      </div>

      <h4 class="summary-title">Invoice Summary Box:</h4>

      <div class="summary">
        <div class="summary-row">
          <span>Invoice No.</span><span>${finalInvoiceNumber}</span>
        </div>
        <div class="summary-row">
          <span>Date Issued</span><span>${issuedDate}</span>
        </div>
        <div class="summary-row">
          <span>Plan</span><span>${planName} - ${hectares} ha</span>
        </div>
        <div class="summary-row">
          <span>Billing Period</span><span>${billingPeriod}</span>
        </div>
        <div class="summary-row">
          <span>Amount Due</span><span>${formattedAmount}</span>
        </div>
        <div class="summary-row">
          <span>Payment Status</span>
          <span>Paid (${paymentMethod})</span>
        </div>
      </div>

      <a href="https://app.cropgenapp.com/dashboard" class="btn">
        <img src="https://www.cropgenapp.com/assets/download.svg" alt="Download" /> Download Invoice PDF
      </a>

      <div class="footer">
        <p>
          You can view and manage your invoices anytime from your CropGen
          Dashboard.<br />
          For queries, contact
          <a href="mailto:support@cropgen.in">support@cropgen.in</a>
        </p>
        <small>
          This email was sent to you by CropGen - AI-Powered Crop Monitoring &
          Precision Farming
        </small>
        <span>
          <a href="https://app.cropgenapp.com/login">Visit Dashboard</a> |
          <a href="https://www.cropgenapp.com/contact">Contact us</a>
        </span>
      </div>
    </div>
  </body>
</html>
  `;
};
