// src/config/sesClient.js
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function formatAddress(name, email) {
  const safeName = (name || "").trim();
  const safeEmail = (email || "").trim();
  return safeName ? `${safeName} <${safeEmail}>` : safeEmail;
}

/**
 * Send a basic email via AWS SES (classic) with a display name and reply-to.
 *
 * @param {Object} params
 * @param {string|string[]} params.to            - recipient(s)
 * @param {string}           params.subject
 * @param {string}           params.html
 * @param {string}           [params.text]
 * @param {string}           [params.fromEmail]  - default: process.env.SES_FROM_EMAIL
 * @param {string}           [params.fromName]   - default: process.env.SES_FROM_NAME
 * @param {string}           [params.replyTo]    - default: process.env.SES_REPLY_TO || fromEmail
 * @param {string}           [params.configurationSet] - SES configuration set name (optional)
 * @param {Array<{Name:string,Value:string}>} [params.tags] - SES message tags (optional)
 */
export const sendBasicEmail = async ({
  to,
  subject,
  html,
  text,
  fromEmail = process.env.SES_FROM_EMAIL,
  fromName = process.env.SES_FROM_NAME || "CropGen",
  replyTo = process.env.SES_REPLY_TO || process.env.SES_FROM_EMAIL,
  configurationSet,
  tags,
}) => {
  if (!fromEmail) throw new Error("SES_FROM_EMAIL not set");
  if (!subject) throw new Error("Email subject is required");
  if (!to || (Array.isArray(to) && to.length === 0))
    throw new Error("At least one recipient (to) is required");

  const params = {
    Source: formatAddress(fromName, fromEmail), // 👈 shows as “CropGen <info@cropgenapp.com>”
    Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html || `<p>${text || ""}</p>`, Charset: "UTF-8" },
        ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
      },
    },
    // Optional extras
    ConfigurationSetName: configurationSet || undefined,
    Tags: Array.isArray(tags) && tags.length ? tags : undefined,
  };

  try {
    const command = new SendEmailCommand(params);
    return await sesClient.send(command);
  } catch (err) {
    // Common SES verification error (sender or recipient not verified in sandbox)
    if (
      (err.name === "MessageRejected" || err.name === "SESServiceException") &&
      typeof err.message === "string" &&
      err.message.includes("is not verified")
    ) {
      const failedEmail =
        err.message.match(/([^\s]+@[^\s]+)/)?.[0] || fromEmail;
      const customError = new Error(
        `SES rejected the message: ${failedEmail} is not verified.`
      );
      customError.code = "EmailNotVerified";
      throw customError;
    }
    // Surface the original error for anything else
    throw err;
  }
};
