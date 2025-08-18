import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET_NAME;

export const getS3Url = (key) => {
  if (!key) {
    console.error("S3 key is undefined in getS3Url");
    return null;
  }
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const uploadFileToS3 = async (file, folder) => {
  if (!file || !file.path) {
    throw new Error("File path is missing from multer upload");
  }

  const fileContent = fs.readFileSync(file.path);
  const key = `${folder}/${Date.now()}-${file.originalname}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        ContentType: file.mimetype,
      })
    );
  } catch (err) {
    console.error(`Failed to upload file to S3: ${key}`, err);
    throw err;
  }

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return key;
};

export const deleteFileFromS3 = async (key) => {
  if (!key) {
    console.error("Attempted to delete undefined S3 key");
    return;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  } catch (err) {
    console.error(`Failed to delete S3 file ${key}:`, err);
    throw err;
  }
};
