/**
 * Material Service
 * Business logic for creating/querying video and PDF materials
 */

import Material, { IMaterial } from "../models/material.model";
import { extractVideoId, fetchYouTubeMetadata } from "./youtube.service";
import { uploadPdf, generateSignedDownloadUrl, deletePdf } from "./cloudinary.service";
import { ApiError } from "../middleware/errorHandler";
// ============================================
// Video Materials
// ============================================

export const createVideoMaterial = async (data: {
  youtubeUrl: string;
  levelId: string;
  topicId?: string;
  title?: string;
}): Promise<IMaterial> => {
  const videoId = extractVideoId(data.youtubeUrl);
  if (!videoId) {
    throw new ApiError(400, "Invalid YouTube URL or video ID");
  }

  // Fetch metadata from YouTube Data API (server-side only)
  const meta = await fetchYouTubeMetadata(videoId);

  // Determine next order number within this level
  const lastMaterial = await Material.findOne({ level: data.levelId })
    .sort({ order: -1 })
    .select("order");
  const nextOrder = lastMaterial ? lastMaterial.order + 1 : 0;

  const material = await Material.create({
    level: data.levelId,
    topic: data.topicId || undefined,
    title: data.title || meta.title,
    type: "video",
    order: nextOrder,
    youtubeVideoId: meta.id,
    youtubeTitle: meta.title,
    youtubeDurationSeconds: meta.durationSeconds,
    youtubeThumbnail: meta.thumbnailUrl,
  });

  return material;
};

// ============================================
// PDF Materials
// ============================================

export const createPdfMaterial = async (data: {
  buffer: Buffer;
  originalName: string;
  sizeBytes: number;
  levelId: string;
  topicId?: string;
  title?: string;
}): Promise<IMaterial> => {
  
    // Upload to Cloudinary
    const uploadResult = await uploadPdf(data.buffer, data.originalName);
try {
    // Determine next order number
    const lastMaterial = await Material.findOne({ level: data.levelId })
      .sort({ order: -1 })
      .select("order");
    const nextOrder = lastMaterial ? lastMaterial.order + 1 : 0;

    const material = await Material.create({
      level: data.levelId,
      topic: data.topicId || undefined,
      title: data.title || data.originalName,
      type: "pdf",
      order: nextOrder,
      cloudinaryPublicId: uploadResult.publicId,
      pdfOriginalName: data.originalName,
      pdfSizeBytes: uploadResult.bytes,
    });

    return material;
  } catch (error) {
    // Cleanup orphaned Cloudinary resource
    await deletePdf(uploadResult.publicId).catch(() => { });
    throw error;
  }
};

// ============================================
// Queries
// ============================================

export const getMaterialsByLevel = async (
  levelId: string
): Promise<IMaterial[]> => {
  return Material.find({ level: levelId })
    .sort({ order: 1 })
    .select("-cloudinaryPublicId") // Never expose Cloudinary public ID in listings
    .populate("topic", "name");
};

export const getMaterialById = async (id: string): Promise<IMaterial> => {
  const material = await Material.findById(id)
    .select("-cloudinaryPublicId")
    .populate("topic", "name");
  if (!material) throw new ApiError(404, "Material not found");
  return material;
};

/**
 * Generate a signed download URL for a PDF material
 * Caller must verify enrollment and level unlock before calling this
 */
export const getPdfDownloadUrl = async (
  materialId: string
): Promise<{ url: string; originalName: string }> => {
  const material = await Material.findById(materialId);
  if (!material) throw new ApiError(404, "Material not found");
  if (material.type !== "pdf") throw new ApiError(400, "Material is not a PDF");
  if (!material.cloudinaryPublicId)
    throw new ApiError(500, "PDF resource missing");

  const url = generateSignedDownloadUrl(material.cloudinaryPublicId, 300);
  return { url, originalName: material.pdfOriginalName || "document.pdf" };
};

export const deleteMaterial = async (id: string): Promise<void> => {
  const material = await Material.findById(id);
  if (!material) throw new ApiError(404, "Material not found");
  // Clean up Cloudinary resource for PDFs
  if (material.type === "pdf" && material.cloudinaryPublicId) {
    await deletePdf(material.cloudinaryPublicId);
  }
  await Material.findByIdAndDelete(id);
};

