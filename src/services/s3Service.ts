// import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import fs from 'fs';

// // Function to get S3 client with validated credentials
// const getS3Client = (): S3Client => {
//   const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
//   const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
//   const region = process.env.AWS_REGION || 'us-east-1';

//   console.log(`AWS_ACCESS_KEY_ID exists: ${!!accessKeyId}`);
//   console.log(`AWS_SECRET_ACCESS_KEY exists: ${!!secretAccessKey}`);
//   console.log(`AWS_REGION: ${region}`);

//   if (!accessKeyId || !secretAccessKey) {
//     console.error('[S3] Missing AWS credentials in environment variables');
//     throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set');
//   }

//   return new S3Client({
//     region,
//     credentials: {
//       accessKeyId,
//       secretAccessKey,
//     },
//   });
// };

// export const uploadPdfToS3 = async (
//   localFilePath: string,
//   s3Key: string
// ): Promise<string | null> => {
//   try {
//     if (!fs.existsSync(localFilePath)) {
//       console.error(`[S3] File not found: ${localFilePath}`);
//       return null;
//     }

//     const bucket = process.env.AWS_S3_BUCKET;
//     if (!bucket) {
//       console.error('[S3] AWS_S3_BUCKET not set in environment');
//       return null;
//     }

//     const s3Client = getS3Client();
//     const fileStream = fs.createReadStream(localFilePath);
//     const fileSize = fs.statSync(localFilePath).size;

//     console.log(`[S3] Uploading to bucket: ${bucket}, key: ${s3Key}, size: ${fileSize} bytes`);

//     await s3Client.send(
//       new PutObjectCommand({
//         Bucket: bucket,
//         Key: s3Key,
//         Body: fileStream,
//         ContentType: 'application/pdf',
//         ContentLength: fileSize,
//       })
//     );

//     const publicUrl = `${process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`}/${s3Key}`;
//     console.log(`[S3] Uploaded successfully: ${s3Key} -> ${publicUrl}`);
//     return publicUrl;
//   } catch (error) {
//     console.error(`[S3] Upload failed for ${s3Key}:`, error);
//     return null;
//   }
// };

// export const deleteFromS3 = async (s3Key: string): Promise<boolean> => {
//   try {
//     const bucket = process.env.AWS_S3_BUCKET;
//     if (!bucket) {
//       console.error('[S3] AWS_S3_BUCKET not set in environment');
//       return false;
//     }

//     const s3Client = getS3Client();
//     await s3Client.send(
//       new DeleteObjectCommand({
//         Bucket: bucket,
//         Key: s3Key,
//       })
//     );
//     console.log(`[S3] Deleted: ${s3Key}`);
//     return true;
//   } catch (error) {
//     console.error(`[S3] Delete failed for ${s3Key}:`, error);
//     return false;
//   }
// };


import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Function to get S3 client with validated credentials
const getS3Client = (): S3Client => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log(`AWS_ACCESS_KEY_ID exists: ${!!accessKeyId}`);
  console.log(`AWS_SECRET_ACCESS_KEY exists: ${!!secretAccessKey}`);
  console.log(`AWS_REGION: ${region}`);

  if (!accessKeyId || !secretAccessKey) {
    console.error('[S3] Missing AWS credentials in environment variables');
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set');
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export const uploadPdfToS3 = async (
  localFilePath: string,
  s3Key: string
): Promise<string | null> => {
  try {
    if (!fs.existsSync(localFilePath)) {
      console.error(`[S3] File not found: ${localFilePath}`);
      return null;
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      console.error('[S3] AWS_S3_BUCKET not set in environment');
      return null;
    }

    const s3Client = getS3Client();
    const fileStream = fs.createReadStream(localFilePath);
    const fileSize = fs.statSync(localFilePath).size;

    console.log(`[S3] Uploading to bucket: ${bucket}, key: ${s3Key}, size: ${fileSize} bytes`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'application/pdf',
        ContentLength: fileSize,
        // Optional: Set to public-read if you want direct access
        // ACL: 'public-read',
      })
    );

    // Return the S3 key instead of trying to construct a public URL
    // We'll generate pre-signed URLs when needed
    console.log(`[S3] Uploaded successfully: ${s3Key}`);
    return s3Key; // Return the key, not the URL
  } catch (error) {
    console.error(`[S3] Upload failed for ${s3Key}:`, error);
    return null;
  }
};

/**
 * Generate a pre-signed URL for secure access to S3 objects
 * This URL will be valid for a specified duration (default: 1 hour)
 */
export const getPresignedUrl = async (
  s3Key: string,
  expiresIn: number = 3600 // 1 hour in seconds
): Promise<string | null> => {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      console.error('[S3] AWS_S3_BUCKET not set in environment');
      return null;
    }

    const s3Client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    // Fix for mismatched S3Client type in getSignedUrl
    // See: https://github.com/aws/aws-sdk-js-v3/issues/4886
    // Cast to "any" to ensure compatibility with getSignedUrl
    // It is safe as long as getS3Client() returns a correctly configured S3Client.
    const url = await getSignedUrl(s3Client as any, command, { expiresIn });

    console.log(`[S3] Generated pre-signed URL for: ${s3Key}`);
    return url;
  } catch (error) {
    console.error(`[S3] Failed to generate pre-signed URL for ${s3Key}:`, error as Error);
    return null;
  }
};

/**
 * Generate pre-signed URLs for multiple S3 keys at once
 */
export const getBulkPresignedUrls = async (
  s3Keys: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> => {
  const urlMap = new Map<string, string>();

  for (const key of s3Keys) {
    const url = await getPresignedUrl(key, expiresIn);
    if (url) {
      urlMap.set(key, url);
    }
  }

  return urlMap;
};

export const deleteFromS3 = async (s3Key: string): Promise<boolean> => {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      console.error('[S3] AWS_S3_BUCKET not set in environment');
      return false;
    }

    const s3Client = getS3Client();
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      })
    );
    console.log(`[S3] Deleted: ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`[S3] Delete failed for ${s3Key}:`, error);
    return false;
  }
};