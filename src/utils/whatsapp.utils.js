export const calculateCropAgeInDays = (sowingDate) => {
  if (!sowingDate) return null;

  const sowing = new Date(sowingDate);
  const today = new Date();

  const diffTime = today.getTime() - sowing.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 ? diffDays : 0;
};

/* ================= ICON MAP ================= */

const TYPE_ICONS = {
  SPRAY: "🧴",
  FERTIGATION: "🌿",
  IRRIGATION: "🚿",
  WEATHER: "🌦️",
  CROP_RISK: "⚠️",
};

/* ================= FORMAT MESSAGE ================= */

export const formatFarmAdvisoryMessage = (activities, farmField, farmer) => {
  const farmerName = farmer?.firstName
    ? `${farmer.firstName}${farmer.lastName ? " " + farmer.lastName : ""}`
    : "Farmer";

  let message = `🌾 *Farm Advisory – Today*\n\n`;
  message += `${farmerName}, hello 🙏\n\n`;

  /* ================= FARM DETAILS ================= */

  if (farmField) {
    const cropAge = calculateCropAgeInDays(farmField.sowingDate);
    const formattedArea = Number(farmField.acre || 0).toFixed(2);

    message += `📍 *Farm Details*\n`;
    message += `• Field: ${farmField.fieldName}\n`;
    message += `• Crop: ${farmField.cropName} (${farmField.variety})\n`;
    message += `• Area: ${formattedArea} Acre\n`;
    message += `• Farming Type: ${farmField.typeOfFarming}\n`;
    message += `• Irrigation Type: ${farmField.typeOfIrrigation}\n`;

    if (cropAge !== null) {
      message += `• Crop Age: ${cropAge} days\n`;
    }

    message += `\n——————————————\n\n`;
  }

  /* ================= ACTIVITIES ================= */

  activities.forEach((item, index) => {
    const icon = TYPE_ICONS[item.type] || "📌";

    message += `*${icon} ${item.title}*\n`;
    message += `${item.message}\n`;

    if (item.details && Object.keys(item.details).length > 0) {
      message += `\n🔍 *Details:*\n`;

      if (item.details.chemical)
        message += `• Chemical: ${item.details.chemical}\n`;

      if (item.details.fertilizer)
        message += `• Fertilizer: ${item.details.fertilizer}\n`;

      if (item.details.quantity)
        message += `• Quantity: ${item.details.quantity}\n`;

      if (item.details.method) message += `• Method: ${item.details.method}\n`;

      if (item.details.time) message += `• Time: ${item.details.time}\n`;

      if (item.details.weather)
        message += `• Weather Note: ${item.details.weather}\n`;

      if (item.details.risk) message += `• Risk Alert: ${item.details.risk}\n`;
    }

    if (index !== activities.length - 1) {
      message += `\n——————————————\n\n`;
    }
  });

  message += `\n✅ Please follow the advisory carefully.\n📞 Contact us if you need any assistance.`;

  return message;
};

export const formatFarmAdvisoryMessageHindi = () => {
  let message = `🌾 *कृषि सलाह – आज*\n\n`;

  /* ================= GREETING ================= */

  message += `राम राम किसान भाई 🙏\n\n`;

  /* ================= MESSAGE 1 – SPRAY ================= */

  message += `📩 *MESSAGE 1 – स्प्रे*\n\n`;
  message += `🧴 *आज स्प्रे करें*\n`;
  message += `- दवा: कार्बेन्डाजिम 50%\n`;
  message += `- प्रकार: फफूंदनाशक\n`;
  message += `- मात्रा: 200 ग्राम / एकड़\n`;
  message += `- पानी: 200 लीटर / एकड़\n`;
  message += `- समय: सुबह या शाम\n\n`;
  message += `⚠️ सावधानी: हवा तेज हो या बारिश हो तो स्प्रे न करें।\n`;

  message += `\n——————————————\n\n`;

  /* ================= MESSAGE 2 – FERTIGATION ================= */

  message += `📩 *MESSAGE 2 – खाद*\n\n`;
  message += `🧪 *आज खाद दें*\n`;
  message += `- खाद: यूरिया\n`;
  message += `- फार्मुलेशन: 46%\n`;
  message += `- मात्रा: 25 किग्रा / एकड़\n`;
  message += `- तरीका: ड्रिप द्वारा\n`;
  message += `- कब: सिंचाई के बाद\n`;

  message += `\n——————————————\n\n`;

  /* ================= MESSAGE 3 – IRRIGATION ================= */

  message += `📩 *MESSAGE 3 – सिंचाई*\n\n`;
  message += `💧 *आज सिंचाई करें*\n`;
  message += `- तरीका: ड्रिप\n`;
  message += `- समय: 3 घंटे / एकड़\n`;
  message += `- उत्तम समय: सुबह\n`;

  message += `\n——————————————\n\n`;

  /* ================= MESSAGE 4 – MONITORING ================= */

  message += `📩 *MESSAGE 4 – निगरानी*\n\n`;
  message += `👀 *खेत की निगरानी करें*\n`;
  message += `- क्या देखें: पत्तियां और कीट\n`;
  message += `- कहां देखें: पूरे खेत में\n`;
  message += `- यदि 10% क्षेत्र में दिखाई दे तो हमें सूचित करें\n\n`;
  message += `📅 अगली जानकारी: 5 फरवरी 2026\n`;

  message += `\n——————————————\n\n`;

  /* ================= MESSAGE 5 – NO ACTION ================= */

  message += `📩 *MESSAGE 5 – कोई कार्य नहीं*\n\n`;
  message += `🌱 *आज कोई कार्य करने की आवश्यकता नहीं है।*\n`;
  message += `फसल की स्थिति ठीक है।\n\n`;
  message += `📅 अगली जानकारी: 5 फरवरी 2026\n`;

  message += `\n——————————————\n\n`;

  /* ================= MESSAGE 6 – CROP END ================= */

  message += `📩 *MESSAGE 6 – फसल चक्र समाप्त*\n\n`;
  message += `🌾 *इस फसल का कार्य पूर्ण हो गया है।*\n`;
  message += `इस फसल की सलाह अब बंद की जा रही है।\n\n`;
  message += `🌱 नई फसल बोने पर सलाह फिर से शुरू की जाएगी।\n`;

  return message;
};
