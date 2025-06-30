import Crop from "../models/cropModel.js";
import cloudinary from "../config/cloudinaryConfig.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

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

    // Parse JSON fields if sent as strings
    const parseIfString = (data, fieldName) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch (err) {
        throw new SyntaxError(
          `Invalid JSON format in ${fieldName}: ${err.message}`
        );
      }
    };

    const parsedClimate = parseIfString(climate, "climate");
    const parsedVariety = parseIfString(variety, "variety");
    const parsedNursery = parseIfString(nursery, "nursery");
    const parsedSowing = parseIfString(sowing, "sowing");
    const parsedFertilizer = parseIfString(fertilizer, "fertilizer");
    const parsedSeed = parseIfString(seed, "seed");
    const parsedPestProtection = parseIfString(
      pestProtection,
      "pestProtection"
    );
    const parsedDiseaseProtection = parseIfString(
      diseaseProtection,
      "diseaseProtection"
    );

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

    // Validate pestProtection structure
    if (
      !Array.isArray(parsedPestProtection) ||
      !parsedPestProtection.length ||
      !parsedPestProtection.every(
        (pp) =>
          pp.pest &&
          pp.symptoms &&
          pp.controlMethods &&
          pp.controlMethods.organic &&
          pp.controlMethods.inorganic &&
          Array.isArray(pp.controlMethods.organic.preventive) &&
          pp.controlMethods.organic.preventive.length > 0 &&
          Array.isArray(pp.controlMethods.organic.curative) &&
          pp.controlMethods.organic.curative.length > 0 &&
          Array.isArray(pp.controlMethods.inorganic.preventive) &&
          pp.controlMethods.inorganic.preventive.length > 0 &&
          Array.isArray(pp.controlMethods.inorganic.curative) &&
          pp.controlMethods.inorganic.curative.length > 0
      )
    ) {
      nestedMissingFields.push(
        "pestProtection (must be a non-empty array with pest, symptoms, and non-empty controlMethods arrays)"
      );
    }

    // Validate diseaseProtection structure
    if (
      !Array.isArray(parsedDiseaseProtection) ||
      !parsedDiseaseProtection.length ||
      !parsedDiseaseProtection.every(
        (dp) =>
          dp.disease &&
          dp.symptoms &&
          dp.controlMethods &&
          dp.controlMethods.organic &&
          dp.controlMethods.inorganic &&
          Array.isArray(dp.controlMethods.organic.preventive) &&
          dp.controlMethods.organic.preventive.length > 0 &&
          Array.isArray(dp.controlMethods.organic.curative) &&
          dp.controlMethods.organic.curative.length > 0 &&
          Array.isArray(dp.controlMethods.inorganic.preventive) &&
          dp.controlMethods.inorganic.preventive.length > 0 &&
          Array.isArray(dp.controlMethods.inorganic.curative) &&
          dp.controlMethods.inorganic.curative.length > 0
      )
    ) {
      nestedMissingFields.push(
        "diseaseProtection (must be a non-empty array with disease, symptoms, and non-empty controlMethods arrays)"
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
      !req.files.cropImage ||
      !req.files.pestImages ||
      !req.files.diseaseImages
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Crop image, at least one pest image, and one disease image are required",
      });
    }

    // Process crop image
    const cropImage = req.files.cropImage[0]?.path;
    if (!cropImage) {
      return res.status(400).json({
        success: false,
        message: "Crop image is required",
      });
    }

    // Process pest images
    const pestImages = Array.isArray(req.files.pestImages)
      ? req.files.pestImages
      : [req.files.pestImages].filter(Boolean);

    if (!pestImages.length || pestImages.length > 5) {
      return res.status(400).json({
        success: false,
        message: `At least one and up to five pest images are required, got ${pestImages.length}`,
      });
    }

    // if (pestImages.length !== parsedPestProtection.length) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Mismatch in number of pest images: expected ${parsedPestProtection.length} pestProtection entries to match ${pestImages.length} pest images. Each pest entry must have one corresponding image.`,
    //   });
    // }

    const pestProtectionWithImages = parsedPestProtection.map(
      (pest, index) => ({
        ...pest,
        image: pestImages.map((item) => item.path),
      })
    );

    // Process disease images
    const diseaseImages = Array.isArray(req.files.diseaseImages)
      ? req.files.diseaseImages
      : [req.files.diseaseImages].filter(Boolean);

    if (!diseaseImages.length || diseaseImages.length > 5) {
      return res.status(400).json({
        success: false,
        message: `At least one and up to five disease images are required, got ${diseaseImages.length}`,
      });
    }

    // if (diseaseImages.length !== parsedDiseaseProtection.length) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Mismatch in number of disease images: expected ${parsedDiseaseProtection.length} diseaseProtection entries to match ${diseaseImages.length} disease images. Each disease entry must have one corresponding image.`,
    //   });
    // }

    const diseaseProtectionWithImages = parsedDiseaseProtection.map(
      (disease, index) => ({
        ...disease,
        image: diseaseImages.map((item) => item.path),
      })
    );

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
      ].filter((image) => image && image.filename);
      for (const image of images) {
        await cloudinary.uploader.destroy(image.filename).catch((err) => {
          console.error("Failed to delete image from Cloudinary:", err);
        });
      }
    }

    // Handle specific errors
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Multer error: ${error.message}`,
      });
    }

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

    if (error.message.includes("A variety of this crop already exists")) {
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
        message: error.message,
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
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "-createdAt";

    // Search query
    const search = req.query.search
      ? { cropName: { $regex: req.query.search, $options: "i" } }
      : {};

    // Fetch crops with pagination, sorting, and search
    const crops = await Crop.find(search)
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
