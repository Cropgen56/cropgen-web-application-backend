import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const sendBasicEmail = async ({ to, subject, html, text }) => {
  const params = {
    Source: "info@cropgenapp.com",
    Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: text || "" },
        Html: { Data: html || `<p>${text || ""}</p>` },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    return await sesClient.send(command);
  } catch (err) {
    //  Handle SES "email not verified" error
    if (
      err.name === "MessageRejected" &&
      err.message.includes("is not verified")
    ) {
      const failedEmail = err.message.match(/([^\s]+@[^\s]+)/)?.[0];
      const customError = new Error(
        `Email address ${failedEmail} is not verified in SES.`
      );
      customError.code = "EmailNotVerified";
      throw customError;
    }

    //  Re-throw any other error
    throw err;
  }
};
