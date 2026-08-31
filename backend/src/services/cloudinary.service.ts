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
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Cloudinary upload returned no result"));
        }
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
 * Uses Cloudinary's private_download_url for time-limited access
 */
export const generateSignedDownloadUrl = (
  publicId: string,
  expiresInSeconds: number = 300
): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Use Cloudinary's private_download_url for proper time-limited signed URLs
  return cloudinary.utils.private_download_url(publicId, "pdf", {
    resource_type: "raw",
    expires_at: expiresAt,
    attachment: true,
  });
};

/**
 * Generate a short-lived signed URL for in-browser PDF rendering.
 * Same time-limited signing as the download URL, but with attachment:false so
 * the browser displays the document inline rather than forcing a download.
 */
export const generateSignedViewUrl = (
  publicId: string,
  expiresInSeconds: number = 300
): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return cloudinary.utils.private_download_url(publicId, "pdf", {
    resource_type: "raw",
    expires_at: expiresAt,
    attachment: false,
  });
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

/**
 * Delete a PDF resource from Cloudinary
 */
export const deletePdf = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
};
