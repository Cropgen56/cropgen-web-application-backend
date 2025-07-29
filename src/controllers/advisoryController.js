import moment from "moment";
import Joi from "joi";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// validation schema
const advisorySchema = Joi.object({
  crop_name: Joi.string().required(),
  sowing_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  bbch_stage: Joi.string().required(),
  variety: Joi.string().required(),
  irrigation_type: Joi.string().required(),
  type_of_farming: Joi.string().required(),
  humidity: Joi.number().integer().required(),
  temp: Joi.number().integer().required(),
  rain: Joi.number().integer().required(),
  soil_temp: Joi.number().integer().required(),
  soil_moisture: Joi.number().integer().required(),
  language: Joi.string()
    .valid("en", "hi", "mr", "gu", "ta", "ur", "bn", "fr", "es", "de")
    .required(),
});

export const generateAdvisory = async (req, res) => {
  try {
    const { error, value: data } = advisorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ detail: error.details[0].message });
    }

    const sowingDate = moment(data.sowing_date, "YYYY-MM-DD");
    if (!sowingDate.isValid()) {
      return res.status(400).json({ detail: "Invalid sowing_date format" });
    }
    const sowingDateFormatted = sowingDate.format("MMMM D, YYYY");

    const prompt = `
You are an expert multilingual agronomist. Write a detailed 4-day crop advisory in language: ${data.language}.
Use **simple, farmer-friendly terms**. Each day must follow this structure **EXACTLY** and be easy to read:

DAY 1  
Disease Pest - [Name, visible symptoms farmers can observe]  
Spray - [[chemical name, dosage per litre, water type, how to apply]]  
Fertigation - [Nutrient or fertilizer, dose like "250 g per 100 L of water", method of application]  
Water - [How much water to give and method]  
Monitoring - [What farmer should look for in plant, leaves, soil]

DAY 2  
...

DAY 3  
...

DAY 4  
...

Crop Details:  
Crop: ${data.crop_name}  
Variety: ${data.variety}  
Sowing Date: ${sowingDateFormatted}  
BBCH Stage: ${data.bbch_stage}  
Irrigation: ${data.irrigation_type}  
Farming Type: ${data.type_of_farming}  
Temperature: ${data.temp}°C  
Humidity: ${data.humidity}%  
Rain: ${data.rain} mm  
Soil Temp: ${data.soil_temp}°C  
Soil Moisture: ${data.soil_moisture}%

Use clear, structured headers as shown above (e.g., "DAY 1"). Write only in the target language: ${data.language}. Keep each day under 90 words. Focus on accuracy.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a multilingual agronomy expert creating accurate, structured, and localized crop advisories.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });
    if (response.choices && response.choices.length > 0) {
      const advisoryText = response.choices[0].message.content.trim();

      const daySections = advisoryText.split(/DAY \d/).slice(1);
      const dayMatches = advisoryText.match(/DAY \d/g) || [];

      const dayObjects = daySections.map((section, idx) => {
        // Split by label (Disease Pest, Spray, etc.)
        const disease =
          section
            .match(/Disease Pest - (.*)/)?.[1]
            ?.trim()
            .split("Spray -")[0]
            ?.trim() || "";
        const spray = section.match(/Spray - \[(.*)\]/)?.[1]?.trim() || "";
        const fertigation =
          section.match(/Fertigation - \[(.*)\]/)?.[1]?.trim() || "";
        const water = section.match(/Water - \[(.*)\]/)?.[1]?.trim() || "";
        const monitoring =
          section.match(/Monitoring - \[(.*)\]/)?.[1]?.trim() || "";

        return {
          day: dayMatches[idx]?.replace("DAY ", "") || String(idx + 1),
          disease_pest: disease,
          spray: spray,
          fertigation: fertigation,
          water: water,
          monitoring: monitoring,
        };
      });
      // --- End: Split advisoryText into array of objects for 4 days ---

      res.json({ advisory: dayObjects });
    } else {
      throw new Error("Invalid response from OpenAI API");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: error.message });
  }
};
