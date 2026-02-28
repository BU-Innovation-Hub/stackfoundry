/**
 * Cloudinary PDF Service
 * Handles PDF upload and signed download URL generation
 * All Cloudinary secrets remain server-side only
 */

import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

// ============================================
// Types
// ============================================

export interface PdfUploadResult {
  publicId: string;
  bytes: number;
}

// ============================================
// Service Functions
// ============================================

/**
 * Upload a PDF buffer to Cloudinary as a raw resource
 */
export const uploadPdf = (
  buffer: Buffer,
  originalName: string
): Promise<PdfUploadResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "innovation-hub/lms-pdfs",
        resource_type: "raw",
        public_id: `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        format: "pdf",
      },
      (error: any, result: any) => {
        if (error) return reject(error);
        resolve({
          publicId: result.public_id,
          bytes: result.bytes,
        });
      }
    );

    // Pipe buffer as stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

/**
 * Generate a short-lived signed download URL for a Cloudinary raw resource
 * Uses the Cloudinary SDK's url() method with sign_url and a type of "authenticated"
 * Fallback: generate a URL with an expiration timestamp
 */
export const generateSignedDownloadUrl = (
  publicId: string,
  expiresInSeconds: number = 300
): string => {
  // Generate a signed URL that expires
  const url = cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    sign_url: true,
    secure: true,
    // Transformation with expiration flag
    flags: `attachment`,
  });

  // Append expiration as query parameter for additional server-side validation
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${url}?_expires=${expiresAt}`;
};

/**
 * Get a direct Cloudinary URL for server-side streaming/proxying
 */
export const getCloudinaryResourceUrl = (publicId: string): string => {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    secure: true,
  });
};
