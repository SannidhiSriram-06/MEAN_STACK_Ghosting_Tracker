const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs/promises');
const path = require('path');

const isS3Enabled = process.env.S3_BUCKET_NAME && 
                     process.env.AWS_ACCESS_KEY_ID && 
                     process.env.AWS_SECRET_ACCESS_KEY;

let s3Client = null;

if (isS3Enabled) {
  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    console.log('AWS S3 Client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize AWS S3 Client:', error);
  }
} else {
  console.log('AWS S3 details missing from environment variables. Running in LOCAL STORAGE mode.');
}

/**
 * Uploads a resume file. If S3 is configured, uploads to S3.
 * Otherwise, saves to local disk in backend/uploads directory.
 */
async function uploadResume(file, userId) {
  const fileKey = `${userId}/${Date.now()}-${file.originalname}`;
  
  if (isS3Enabled && s3Client) {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype
    };
    
    await s3Client.send(new PutObjectCommand(params));
    return {
      storageType: 's3',
      s3Key: fileKey,
      fileName: file.originalname,
      location: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`
    };
  } else {
    // Local storage fallback
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true }); // recursive is idempotent — no existsSync needed
    
    const localFileName = `${Date.now()}-${file.originalname}`;
    const localFilePath = path.join(uploadDir, localFileName);
    
    // Write file from buffer asynchronously
    await fs.writeFile(localFilePath, file.buffer);
    
    return {
      storageType: 'local',
      localPath: localFilePath,
      fileName: file.originalname,
      location: `/uploads/${localFileName}`
    };
  }
}

module.exports = {
  uploadResume,
  isS3Enabled: () => isS3Enabled
};
