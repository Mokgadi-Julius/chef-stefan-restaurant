// Example: Cloudinary Integration (Free tier available)
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload to Cloudinary instead of local storage
async function uploadToCloudinary(file, folder) {
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            folder: `chef-stefan/${folder}`,
            transformation: [
                { width: 800, height: 600, crop: 'fill' },
                { quality: 'auto:good' },
                { format: 'webp' }
            ]
        });
        
        // Delete local temp file
        await fs.unlink(file.path);
        
        return result.secure_url; // This becomes your image_path
    } catch (error) {
        console.error('Cloudinary upload failed:', error);
        throw error;
    }
}

// Updated route example
app.post('/api/menu-items', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category_id } = req.body;
        let imagePath = null;
        
        if (req.file) {
            // Upload to Cloudinary instead of processing locally
            imagePath = await uploadToCloudinary(req.file, 'menu');
        }

        const result = await query(
            'INSERT INTO menu_items (id, name, description, price, category_id, image_path, available) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [uuidv4(), name, description, parseFloat(price), category_id, imagePath, true]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating menu item:', err);
        res.status(500).json({ error: 'Error creating menu item' });
    }
});

/* 
Environment variables needed:
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key  
CLOUDINARY_API_SECRET=your-api-secret
*/