import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET_NAME;

export const uploadFileToS3 = async (file, folder) => {
  if (!file || !file.path) {
    throw new Error("File path is missing from multer upload");
  }

  const fileContent = fs.readFileSync(file.path);
  const key = `${folder}/${Date.now()}-${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype,
    })
  );

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return key;
};
