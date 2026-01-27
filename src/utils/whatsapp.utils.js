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

export const formatFarmAdvisoryMessage = (
  activities,
  farmField // 👈 NEW PARAM
) => {
  let message = `🌾 *Farm Advisory – Today*\n\n`;

  /* ================= FARM DETAILS ================= */

  if (farmField) {
    const cropAge = calculateCropAgeInDays(farmField.sowingDate);
    const formattedArea = farmField.acre.toFixed(2);

    message += `📍 *Farm Details*\n`;
    message += `• Field: ${farmField.fieldName}\n`;
    message += `• Crop: ${farmField.cropName} (${farmField.variety})\n`;
    message += `• Area: ${formattedArea} Acre\n`;
    message += `• Farming: ${farmField.typeOfFarming}\n`;
    message += `• Irrigation: ${farmField.typeOfIrrigation}\n`;

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

      if (item.details.method)
        message += `• Method: ${item.details.method}\n`;

      if (item.details.time)
        message += `• Time: ${item.details.time}\n`;
    }

    if (index !== activities.length - 1) {
      message += `\n——————————————\n\n`;
    }
  });

  message += `\n✅ Follow advisory carefully.\n📞 Contact us if you need help.`;

  return message;
};
