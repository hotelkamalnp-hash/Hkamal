import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabaseAdminClient } from './security.ts';
import { listCollection, upsertCollectionItem, type MediaAssetRecord } from './db.ts';

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
]);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB
const SUPABASE_BUCKET_NAME = 'hotel-media';

let supabaseBucketEnsured = false;

export function getR2Config(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  isConfigured: boolean;
} {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    isConfigured: Boolean(accountId && accessKeyId && secretAccessKey && bucketName),
  };
}

export function getStorageProvider(): 'supabase' | 'r2' | 'local_disk' {
  const sbClient = getSupabaseAdminClient();
  if (sbClient) return 'supabase';

  const r2 = getR2Config();
  if (r2.isConfigured) return 'r2';

  return 'local_disk';
}

export async function getStorageStatus(): Promise<{
  provider: 'supabase' | 'r2' | 'local_disk';
  isConfigured: boolean;
  bucket: string;
  description: string;
}> {
  const provider = getStorageProvider();
  if (provider === 'supabase') {
    return {
      provider: 'supabase',
      isConfigured: true,
      bucket: SUPABASE_BUCKET_NAME,
      description: 'Supabase Object Storage (hotel-media bucket for hero and room media)',
    };
  }
  if (provider === 'r2') {
    const r2 = getR2Config();
    return {
      provider: 'r2',
      isConfigured: true,
      bucket: r2.bucketName,
      description: `Cloudflare R2 Object Storage (Bucket: ${r2.bucketName})`,
    };
  }
  return {
    provider: 'local_disk',
    isConfigured: true,
    bucket: 'local-uploads',
    description: 'Local File System Storage (/public/uploads) - Production fallback',
  };
}

async function ensureSupabaseBucket(): Promise<boolean> {
  const sbClient = getSupabaseAdminClient();
  if (!sbClient) return false;
  if (supabaseBucketEnsured) return true;

  try {
    const { data: buckets, error } = await sbClient.storage.listBuckets();
    if (error) {
      console.warn('[Storage] Could not list Supabase buckets:', error.message);
      return false;
    }
    const exists = buckets?.some((b) => b.name === SUPABASE_BUCKET_NAME);
    if (!exists) {
      const { error: createErr } = await sbClient.storage.createBucket(SUPABASE_BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_UPLOAD_BYTES,
      });
      if (createErr && !createErr.message.toLowerCase().includes('already exists')) {
        console.warn('[Storage] Could not create hotel-media bucket:', createErr.message);
        return false;
      }
    }
    supabaseBucketEnsured = true;
    return true;
  } catch (err: any) {
    console.warn('[Storage] ensureSupabaseBucket caught error:', err?.message || err);
    return false;
  }
}

function pathSafeFileName(input: string): string {
  const base = input.split(/[/\\]/).pop() || 'upload.jpg';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

/**
 * Direct server-side upload of a file buffer to active storage provider
 * (Supabase Storage -> Cloudflare R2 -> Local Disk).
 */
export async function uploadMediaBuffer(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  category?: string;
  uploadedBy: string;
}): Promise<
  | {
      ok: true;
      publicUrl: string;
      objectKey: string;
      provider: 'supabase' | 'r2' | 'local_disk';
      asset: MediaAssetRecord;
    }
  | { ok: false; status: number; message: string; code: string }
> {
  const contentType = String(params.contentType || '').trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(contentType)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_MIME_TYPE',
      message: `Unsupported file type "${contentType}". Allowed: JPEG, PNG, WebP, AVIF, SVG, PDF.`,
    };
  }

  const sizeBytes = params.buffer.length;
  if (sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_FILE_SIZE',
      message: `File size must be between 1 byte and ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }

  const safeCategory = String(params.category || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  const safeBaseName = pathSafeFileName(params.fileName || 'image.jpg');
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const objectKey = `${safeCategory}/${uniquePrefix}-${safeBaseName}`;

  const provider = getStorageProvider();

  // 1. Supabase Storage (Preferred)
  if (provider === 'supabase') {
    const sbClient = getSupabaseAdminClient()!;
    await ensureSupabaseBucket();

    const { error: uploadError } = await sbClient.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(objectKey, params.buffer, {
        contentType,
        upsert: true,
      });

    if (!uploadError) {
      const { data: pubData } = sbClient.storage
        .from(SUPABASE_BUCKET_NAME)
        .getPublicUrl(objectKey);

      const publicUrl = pubData?.publicUrl || `/api/media/download?key=${encodeURIComponent(objectKey)}`;
      const asset: MediaAssetRecord = {
        id: `media-${crypto.randomUUID()}`,
        objectKey,
        publicUrl,
        contentType,
        sizeBytes,
        category: safeCategory,
        uploadedBy: params.uploadedBy,
        createdAt: new Date().toISOString(),
      };

      upsertCollectionItem('mediaAssets', asset.id, asset);
      return { ok: true, publicUrl, objectKey, provider: 'supabase', asset };
    }
    console.warn('[Storage] Supabase storage upload failed, falling back to local disk:', uploadError.message);
  }

  // 2. Cloudflare R2 (If configured)
  if (provider === 'r2') {
    const r2 = getR2Config();
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: r2.bucketName,
          Key: `kamal-hotel/${objectKey}`,
          ContentType: contentType,
          Body: params.buffer,
        })
      );

      const publicUrl = r2.publicBaseUrl
        ? `${r2.publicBaseUrl}/kamal-hotel/${objectKey}`
        : `/api/media/download?key=${encodeURIComponent(`kamal-hotel/${objectKey}`)}`;

      const asset: MediaAssetRecord = {
        id: `media-${crypto.randomUUID()}`,
        objectKey: `kamal-hotel/${objectKey}`,
        publicUrl,
        contentType,
        sizeBytes,
        category: safeCategory,
        uploadedBy: params.uploadedBy,
        createdAt: new Date().toISOString(),
      };

      upsertCollectionItem('mediaAssets', asset.id, asset);
      return { ok: true, publicUrl, objectKey: asset.objectKey, provider: 'r2', asset };
    } catch (err: any) {
      console.warn('[Storage] R2 upload failed, falling back to local disk:', err?.message || err);
    }
  }

  // 3. Local Disk Storage Fallback (Guaranteed to work without external network)
  try {
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', safeCategory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFileName = `${uniquePrefix}-${safeBaseName}`;
    const localPath = path.join(uploadDir, localFileName);
    fs.writeFileSync(localPath, params.buffer);

    const publicUrl = `/uploads/${safeCategory}/${localFileName}`;
    const asset: MediaAssetRecord = {
      id: `media-${crypto.randomUUID()}`,
      objectKey: `${safeCategory}/${localFileName}`,
      publicUrl,
      contentType,
      sizeBytes,
      category: safeCategory,
      uploadedBy: params.uploadedBy,
      createdAt: new Date().toISOString(),
    };

    upsertCollectionItem('mediaAssets', asset.id, asset);
    return { ok: true, publicUrl, objectKey: asset.objectKey, provider: 'local_disk', asset };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      code: 'STORAGE_WRITE_FAILED',
      message: `Failed to persist media asset to storage: ${err?.message || 'I/O error'}`,
    };
  }
}

/**
 * Generates presigned upload URL or provides direct-upload instruction.
 */
export async function generatePresignedUploadUrl(params: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category?: string;
  uploadedBy: string;
}): Promise<
  | {
      ok: true;
      uploadUrl: string;
      objectKey: string;
      publicUrl: string;
      expiresInSeconds: number;
      provider: 'supabase' | 'r2' | 'direct_server';
      asset?: MediaAssetRecord;
    }
  | { ok: false; status: number; message: string; code: string }
> {
  const contentType = String(params.contentType || '').trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(contentType)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_MIME_TYPE',
      message: `Unsupported file type "${contentType}". Allowed: JPEG, PNG, WebP, AVIF, SVG, PDF.`,
    };
  }

  const sizeBytes = Number(params.sizeBytes || 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_FILE_SIZE',
      message: `File size must be between 1 byte and ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }

  const safeCategory = String(params.category || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  const safeBaseName = pathSafeFileName(params.fileName || 'upload.jpg');
  const objectKey = `${safeCategory}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName}`;

  const provider = getStorageProvider();

  // Supabase Storage presigned URL
  if (provider === 'supabase') {
    const sbClient = getSupabaseAdminClient()!;
    await ensureSupabaseBucket();

    const { data: signedData, error: signErr } = await sbClient.storage
      .from(SUPABASE_BUCKET_NAME)
      .createSignedUploadUrl(objectKey);

    if (!signErr && signedData?.signedUrl) {
      const { data: pubData } = sbClient.storage
        .from(SUPABASE_BUCKET_NAME)
        .getPublicUrl(objectKey);

      const publicUrl = pubData?.publicUrl || `/api/media/download?key=${encodeURIComponent(objectKey)}`;
      return {
        ok: true,
        uploadUrl: signedData.signedUrl,
        objectKey,
        publicUrl,
        expiresInSeconds: 300,
        provider: 'supabase',
      };
    }
  }

  // Cloudflare R2 Presigned S3 URL
  if (provider === 'r2') {
    const cfg = getR2Config();
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: `kamal-hotel/${objectKey}`,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });

    const expiresInSeconds = 300;
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    const publicUrl = cfg.publicBaseUrl
      ? `${cfg.publicBaseUrl}/kamal-hotel/${objectKey}`
      : `/api/media/download?key=${encodeURIComponent(`kamal-hotel/${objectKey}`)}`;

    return {
      ok: true,
      uploadUrl,
      objectKey: `kamal-hotel/${objectKey}`,
      publicUrl,
      expiresInSeconds,
      provider: 'r2',
    };
  }

  // If neither Supabase Storage nor R2 is configured:
  return {
    ok: false,
    status: 503,
    code: 'R2_NOT_CONFIGURED',
    message:
      'Cloudflare R2 or Supabase credentials are not configured on the server for presigned uploads. Use /api/media/upload-direct for local/direct storage.',
  };
}

export async function generatePresignedDownloadUrl(objectKey: string): Promise<
  | { ok: true; downloadUrl: string; expiresInSeconds: number }
  | { ok: false; status: number; message: string; code: string }
> {
  const provider = getStorageProvider();

  if (provider === 'supabase') {
    const sbClient = getSupabaseAdminClient()!;
    const cleanKey = objectKey.replace(/^hotel-media\//, '');
    const { data: signed, error } = await sbClient.storage
      .from(SUPABASE_BUCKET_NAME)
      .createSignedUrl(cleanKey, 600);

    if (!error && signed?.signedUrl) {
      return { ok: true, downloadUrl: signed.signedUrl, expiresInSeconds: 600 };
    }
  }

  if (provider === 'r2') {
    const cfg = getR2Config();
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });

    const command = new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    return { ok: true, downloadUrl, expiresInSeconds: 600 };
  }

  // Local disk
  const localRelative = objectKey.startsWith('/') ? objectKey : `/${objectKey}`;
  return { ok: true, downloadUrl: `/uploads${localRelative}`, expiresInSeconds: 600 };
}

export function listMediaAssets(): MediaAssetRecord[] {
  return listCollection<MediaAssetRecord>('mediaAssets');
}
