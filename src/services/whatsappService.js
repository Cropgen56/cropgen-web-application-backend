import axios from "axios";

// send the otp 
export async function sendOtpWhatsApp(phone, otp) {
  const url = `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;


  const formattedPhone = phone.startsWith("+") ? phone.slice(1) : phone;

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: "cropgen_auth_template",       
      language: {
        code: "en"                       
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: otp.toString()           
            }
          ]
        },
        {
          type: "button",
          sub_type: "url",                 
          index: "0",
          parameters: [
            {
              type: "text",
              text: otp.toString()           
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    return {
      success: true,
      data: response.data,
      messageId: response.data?.messages?.[0]?.id || null
    };
  } catch (error) {
    console.error("WhatsApp OTP send failed:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

// send custom message to the users
export async function sendCustomWhatsAppMessage(phone, messageText, options = {}) {
  const {
    previewUrl = true,
  } = options;

  
  const formattedPhone = phone.replace(/[^\d]/g, "");

  if (!formattedPhone.match(/^\d{10,15}$/)) {
    return {
      success: false,
      error: "Invalid phone number format. Use international format without + (e.g. 919322396236)",
    };
  }

  const url = `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: {
      preview_url: previewUrl,
      body: messageText,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 10000, 
    });

    const messageId = response.data?.messages?.[0]?.id;

    return {
      success: true,
      data: response.data,
      messageId,
      status: response.status,
    };
  } catch (error) {
    const errorData = error.response?.data?.error || error.message;
    console.error("[WhatsApp Custom Message Error]", {
      phone: formattedPhone,
      error: errorData,
      status: error.response?.status,
    });

    return {
      success: false,
      error: errorData,
      status: error.response?.status || 500,
    };
  }
}