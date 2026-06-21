import { NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireRole } from '@/lib/auth';
import { ok, err, handleRouteError } from '@/lib/api-response';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return err('No file provided');
    if (!ALLOWED_TYPES.includes(file.type))
      return err('Only JPEG, PNG, WebP, and AVIF are allowed');
    if (file.size > MAX_BYTES) return err('File must be under 5 MB');

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const key = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return ok({ url: `${PUBLIC_URL}/${key}` });
  } catch (e) {
    return handleRouteError(e);
  }
}
