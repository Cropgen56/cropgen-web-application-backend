import Crop from "../models/cropModel.js";
import cloudinary from "../config/cloudinaryConfig.js";

// create a new crop
export const createCrop = async (req, res) => {
  try {
    const {
      cropName,
      generalInfo,
      climate,
      soil,
      variety,
      nursery,
      sowing,
      fertilizer,
      landPreparation,
      seed,
      pestProtection,
      diseaseProtection,
      weedControl,
      irrigation,
      harvesting,
      postHarvesting,
    } = req.body;

    // Parse JSON fields if sent as strings (common in multipart/form-data)
    const parseIfString = (data) =>
      typeof data === "string" ? JSON.parse(data) : data;

    const parsedClimate = parseIfString(climate);
    const parsedVariety = parseIfString(variety);
    const parsedNursery = parseIfString(nursery);
    const parsedSowing = parseIfString(sowing);
    const parsedFertilizer = parseIfString(fertilizer);
    const parsedSeed = parseIfString(seed);
    const parsedPestProtection = parseIfString(pestProtection);
    const parsedDiseaseProtection = parseIfString(diseaseProtection);

    // Basic validation for required top-level fields
    const requiredFields = {
      cropName,
      generalInfo,
      climate: parsedClimate,
      soil,
      variety: parsedVariety,
      sowing: parsedSowing,
      fertilizer: parsedFertilizer,
      landPreparation,
      seed: parsedSeed,
      pestProtection: parsedPestProtection,
      diseaseProtection: parsedDiseaseProtection,
      weedControl,
      irrigation,
      harvesting,
      postHarvesting,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate nested required fields
    const nestedMissingFields = [];

    if (!parsedClimate.temperature)
      nestedMissingFields.push("climate.temperature");
    if (!parsedClimate.sowingTemperature)
      nestedMissingFields.push("climate.sowingTemperature");
    if (!parsedClimate.rainfall) nestedMissingFields.push("climate.rainfall");
    if (!parsedClimate.harvestingTemperature)
      nestedMissingFields.push("climate.harvestingTemperature");
    if (
      !Array.isArray(parsedVariety) ||
      !parsedVariety.every(
        (v) =>
          v.name && v.description && v.plantHeight && v.maturityDays && v.yield
      )
    ) {
      nestedMissingFields.push(
        "variety (must include name, description, plantHeight, maturityDays, yield)"
      );
    }
    if (!parsedSowing.time) nestedMissingFields.push("sowing.time");
    if (!parsedSowing.spacing) nestedMissingFields.push("sowing.spacing");
    if (!parsedSowing.method) nestedMissingFields.push("sowing.method");
    if (!parsedSowing.depth) nestedMissingFields.push("sowing.depth");
    if (!parsedSowing.seedRate) nestedMissingFields.push("sowing.seedRate");
    if (!parsedFertilizer.nutrients?.nitrogen)
      nestedMissingFields.push("fertilizer.nutrients.nitrogen");
    if (!parsedFertilizer.nutrients?.phosphorus)
      nestedMissingFields.push("fertilizer.nutrients.phosphorus");
    if (!parsedFertilizer.nutrients?.potash)
      nestedMissingFields.push("fertilizer.nutrients.potash");
    if (
      !parsedFertilizer.fertilizers?.length ||
      !parsedFertilizer.fertilizers.every((f) => f.name && f.dosage)
    ) {
      nestedMissingFields.push(
        "fertilizer.fertilizers (must include name and dosage)"
      );
    }
    if (!parsedFertilizer.applicationMethods)
      nestedMissingFields.push("fertilizer.applicationMethods");
    if (!parsedSeed.seedRate) nestedMissingFields.push("seed.seedRate");
    if (!parsedSeed.seedTreatment?.method)
      nestedMissingFields.push("seed.seedTreatment.method");

    // Validate pestProtection structure (array of objects, excluding image field)
    if (
      !Array.isArray(parsedPestProtection) ||
      !parsedPestProtection.every(
        (pp) =>
          pp.pest &&
          pp.symptoms &&
          pp.controlMethods &&
          pp.controlMethods.organic &&
          pp.controlMethods.inorganic &&
          Array.isArray(pp.controlMethods.organic.preventive) &&
          Array.isArray(pp.controlMethods.organic.curative) &&
          Array.isArray(pp.controlMethods.inorganic.preventive) &&
          Array.isArray(pp.controlMethods.inorganic.curative)
      )
    ) {
      nestedMissingFields.push(
        "pestProtection (must be an array with pest, symptoms, and valid controlMethods)"
      );
    }

    // Validate diseaseProtection structure (excluding image field)
    if (
      !Array.isArray(parsedDiseaseProtection) ||
      !parsedDiseaseProtection.every(
        (dp) =>
          dp.disease &&
          dp.symptoms &&
          dp.controlMethods &&
          dp.controlMethods.organic &&
          dp.controlMethods.inorganic &&
          Array.isArray(dp.controlMethods.organic.preventive) &&
          Array.isArray(dp.controlMethods.organic.curative) &&
          Array.isArray(dp.controlMethods.inorganic.preventive) &&
          Array.isArray(dp.controlMethods.inorganic.curative)
      )
    ) {
      nestedMissingFields.push(
        "diseaseProtection (must include disease, symptoms, and valid controlMethods)"
      );
    }

    if (nestedMissingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid required fields: ${nestedMissingFields.join(
          ", "
        )}`,
      });
    }

    // Validate image uploads
    if (
      !req.files ||
      !req.files.pestImages ||
      !req.files.diseaseImages ||
      !req.files.cropImage
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Crop image, at least one pest image, and one disease image are required",
      });
    }

    // Process crop image
    const cropImage = req.files.cropImage[0].path; // Single crop image

    // Process pest image URLs from Cloudinary
    const pestImages = Array.isArray(req.files.pestImages)
      ? req.files.pestImages
      : [req.files.pestImages];
    const pestProtectionWithImages = parsedPestProtection.map((pest, index) => {
      if (index >= pestImages.length) {
        throw new Error("Insufficient pest images provided");
      }
      return { ...pest, image: [pestImages[index].path] };
    });

    if (pestImages.length !== parsedPestProtection.length) {
      throw new Error("Mismatch in number of pest images provided");
    }

    // Process disease images and assign to each disease entry
    const diseaseImages = Array.isArray(req.files.diseaseImages)
      ? req.files.diseaseImages
      : [req.files.diseaseImages];
    const diseaseProtectionWithImages = parsedDiseaseProtection.map(
      (disease, index) => {
        if (index >= diseaseImages.length) {
          throw new Error("Insufficient disease images provided");
        }
        return { ...disease, image: [diseaseImages[index].path] };
      }
    );

    if (diseaseImages.length !== parsedDiseaseProtection.length) {
      throw new Error("Mismatch in number of disease images provided");
    }

    // Check for duplicate crop name (case-insensitive)
    const existingCrop = await Crop.findOne({
      cropName: cropName.toLowerCase(),
    });
    if (existingCrop) {
      return res.status(409).json({
        success: false,
        message: "A crop with this name already exists",
      });
    }

    // Create new crop document
    const crop = new Crop({
      cropName: cropName.toLowerCase(),
      cropImage,
      generalInfo,
      climate: parsedClimate,
      soil,
      variety: parsedVariety,
      nursery: parsedNursery,
      sowing: parsedSowing,
      fertilizer: parsedFertilizer,
      landPreparation,
      seed: parsedSeed,
      pestProtection: pestProtectionWithImages,
      diseaseProtection: diseaseProtectionWithImages,
      weedControl,
      irrigation,
      harvesting,
      postHarvesting,
    });

    // Save crop to database
    const savedCrop = await crop.save();

    // Return success response with virtual field
    return res.status(201).json({
      success: true,
      data: {
        ...savedCrop.toJSON(),
        varietyCount: savedCrop.varietyCount,
      },
      message: "Crop created successfully",
    });
  } catch (error) {
    // Clean up uploaded images on error
    if (req.files) {
      const images = [
        ...(req.files.cropImage || []),
        ...(Array.isArray(req.files.pestImages)
          ? req.files.pestImages
          : [req.files.pestImages] || []),
        ...(Array.isArray(req.files.diseaseImages)
          ? req.files.diseaseImages
          : [req.files.diseaseImages] || []),
      ].filter(Boolean);
      for (const image of images) {
        await cloudinary.uploader.destroy(image.public_id).catch((err) => {
          console.error("Failed to delete image from Cloudinary:", err);
        });
      }
    }

    // Handle specific errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(", ")}`,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A crop with this name already exists",
      });
    }

    if (error.message.includes("Crop with this variety already exists")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes("Only JPEG and PNG images are allowed") ||
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format in request body",
      });
    }

    // Generic server error
    console.error("Error in createCrop:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating crop",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get all crops deteails
export const getAllCrops = async (req, res) => {
  try {
    // Query parameters for pagination and sorting
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "-createdAt";

    // Search query
    const search = req.query.search
      ? { cropName: { $regex: req.query.search, $options: "i" } }
      : {};

    // Fetch crops with pagination, sorting, and search
    const crops = await Crop.find(search)
      .select("cropName generalInfo climate soil varietyCount")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCrops = await Crop.countDocuments(search);

    return res.status(200).json({
      success: true,
      data: crops,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCrops / limit),
        totalCrops,
        limit,
      },
      message: "Crops retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getAllCrops:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving crops",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get single crop by ID
export const getCropById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID format",
      });
    }

    const crop = await Crop.findById(id).lean();

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...crop,
        varietyCount: crop.variety.length,
      },
      message: "Crop retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getCropById:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving crop",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// get list of crop with name image and id
export const getCropNamesAndImages = async (req, res) => {
  try {
    // Fetch only cropName, cropImage, and _id fields
    const crops = await Crop.find()
      .select("cropName cropImage _id")
      .lean()
      .exec();

    if (!crops || crops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No crops found",
      });
    }

    return res.status(200).json({
      success: true,
      data: crops,
      message: "Crops retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getCropNamesAndImages:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving crops",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Delete crop by ID
export const deleteCropById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID format",
      });
    }

    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found",
      });
    }

    // Delete associated images from Cloudinary
    const imagesToDelete = [
      ...crop.pestProtection.flatMap((pest) => pest.image || []),
      ...crop.diseaseProtection.flatMap((disease) => disease.image || []),
    ].filter(Boolean);

    for (const imageUrl of imagesToDelete) {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId).catch((err) => {
        console.error("Failed to delete image from Cloudinary:", err);
      });
    }

    // Delete the crop document
    await Crop.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Crop deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteCropById:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while deleting crop",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
