import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getBucket } from './client';

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await getS3Client().send(command);
}
