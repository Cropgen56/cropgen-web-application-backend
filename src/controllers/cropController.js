import Crop from "../models/cropModel.js";
import cloudinary from "../config/cloudinaryConfig.js";
import multer from "multer";
import { getS3Url, deleteFileFromS3 } from "../utils/s3.js";

// create the crop information
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
      !req.files.cropImage?.length ||
      !req.files.pestImages?.length ||
      !req.files.diseaseImages?.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Crop image, at least one pest image, and one disease image are required",
      });
    }

    // Process crop image (convert S3 key to full URL)
    const cropImage = req.files.cropImage[0]?.key
      ? getS3Url(req.files.cropImage[0].key)
      : null;
    if (!cropImage) {
      return res.status(400).json({
        success: false,
        message: "Crop image is required",
      });
    }

    // Group pest images by pest index (use S3 keys converted to URLs)
    const pestImagesGrouped = {};
    req.files.pestImages.forEach((file) => {
      const match = file.fieldname.match(/pestImages\[(\d+)\]\[\d+\]/);
      if (match) {
        const pestIndex = parseInt(match[1], 10);
        if (!pestImagesGrouped[pestIndex]) {
          pestImagesGrouped[pestIndex] = [];
        }
        pestImagesGrouped[pestIndex].push(getS3Url(file.key));
      }
    });

    // Group disease images by disease index (use S3 keys converted to URLs)
    const diseaseImagesGrouped = {};
    req.files.diseaseImages.forEach((file) => {
      const match = file.fieldname.match(/diseaseImages\[(\d+)\]\[\d+\]/);
      if (match) {
        const diseaseIndex = parseInt(match[1], 10);
        if (!diseaseImagesGrouped[diseaseIndex]) {
          diseaseImagesGrouped[diseaseIndex] = [];
        }
        diseaseImagesGrouped[diseaseIndex].push(getS3Url(file.key));
      }
    });

    // Validate pest images
    for (let i = 0; i < parsedPestProtection.length; i++) {
      const images = pestImagesGrouped[i] || [];
      if (images.length < 1) {
        return res.status(400).json({
          success: false,
          message: `Missing image for pest at index ${i}`,
        });
      }
      if (images.length > 5) {
        return res.status(400).json({
          success: false,
          message: `Too many images for pest at index ${i}: maximum 5 allowed`,
        });
      }
    }

    // Validate disease images
    for (let i = 0; i < parsedDiseaseProtection.length; i++) {
      const images = diseaseImagesGrouped[i] || [];
      if (images.length < 1) {
        return res.status(400).json({
          success: false,
          message: `Missing image for disease at index ${i}`,
        });
      }
      if (images.length > 5) {
        return res.status(400).json({
          success: false,
          message: `Too many images for disease at index ${i}: maximum 5 allowed`,
        });
      }
    }

    // Check for invalid indices
    const pestIndices = Object.keys(pestImagesGrouped).map(Number);
    const invalidPestIndices = pestIndices.filter(
      (index) => index >= parsedPestProtection.length || index < 0
    );
    if (invalidPestIndices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid pest indices in images: ${invalidPestIndices.join(
          ", "
        )}`,
      });
    }

    const diseaseIndices = Object.keys(diseaseImagesGrouped).map(Number);
    const invalidDiseaseIndices = diseaseIndices.filter(
      (index) => index >= parsedDiseaseProtection.length || index < 0
    );
    if (invalidDiseaseIndices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid disease indices in images: ${invalidDiseaseIndices.join(
          ", "
        )}`,
      });
    }

    // Assign grouped images to pest and disease entries (using S3 URLs)
    const pestProtectionWithImages = parsedPestProtection.map(
      (pest, index) => ({
        ...pest,
        image: pestImagesGrouped[index] || [],
      })
    );

    const diseaseProtectionWithImages = parsedDiseaseProtection.map(
      (disease, index) => ({
        ...disease,
        image: diseaseImagesGrouped[index] || [],
      })
    );

    // Check for duplicate crop name
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

    return res.status(201).json({
      success: true,
      data: {
        ...savedCrop.toJSON(),
        varietyCount: savedCrop.varietyCount,
      },
      message: "Crop created successfully",
    });
  } catch (error) {
    // Clean up uploaded images on S3 if error occurs
    if (req.files) {
      const images = [
        ...(req.files.cropImage || []),
        ...(req.files.pestImages || []),
        ...(req.files.diseaseImages || []),
      ].filter((image) => image && image.key);

      for (const image of images) {
        await deleteFileFromS3(image.key).catch((err) => {
          console.error("Failed to delete image from S3:", err);
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

    console.error("Error in createCrop:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating crop",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// update the crop information
export const updateCrop = async (req, res) => {
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
      removeCropImage,
    } = req.body;

    const parseIfString = (data, fieldName) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch (err) {
        throw new SyntaxError(
          `Invalid JSON format in ${fieldName}: ${err.message}`
        );
      }
    };

    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res
        .status(404)
        .json({ success: false, message: "Crop not found" });
    }

    // Store old crop image for cleanup (full URL)
    const oldCropImage = crop.cropImage;

    // Update basic fields
    if (cropName) {
      const existingCrop = await Crop.findOne({
        cropName: cropName.toLowerCase(),
        _id: { $ne: crop._id },
      });
      if (existingCrop) {
        return res.status(409).json({
          success: false,
          message: "A crop with this name already exists",
        });
      }
      crop.cropName = cropName.toLowerCase();
    }
    if (generalInfo) crop.generalInfo = generalInfo;
    if (climate) crop.climate = parseIfString(climate, "climate");
    if (soil) crop.soil = soil;
    if (variety) crop.variety = parseIfString(variety, "variety");
    if (nursery) crop.nursery = parseIfString(nursery, "nursery");
    if (sowing) crop.sowing = parseIfString(sowing, "sowing");
    if (fertilizer) crop.fertilizer = parseIfString(fertilizer, "fertilizer");
    if (landPreparation) crop.landPreparation = landPreparation;
    if (seed) crop.seed = parseIfString(seed, "seed");
    if (weedControl) crop.weedControl = weedControl;
    if (irrigation) crop.irrigation = irrigation;
    if (harvesting) crop.harvesting = harvesting;
    if (postHarvesting) crop.postHarvesting = postHarvesting;

    // Extract S3 base URL for parsing keys
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const baseUrl = `https://${bucketName}.s3.${region}.amazonaws.com/`;

    // Handle crop image
    let imagesToDelete = [];
    if (removeCropImage === "true") {
      if (!req.files?.cropImage?.[0]?.url) {
        return res.status(400).json({
          success: false,
          message: "A new crop image is required if removing the existing one",
        });
      }
      if (oldCropImage) {
        imagesToDelete.push(oldCropImage);
      }
      crop.cropImage = req.files.cropImage[0].url;
    } else if (req.files?.cropImage?.[0]?.url) {
      if (oldCropImage) {
        imagesToDelete.push(oldCropImage);
      }
      crop.cropImage = req.files.cropImage[0].url;
    }

    // Handle pestProtection
    if (pestProtection) {
      const parsedPestProtection = parseIfString(
        pestProtection,
        "pestProtection"
      );
      const oldPestImages = crop.pestProtection.map((p) => p.image).flat();
      const newPestImagesGrouped = {};
      if (req.files?.newPestImages) {
        req.files.newPestImages.forEach((file) => {
          const match = file.fieldname.match(/newPestImages\[(\d+)\]\[\d+\]/);
          if (match) {
            const pestIndex = parseInt(match[1], 10);
            if (!newPestImagesGrouped[pestIndex]) {
              newPestImagesGrouped[pestIndex] = [];
            }
            newPestImagesGrouped[pestIndex].push(file.url);
          }
        });
      }
      const pestProtectionWithImages = parsedPestProtection.map(
        (pest, index) => {
          const newImages = newPestImagesGrouped[index] || [];
          const existingImages = pest.image || [];
          const combinedImages = [...existingImages, ...newImages];
          if (combinedImages.length < 1 || combinedImages.length > 5) {
            throw new Error(`Pest at index ${index} must have 1-5 images`);
          }
          return { ...pest, image: combinedImages };
        }
      );
      crop.pestProtection = pestProtectionWithImages;

      // Mark old pest images for deletion
      const newPestImages = pestProtectionWithImages.map((p) => p.image).flat();
      imagesToDelete.push(
        ...oldPestImages.filter((img) => !newPestImages.includes(img))
      );
    }

    // Handle diseaseProtection
    if (diseaseProtection) {
      const parsedDiseaseProtection = parseIfString(
        diseaseProtection,
        "diseaseProtection"
      );
      const oldDiseaseImages = crop.diseaseProtection
        .map((d) => d.image)
        .flat();
      const newDiseaseImagesGrouped = {};
      if (req.files?.newDiseaseImages) {
        req.files.newDiseaseImages.forEach((file) => {
          const match = file.fieldname.match(
            /newDiseaseImages\[(\d+)\]\[\d+\]/
          );
          if (match) {
            const diseaseIndex = parseInt(match[1], 10);
            if (!newDiseaseImagesGrouped[diseaseIndex]) {
              newDiseaseImagesGrouped[diseaseIndex] = [];
            }
            newDiseaseImagesGrouped[diseaseIndex].push(file.url);
          }
        });
      }
      const diseaseProtectionWithImages = parsedDiseaseProtection.map(
        (disease, index) => {
          const newImages = newDiseaseImagesGrouped[index] || [];
          const existingImages = disease.image || [];
          const combinedImages = [...existingImages, ...newImages];
          if (combinedImages.length < 1 || combinedImages.length > 5) {
            throw new Error(`Disease at index ${index} must have 1-5 images`);
          }
          return { ...disease, image: combinedImages };
        }
      );
      crop.diseaseProtection = diseaseProtectionWithImages;

      // Mark old disease images for deletion
      const newDiseaseImages = diseaseProtectionWithImages
        .map((d) => d.image)
        .flat();
      imagesToDelete.push(
        ...oldDiseaseImages.filter((img) => !newDiseaseImages.includes(img))
      );
    }

    // Save the updated crop
    const savedCrop = await crop.save();

    // Clean up old images from S3
    for (const image of imagesToDelete) {
      if (!image) {
        console.warn("Skipping deletion of undefined image URL");
        continue;
      }
      const key = image.startsWith(baseUrl)
        ? image.replace(baseUrl, "")
        : image;
      if (key) {
        await deleteFileFromS3(key).catch((err) => {
          console.error(`Failed to delete image from S3: ${key}`, err);
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...savedCrop.toJSON(),
        varietyCount: savedCrop.varietyCount,
      },
      message: "Crop updated successfully",
    });
  } catch (error) {
    // Clean up new images from S3 on error
    if (req.files) {
      const images = [
        ...(req.files.cropImage || []),
        ...(req.files.newPestImages || []),
        ...(req.files.newDiseaseImages || []),
      ].filter((image) => image && image.key);

      for (const image of images) {
        await deleteFileFromS3(image.key).catch((err) => {
          console.error(`Failed to delete image from S3: ${image.key}`, err);
        });
      }
    }

    console.error("Error in updateCrop:", error);
    if (error instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message.includes("must have 1-5 images")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(", ")}`,
      });
    }
    if (
      error.message.includes("AccessDenied") ||
      error.message.includes("AccessControlListNotSupported")
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied to S3 bucket. Check bucket permissions or IAM credentials.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while updating crop",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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

    // Extract S3 keys from image URLs
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const baseUrl = `https://${bucketName}.s3.${region}.amazonaws.com/`;

    const imagesToDelete = [
      crop.cropImage, // Single crop image URL
      ...crop.pestProtection.flatMap((pest) => pest.image || []),
      ...crop.diseaseProtection.flatMap((disease) => disease.image || []),
    ].filter(Boolean);

    // Delete images from S3
    for (const imageUrl of imagesToDelete) {
      // Extract S3 key from URL (e.g., crops/123456-image.jpg)
      const key = imageUrl.replace(baseUrl, "");
      await deleteFileFromS3(key).catch((err) => {
        console.error(`Failed to delete image from S3: ${key}`, err);
      });
    }

    // Delete the crop document
    await Crop.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Crop and associated images deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteCropById:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid crop ID",
      });
    }
    if (error.message.includes("AccessDenied")) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied to S3 bucket. Check bucket permissions or IAM credentials.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while deleting crop",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
