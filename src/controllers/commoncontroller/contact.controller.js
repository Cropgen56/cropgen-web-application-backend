import { sendBasicEmail } from "../../config/sesClient.js";

export const contactUs = async (req, res) => {
  try {
    const { firstName, lastName, email, content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: "Content is required.",
      });
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "N/A";

    const html = `
      <h3>New Message from Website</h3>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email || "N/A"}</p>
      <hr />
      <p><strong>Message:</strong></p>
      <p>${String(content).replace(/\n/g, "<br/>")}</p>
    `;

    const text = `
New Message from Website

Name: ${fullName}
Email: ${email || "N/A"}

Message:
${content}
    `.trim();

    const result = await sendBasicEmail({
      to: "cropgenapp@gmail.com",
      subject: "New Contact Message – CropGen",
      html,
      text,
      replyTo: email || undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully.",
      messageId: result.MessageId,
    });
  } catch (error) {
    console.error("contactUs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
      error: error.code || "InternalServerError",
    });
  }
};
