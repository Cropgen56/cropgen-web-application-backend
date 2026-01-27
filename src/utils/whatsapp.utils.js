const TYPE_ICONS = {
  SPRAY: "🧴",
  FERTIGATION: "🌿",
  IRRIGATION: "🚿",
  WEATHER: "🌦️",
  CROP_RISK: "⚠️",
};

export function formatFarmAdvisoryMessage(advisories) {
  let message = `🌾 *Today’s Farm Advisory*\n\n`;

  advisories.forEach((item, index) => {
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

    if (index !== advisories.length - 1) {
      message += `\n——————————————\n\n`;
    }
  });

  message +=
    `\n✅ *Please follow today’s advisory carefully.*\n` +
    `📞 *For assistance, call:* +91 96659 35570`;

  return message;
}
