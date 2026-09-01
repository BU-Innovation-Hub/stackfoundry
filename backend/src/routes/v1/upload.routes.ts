/**
 * Upload Routes
 * Handles file uploads to Cloudinary
 */
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cloudinary from '../../config/cloudinary';
import { requireAuth, requireContentManagement } from '../../middleware/auth';
import { RequestWithUser } from '../../types';
import * as ProfileService from '../../services/profile.service';
import { recordAuditEvent } from '../../utils/audit';

const router = Router();

// Multer stores file in memory so we can stream it to Cloudinary
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB fallback
    },
    fileFilter: (_req: any, file: any, cb: any) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

/**
 * POST /api/v1/upload/image
 * Upload a single image to Cloudinary
 * Protected: admin only
 */
router.post(
    '/profile-picture',
    requireAuth,
    upload.single('image'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const file = (req as any).file;
            if (!file) { res.status(400).json({ success: false, error: 'No image file provided' }); return; }
            const result: any = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'innovation-hub/profiles', resource_type: 'image', transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }, { quality: 'auto', fetch_format: 'auto' }] },
                    (error: any, uploadResult: any) => error ? reject(error) : resolve(uploadResult)
                );
                stream.end(file.buffer);
            });
            const user = (req as RequestWithUser).user;
            const updated = await ProfileService.setProfilePicture(user.id, result.secure_url, result.public_id);
            recordAuditEvent({ eventType: 'business', action: 'user.profile_picture_updated', actorId: user.id, targetType: 'User', targetId: user.id, success: true, requestId: res.getHeader('X-Request-Id')?.toString() });
            res.json({ success: true, data: { url: updated.profilePictureUrl, publicId: updated.profilePicturePublicId } });
        } catch (error) { next(error); }
    }
);

router.post(
    '/image',
    requireAuth,
    requireContentManagement,
    upload.single('image'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const file = (req as any).file;

            if (!file) {
                res.status(400).json({ success: false, message: 'No image file provided' });
                return;
            }

            // Upload buffer to Cloudinary via stream
            const result: any = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'innovation-hub/blog',
                        resource_type: 'image',
                        transformation: [
                            { quality: 'auto', fetch_format: 'auto' },
                        ],
                    },
                    (error: any, uploadResult: any) => {
                        if (error) reject(error);
                        else resolve(uploadResult);
                    }
                );
                stream.end(file.buffer);
            });

            res.status(200).json({
                success: true,
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
