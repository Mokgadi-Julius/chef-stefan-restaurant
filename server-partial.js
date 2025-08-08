const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const { query, pool, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration with PostgreSQL store
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'sessions'
    }),
    secret: process.env.SESSION_SECRET || 'chef-stefan-admin-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const categoriesDir = path.join(uploadsDir, 'categories');
const menuDir = path.join(uploadsDir, 'menu');
const galleryDir = path.join(uploadsDir, 'gallery');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(categoriesDir);
fs.ensureDirSync(menuDir);
fs.ensureDirSync(galleryDir);

// Initialize database
initializeDatabase().catch(console.error);

// Insert default data
async function insertDefaultData() {
    try {
        // Check if categories exist
        const existingCategories = await query('SELECT COUNT(*) as count FROM categories');
        
        if (existingCategories.rows[0].count === '0') {
            const defaultCategories = [
                ['appetizers', 'Appetizers'],
                ['mains', 'Main Courses'],
                ['desserts', 'Desserts'],
                ['beverages', 'Beverages']
            ];

            for (const [id, name] of defaultCategories) {
                await query(
                    'INSERT INTO categories (name) VALUES ($1)',
                    [name]
                );
            }
            console.log('Default categories inserted');
        }
    } catch (err) {
        console.error('Error inserting default data:', err);
    }
}

// Initialize default data
setTimeout(insertDefaultData, 1000);

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required' });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.params.type || req.body.type || 'general';
        let uploadPath = uploadsDir;
        
        switch (type) {
            case 'categories':
                uploadPath = categoriesDir;
                break;
            case 'menu':
                uploadPath = menuDir;
                break;
            case 'gallery':
                uploadPath = galleryDir;
                break;
            default:
                uploadPath = uploadsDir;
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, 'processed_' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Routes

// Authentication routes
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Update last login
        await query(
            'UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        req.session.user = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        };

        res.json({ 
            success: true, 
            message: 'Login successful',
            user: req.session.user
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Category routes
app.get('/api/categories', async (req, res) => {
    try {
        const result = await query('SELECT * FROM categories ORDER BY created_at');
        res.json({ success: true, categories: result.rows });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

app.post('/api/categories', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        let imagePath = null;
        if (req.file) {
            // Process image with Sharp
            const processedImagePath = path.join(categoriesDir, `processed_${uuidv4()}.jpeg`);
            await sharp(req.file.path)
                .resize(400, 300, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(processedImagePath);
            
            // Remove original file
            await fs.unlink(req.file.path);
            imagePath = path.relative('public', processedImagePath);
        }

        const result = await query(
            'INSERT INTO categories (name, image) VALUES ($1, $2) RETURNING *',
            [name, imagePath]
        );

        res.json({ success: true, category: result.rows[0] });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ success: false, message: 'Error creating category' });
    }
});

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ success: false, message: 'Error deleting category' });
    }
});

// Menu item routes
app.get('/api/menu', async (req, res) => {
    try {
        const result = await query(`
            SELECT m.*, c.name as category_name 
            FROM menu_items m 
            LEFT JOIN categories c ON m.category_id = c.id 
            ORDER BY m.created_at DESC
        `);
        res.json({ success: true, menuItems: result.rows });
    } catch (err) {
        console.error('Error fetching menu items:', err);
        res.status(500).json({ success: false, message: 'Error fetching menu items' });
    }
});

app.post('/api/menu', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category_id, is_available } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({ success: false, message: 'Name and price are required' });
        }

        let imagePath = null;
        if (req.file) {
            const processedImagePath = path.join(menuDir, `processed_${uuidv4()}.jpeg`);
            await sharp(req.file.path)
                .resize(600, 400, { fit: 'cover' })
                .jpeg({ quality: 85 })
                .toFile(processedImagePath);
            
            await fs.unlink(req.file.path);
            imagePath = path.relative('public', processedImagePath);
        }

        const result = await query(
            'INSERT INTO menu_items (name, description, price, category_id, image, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description || null, parseFloat(price), category_id || null, imagePath, is_available !== 'false']
        );

        res.json({ success: true, menuItem: result.rows[0] });
    } catch (err) {
        console.error('Error creating menu item:', err);
        res.status(500).json({ success: false, message: 'Error creating menu item' });
    }
});

app.delete('/api/menu/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ success: false, message: 'Error deleting menu item' });
    }
});

// Gallery routes
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await query('SELECT * FROM gallery_items ORDER BY created_at DESC');
        res.json({ success: true, images: result.rows });
    } catch (err) {
        console.error('Error fetching gallery:', err);
        res.status(500).json({ success: false, message: 'Error fetching gallery' });
    }
});

app.post('/api/gallery', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image is required' });
        }

        const processedImagePath = path.join(galleryDir, `processed_${uuidv4()}.jpeg`);
        await sharp(req.file.path)
            .resize(800, 600, { fit: 'cover' })
            .jpeg({ quality: 90 })
            .toFile(processedImagePath);
        
        await fs.unlink(req.file.path);
        const imagePath = path.relative('public', processedImagePath);

        const result = await query(
            'INSERT INTO gallery_items (title, image) VALUES ($1, $2) RETURNING *',
            [title || 'Untitled', imagePath]
        );

        res.json({ success: true, image: result.rows[0] });
    } catch (err) {
        console.error('Error uploading image:', err);
        res.status(500).json({ success: false, message: 'Error uploading image' });
    }
});

app.delete('/api/gallery/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM gallery_items WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (err) {
        console.error('Error deleting image:', err);
        res.status(500).json({ success: false, message: 'Error deleting image' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.DATABASE_URL) {
        console.log('Connected to PostgreSQL database');
    }
});