import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  endpoint: string;
}

export function getR2Config(): R2Config {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY || "";
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY || "";
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "seikoyt-media";
  const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || process.env.R2_CUSTOM_DOMAIN || "").trim();

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl.replace(/\/$/, ""),
    endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "",
  };
}

export function createR2Client() {
  const config = getR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return { client: null, config };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, config };
}

export async function getPresignedR2Url(
  originalFilename: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<{ presignedUrl: string; fileUrl: string; key: string; bucket: string }> {
  const { client, config } = createR2Client();

  if (!client) {
    throw new Error(
      "Cloudflare R2 no está configurado. Por favor define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET_NAME en el archivo .env"
    );
  }

  const cleanName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const key = `${folder}/${timestamp}-${randomStr}-${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  let fileUrl = "";
  if (config.publicUrl) {
    fileUrl = `${config.publicUrl}/${key}`;
  } else {
    fileUrl = `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`;
  }

  return {
    presignedUrl,
    fileUrl,
    key,
    bucket: config.bucketName,
  };
}

export async function uploadToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<{ url: string; key: string; bucket: string }> {
  const { client, config } = createR2Client();

  if (!client) {
    throw new Error(
      "Cloudflare R2 no está configurado. Por favor define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET_NAME en el archivo .env"
    );
  }

  const cleanName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const key = `${folder}/${timestamp}-${randomStr}-${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType || "application/octet-stream",
  });

  await client.send(command);

  let fileUrl = "";
  if (config.publicUrl) {
    fileUrl = `${config.publicUrl}/${key}`;
  } else {
    fileUrl = `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`;
  }

  return {
    url: fileUrl,
    key,
    bucket: config.bucketName,
  };
}
