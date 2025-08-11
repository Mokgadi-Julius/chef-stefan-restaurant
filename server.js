require('dotenv').config();
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
const nodemailer = require('nodemailer');
const { query, pool, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Email configuration
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify email configuration on startup
emailTransporter.verify((error, success) => {
    if (error) {
        console.log('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Trust proxy for Railway deployment
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

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
if (pool) {
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
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        }
    }));
} else {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'chef-stefan-admin-secret-key-2024',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        }
    }));
}

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

// Image processing function
async function processImage(inputPath, outputPath, width = 800, height = 600, quality = 85) {
    try {
        await sharp(inputPath)
            .resize(width, height, { fit: 'cover' })
            .jpeg({ quality })
            .toFile(outputPath);
        
        // Remove original file
        await fs.unlink(inputPath);
    } catch (err) {
        console.error('Error processing image:', err);
        throw err;
    }
}

// Insert default data
async function insertDefaultData() {
    if (!pool) return;
    
    try {
        // Check if categories exist
        const existingCategories = await query('SELECT COUNT(*) as count FROM categories');
        
        if (existingCategories.rows[0].count === '0') {
            const defaultCategories = [
                {
                    id: 'appetizers',
                    name: 'Appetizers',
                    description: 'Start your meal with our delicious appetizers',
                    color: '#e74c3c',
                    icon: 'fas fa-leaf',
                    display_order: 1
                },
                {
                    id: 'mains',
                    name: 'Main Courses',
                    description: 'Our signature main dishes',
                    color: '#f39c12',
                    icon: 'fas fa-utensils',
                    display_order: 2
                },
                {
                    id: 'desserts',
                    name: 'Desserts',
                    description: 'Sweet endings to your meal',
                    color: '#9b59b6',
                    icon: 'fas fa-ice-cream',
                    display_order: 3
                },
                {
                    id: 'beverages',
                    name: 'Beverages',
                    description: 'Refreshing drinks and beverages',
                    color: '#3498db',
                    icon: 'fas fa-glass-martini-alt',
                    display_order: 4
                }
            ];

            for (const category of defaultCategories) {
                await query(
                    'INSERT INTO categories (id, name, description, color, icon, display_order) VALUES ($1, $2, $3, $4, $5, $6)',
                    [category.id, category.name, category.description, category.color, category.icon, category.display_order]
                );
            }
            console.log('Default categories inserted');
        }
    } catch (err) {
        console.error('Error inserting default data:', err);
    }
}

// Initialize default data
setTimeout(() => {
    if (pool) insertDefaultData();
}, 1000);

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.path.includes('categories') ? 'categories' : 
                     req.path.includes('menu') ? 'menu' : 'gallery';
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
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + path.extname(file.originalname));
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
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
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
            message: 'Login successful',
            user: req.session.user
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.session.user });
});

// Category routes
app.get('/api/categories', async (req, res) => {
    try {
        const result = await query('SELECT * FROM categories ORDER BY display_order, created_at');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Error fetching categories' });
    }
});

app.post('/api/categories', requireAuth, (req, res) => {
    const { name, description, color, icon } = req.body;
    const id = uuidv4();
    
    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }

    query(
        'INSERT INTO categories (id, name, description, color, icon) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, name, description || null, color || '#3498db', icon || 'fas fa-utensils']
    )
    .then(result => {
        res.json(result.rows[0]);
    })
    .catch(err => {
        console.error('Error creating category:', err);
        res.status(500).json({ error: 'Error creating category' });
    });
});

app.put('/api/categories/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color, icon } = req.body;
        
        const result = await query(
            'UPDATE categories SET name = $1, description = $2, color = $3, icon = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
            [name, description, color, icon, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Error updating category' });
    }
});

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Error deleting category' });
    }
});

// Menu item routes
app.get('/api/menu-items', async (req, res) => {
    try {
        const result = await query(`
            SELECT m.*, c.name as category_name, c.color as category_color 
            FROM menu_items m 
            LEFT JOIN categories c ON m.category_id = c.id 
            ORDER BY m.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching menu items:', err);
        res.status(500).json({ error: 'Error fetching menu items' });
    }
});

app.post('/api/menu-items', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category_id, available, featured } = req.body;
        const id = uuidv4();
        let imagePath = null;
        
        if (req.file) {
            const processedPath = path.join(menuDir, `processed_${req.file.filename}`);
            await processImage(req.file.path, processedPath, 600, 400, 85);
            imagePath = `/uploads/menu/processed_${req.file.filename}`;
        }

        const result = await query(
            'INSERT INTO menu_items (id, name, description, price, category_id, image_path, available, featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [id, name, description || null, parseFloat(price), category_id || null, imagePath, available !== 'false', featured === 'true']
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating menu item:', err);
        res.status(500).json({ error: 'Error creating menu item' });
    }
});

app.put('/api/menu-items/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category_id, available, featured } = req.body;
        let imagePath = undefined;
        
        if (req.file) {
            const processedPath = path.join(menuDir, `processed_${req.file.filename}`);
            await processImage(req.file.path, processedPath, 600, 400, 85);
            imagePath = `/uploads/menu/processed_${req.file.filename}`;
        }

        let updateQuery = 'UPDATE menu_items SET name = $1, description = $2, price = $3, category_id = $4, available = $5, featured = $6, updated_at = CURRENT_TIMESTAMP';
        let params = [name, description, parseFloat(price), category_id, available !== 'false', featured === 'true'];
        
        if (imagePath) {
            updateQuery += ', image_path = $7';
            params.push(imagePath);
        }
        
        updateQuery += ' WHERE id = $' + (params.length + 1) + ' RETURNING *';
        params.push(id);

        const result = await query(updateQuery, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ error: 'Error updating menu item' });
    }
});

app.delete('/api/menu-items/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        res.json({ message: 'Menu item deleted successfully' });
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ error: 'Error deleting menu item' });
    }
});

// Gallery routes
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await query('SELECT * FROM gallery_images ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching gallery:', err);
        res.status(500).json({ error: 'Error fetching gallery' });
    }
});

app.post('/api/gallery', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const { titles } = req.body;
        const processedImages = [];
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one image is required' });
        }

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const title = Array.isArray(titles) ? titles[i] : `Gallery Image ${i + 1}`;
            const id = uuidv4();
            
            const processedPath = path.join(galleryDir, `processed_${file.filename}`);
            await processImage(file.path, processedPath, 800, 600, 90);
            const imagePath = `/uploads/gallery/processed_${file.filename}`;

            const result = await query(
                'INSERT INTO gallery_images (id, title, image_path, type) VALUES ($1, $2, $3, $4) RETURNING *',
                [id, title, imagePath, 'food']
            );

            processedImages.push(result.rows[0]);
        }

        res.json(processedImages);
    } catch (err) {
        console.error('Error uploading images:', err);
        res.status(500).json({ error: 'Error uploading images' });
    }
});

app.put('/api/gallery/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        
        const result = await query(
            'UPDATE gallery_images SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [title, description, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gallery image not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating gallery image:', err);
        res.status(500).json({ error: 'Error updating gallery image' });
    }
});

app.delete('/api/gallery/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM gallery_images WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gallery image not found' });
        }

        res.json({ message: 'Gallery image deleted successfully' });
    } catch (err) {
        console.error('Error deleting gallery image:', err);
        res.status(500).json({ error: 'Error deleting gallery image' });
    }
});

// User management routes
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const result = await query('SELECT id, first_name, last_name, email, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.post('/api/users', requireAuth, async (req, res) => {
    try {
        const { first_name, last_name, email, password, role } = req.body;
        
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const id = uuidv4();

        const result = await query(
            'INSERT INTO users (id, first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, first_name, last_name, email, role, is_active, created_at',
            [id, first_name, last_name, email, hashedPassword, role || 'admin']
        );

        res.json(result.rows[0]);
    } catch (err) {
        if (err.message.includes('duplicate key') || err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Error creating user' });
    }
});

app.put('/api/users/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, role, is_active } = req.body;
        
        const result = await query(
            'UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING id, first_name, last_name, email, role, is_active, created_at',
            [first_name, last_name, email, role, is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Error updating user' });
    }
});

app.delete('/api/users/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Stats route
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const [categories, menuItems, galleryImages, users, bookings] = await Promise.all([
            query('SELECT COUNT(*) as count FROM categories'),
            query('SELECT COUNT(*) as count FROM menu_items'),
            query('SELECT COUNT(*) as count FROM gallery_images'),
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM bookings')
        ]);

        res.json({
            categories: parseInt(categories.rows[0].count),
            menu_items: parseInt(menuItems.rows[0].count),
            gallery_images: parseInt(galleryImages.rows[0].count),
            users: parseInt(users.rows[0].count),
            bookings: parseInt(bookings.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

// Booking routes
app.post('/api/bookings', async (req, res) => {
    try {
        const {
            customer_name, customer_email, customer_phone, event_type,
            event_date, event_time, location, meal_type, occasion,
            dietary_restrictions, food_style, additional_info,
            selected_dishes, total_amount
        } = req.body;
        
        if (!customer_name || !customer_email || !customer_phone || !event_date) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        const id = uuidv4();

        const result = await query(
            `INSERT INTO bookings (
                id, customer_name, customer_email, customer_phone, event_type,
                event_date, event_time, location, meal_type, occasion,
                dietary_restrictions, food_style, additional_info,
                selected_dishes, total_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [
                id, customer_name, customer_email, customer_phone, event_type,
                event_date, event_time, location, meal_type, occasion,
                dietary_restrictions, food_style, additional_info,
                selected_dishes, total_amount
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ error: 'Error creating booking' });
    }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
    try {
        const result = await query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ error: 'Error fetching bookings' });
    }
});

app.get('/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('SELECT * FROM bookings WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching booking:', err);
        res.status(500).json({ error: 'Error fetching booking' });
    }
});

app.put('/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, total_amount, additional_info } = req.body;
        
        const result = await query(
            'UPDATE bookings SET status = $1, total_amount = $2, additional_info = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [status, total_amount, additional_info, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating booking:', err);
        res.status(500).json({ error: 'Error updating booking' });
    }
});

app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ error: 'Error deleting booking' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: pool ? 'connected' : 'not connected'
    });
});

// Email endpoints
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Email template for contact form
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #cda45e 0%, #d9ba85 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #1a1814; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
                </div>
                <div style="padding: 30px; background: #ffffff;">
                    <h2 style="color: #1a1814; border-bottom: 2px solid #cda45e; padding-bottom: 10px;">Contact Details</h2>
                    
                    <div style="margin-bottom: 20px;">
                        <strong style="color: #1a1814;">Name:</strong> ${name}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong style="color: #1a1814;">Email:</strong> ${email}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong style="color: #1a1814;">Subject:</strong> ${subject}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong style="color: #1a1814;">Message:</strong>
                        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                        <p>This message was sent from the Private Chef Stefan website contact form.</p>
                        <p>Received on: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
                    </div>
                </div>
            </div>
        `;

        // Send email
        await emailTransporter.sendMail({
            from: `"Chef Stefan Website" <${process.env.SMTP_USER}>`,
            to: 'info@privatechefstefan.co.za',
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: emailHtml
        });

        // Store in database (optional - you can add a contacts table if needed)
        try {
            await query(
                'INSERT INTO contacts (name, email, subject, message, created_at) VALUES ($1, $2, $3, $4, NOW())',
                [name, email, subject, message]
            );
        } catch (dbError) {
            console.log('Note: Contact not stored in database (table may not exist):', dbError.message);
        }

        res.json({ success: true, message: 'Message sent successfully!' });

    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
});

app.post('/api/book-table', async (req, res) => {
    try {
        const { 
            name, email, phone, date, time, people, 
            occasion, dietary_requirements, special_requests 
        } = req.body;

        // Validation
        if (!name || !email || !phone || !date || !time || !people) {
            return res.status(400).json({ error: 'Required fields: name, email, phone, date, time, and number of people' });
        }

        // Email template for booking
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #cda45e 0%, #d9ba85 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #1a1814; margin: 0; font-size: 24px;">New Table Booking Request</h1>
                </div>
                <div style="padding: 30px; background: #ffffff;">
                    <h2 style="color: #1a1814; border-bottom: 2px solid #cda45e; padding-bottom: 10px;">Booking Details</h2>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div>
                            <strong style="color: #1a1814;">Guest Name:</strong><br>
                            ${name}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Email:</strong><br>
                            ${email}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Phone:</strong><br>
                            ${phone}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Number of People:</strong><br>
                            ${people}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Date:</strong><br>
                            ${date}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Time:</strong><br>
                            ${time}
                        </div>
                    </div>
                    
                    ${occasion ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Special Occasion:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${occasion}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${dietary_requirements ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Dietary Requirements:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${dietary_requirements}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${special_requests ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Special Requests:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${special_requests}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 8px;">
                        <strong style="color: #1a1814;">📞 Contact Private Chef Stefan:</strong><br>
                        Email: info@privatechefstefan.co.za<br>
                        Phone: +27 (0) 82 123 4567<br>
                        <em>We will contact you shortly to confirm your booking!</em>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                        <p>This booking request was submitted through the Private Chef Stefan website.</p>
                        <p>Received on: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
                    </div>
                </div>
            </div>
        `;

        // Send email
        await emailTransporter.sendMail({
            from: `"Chef Stefan Bookings" <${process.env.SMTP_USER}>`,
            to: 'info@privatechefstefan.co.za',
            replyTo: email,
            subject: `New Booking Request - ${name} for ${date} at ${time}`,
            html: emailHtml
        });

        // Store in database (use existing bookings table structure)
        try {
            const id = uuidv4();
            await query(
                `INSERT INTO bookings (
                    id, customer_name, customer_email, customer_phone, 
                    event_date, event_time, occasion, dietary_restrictions, 
                    additional_info, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                [
                    id, name, email, phone, 
                    date, time, occasion || '', dietary_requirements || '', 
                    special_requests || `Table booking for ${people} people`
                ]
            );
        } catch (dbError) {
            console.log('Booking stored in database with simplified structure');
        }

        res.json({ success: true, message: 'Booking request sent successfully! We will contact you soon to confirm.' });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ error: 'Failed to process booking. Please try again later.' });
    }
});

// Catering inquiry endpoint (sends email for catering forms)
app.post('/api/catering-inquiry', async (req, res) => {
    try {
        const { 
            customer_name, customer_email, customer_phone, event_type,
            event_date, event_time, location, meal_type, occasion,
            dietary_restrictions, food_style, additional_info,
            selected_dishes, total_amount
        } = req.body;

        // Validation
        if (!customer_name || !customer_email || !customer_phone || !event_date) {
            return res.status(400).json({ error: 'Required fields: name, email, phone, and event date' });
        }

        // Email template for catering inquiry
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #cda45e 0%, #d9ba85 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #1a1814; margin: 0; font-size: 24px;">New Catering Inquiry</h1>
                </div>
                <div style="padding: 30px; background: #ffffff;">
                    <h2 style="color: #1a1814; border-bottom: 2px solid #cda45e; padding-bottom: 10px;">Client Details</h2>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div>
                            <strong style="color: #1a1814;">Client Name:</strong><br>
                            ${customer_name}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Email:</strong><br>
                            ${customer_email}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Phone:</strong><br>
                            ${customer_phone}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Event Type:</strong><br>
                            ${event_type || 'Not specified'}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Event Date:</strong><br>
                            ${event_date}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Event Time:</strong><br>
                            ${event_time || 'Not specified'}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Location:</strong><br>
                            ${location || 'Not specified'}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Meal Type:</strong><br>
                            ${meal_type || 'Not specified'}
                        </div>
                    </div>
                    
                    ${occasion ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Special Occasion:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${occasion}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${dietary_restrictions ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Dietary Restrictions:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${dietary_restrictions}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${food_style ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Food Style:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${food_style}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${additional_info ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Additional Information:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${additional_info}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${selected_dishes && Array.isArray(selected_dishes) && selected_dishes.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #1a1814;">Selected Menu Items:</strong>
                            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #cda45e; margin-top: 10px;">
                                ${selected_dishes.map(item => `• ${item.dish} (${item.quantity}x) - R${item.totalPrice.toLocaleString()}`).join('<br>')}
                                ${total_amount ? `<br><strong>Total: R${total_amount.toLocaleString()}</strong>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 8px;">
                        <strong style="color: #1a1814;">📞 Contact Private Chef Stefan:</strong><br>
                        Email: info@privatechefstefan.co.za<br>
                        Phone: +27 (0) 82 123 4567<br>
                        <em>We will contact you shortly to discuss your catering requirements!</em>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                        <p>This catering inquiry was submitted through the Private Chef Stefan website.</p>
                        <p>Received on: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
                    </div>
                </div>
            </div>
        `;

        // Send email
        await emailTransporter.sendMail({
            from: `"Chef Stefan Catering" <${process.env.SMTP_USER}>`,
            to: 'info@privatechefstefan.co.za',
            replyTo: customer_email,
            subject: `Catering Inquiry - ${customer_name} for ${event_date}`,
            html: emailHtml
        });

        // Store in database
        try {
            const id = uuidv4();
            const result = await query(
                `INSERT INTO bookings (
                    id, customer_name, customer_email, customer_phone, event_type,
                    event_date, event_time, location, meal_type, occasion,
                    dietary_restrictions, food_style, additional_info,
                    selected_dishes, total_amount, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()) RETURNING *`,
                [
                    id, customer_name, customer_email, customer_phone, event_type,
                    event_date, event_time, location, meal_type, occasion,
                    dietary_restrictions, food_style, additional_info,
                    selected_dishes ? JSON.stringify(selected_dishes) : null, total_amount
                ]
            );
            
            res.json({ 
                success: true, 
                message: 'Your catering inquiry has been sent successfully! We will contact you shortly to discuss your requirements.',
                booking: result.rows[0]
            });
        } catch (dbError) {
            console.error('Database error (inquiry still sent via email):', dbError);
            res.json({ 
                success: true, 
                message: 'Your catering inquiry has been sent successfully! We will contact you shortly to discuss your requirements.'
            });
        }

    } catch (error) {
        console.error('Error processing catering inquiry:', error);
        res.status(500).json({ error: 'Failed to process catering inquiry. Please try again later.' });
    }
});

// Cart booking endpoint (sends email for cart-based bookings)
app.post('/api/cart-booking', async (req, res) => {
    try {
        const { 
            customer_name, customer_email, customer_phone, event_date,
            event_time, guest_count, location, special_requests,
            selected_dishes, total_amount, booking_source
        } = req.body;

        // Validation
        if (!customer_name || !customer_email || !customer_phone || !event_date || !event_time || !guest_count) {
            return res.status(400).json({ error: 'Required fields: name, email, phone, event date, time, and guest count' });
        }

        // Format selected dishes for email
        const dishesHtml = selected_dishes && selected_dishes.length > 0 ? 
            selected_dishes.map(dish => `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <strong>${dish.dish}</strong><br>
                    <span style="color: #6c757d;">Quantity: ${dish.quantity} × R${dish.price.toLocaleString()}</span><br>
                    <span style="color: #28a745; font-weight: 600;">Subtotal: R${dish.totalPrice.toLocaleString()}</span>
                </div>
            `).join('') : '<p style="color: #6c757d; font-style: italic;">No specific dishes selected - custom menu requested</p>';

        // Email template for cart booking
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #cda45e 0%, #d9ba85 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #1a1814; margin: 0; font-size: 24px;">New Cart Booking Request</h1>
                    <p style="color: #1a1814; margin: 10px 0 0; opacity: 0.9;">Premium Private Chef Experience</p>
                </div>
                
                <div style="padding: 30px; background: #ffffff;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div>
                            <strong style="color: #1a1814;">Customer Name:</strong><br>
                            ${customer_name}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Email:</strong><br>
                            ${customer_email}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Phone:</strong><br>
                            ${customer_phone}
                        </div>
                        <div>
                            <strong style="color: #1a1814;">Guest Count:</strong><br>
                            ${guest_count} guests
                        </div>
                    </div>

                    <hr style="border: none; height: 1px; background: #eee; margin: 30px 0;">

                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #1a1814; margin-bottom: 15px;">Event Details</h3>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #1a1814;">Date & Time:</strong><br>
                                ${new Date(event_date).toLocaleDateString('en-ZA', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })} at ${event_time}
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #1a1814;">Location:</strong><br>
                                ${location}
                            </div>
                            ${special_requests ? `
                            <div>
                                <strong style="color: #1a1814;">Special Requests:</strong><br>
                                ${special_requests}
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #1a1814; margin-bottom: 15px;">Selected Menu Items</h3>
                        ${dishesHtml}
                        ${total_amount > 0 ? `
                        <div style="text-align: right; margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                            <strong style="color: #1a1814; font-size: 18px;">Total Estimated Amount: R${total_amount.toLocaleString()}</strong>
                            <br>
                            <small style="color: #6c757d;">*Final pricing subject to menu customization and requirements</small>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="margin-top: 30px; padding: 20px; background: #e8f5e8; border-radius: 8px;">
                        <strong style="color: #1a1814;">📞 Contact Private Chef Stefan:</strong><br>
                        Email: info@privatechefstefan.co.za<br>
                        Phone: +27 (0) 82 123 4567<br>
                        <em>We will contact you shortly to discuss your menu and confirm all details!</em>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                        <p>This booking was submitted through the Private Chef Stefan cart system.</p>
                        <p>Source: ${booking_source || 'cart_session'}</p>
                        <p>Received on: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
                    </div>
                </div>
            </div>
        `;

        // Send email
        await emailTransporter.sendMail({
            from: `"Chef Stefan Cart Booking" <${process.env.SMTP_USER}>`,
            to: 'info@privatechefstefan.co.za',
            replyTo: customer_email,
            subject: `Cart Booking Request - ${customer_name} for ${event_date} at ${event_time}`,
            html: emailHtml
        });

        // Store in database
        try {
            const id = uuidv4();
            const result = await query(
                `INSERT INTO bookings (
                    id, customer_name, customer_email, customer_phone, event_type,
                    event_date, event_time, location, occasion,
                    additional_info, selected_dishes, total_amount, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING *`,
                [
                    id, customer_name, customer_email, customer_phone, 'Cart Booking',
                    event_date, event_time, location, `${guest_count} guests`,
                    special_requests || `Cart booking for ${guest_count} guests`,
                    selected_dishes ? JSON.stringify(selected_dishes) : null, total_amount
                ]
            );
            
            res.json({ 
                success: true, 
                message: 'Your booking request has been sent successfully! We will contact you shortly to confirm your reservation and discuss the final menu details.',
                booking: result.rows[0]
            });
        } catch (dbError) {
            console.error('Database error (booking still sent via email):', dbError);
            res.json({ 
                success: true, 
                message: 'Your booking request has been sent successfully! We will contact you shortly to confirm your reservation and discuss the final menu details.'
            });
        }

    } catch (error) {
        console.error('Error processing cart booking:', error);
        res.status(500).json({ error: 'Failed to process booking request. Please try again later.' });
    }
});

// ======= BLOG API ENDPOINTS =======

// Get all blog posts with pagination and filtering
app.get('/api/blog/posts', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 6,
            category,
            status = 'published',
            search,
            author
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        let whereConditions = [`bp.status = $1`];
        let queryParams = [status];
        let paramCount = 1;

        if (category) {
            paramCount++;
            whereConditions.push(`bc.slug = $${paramCount}`);
            queryParams.push(category);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`(bp.title ILIKE $${paramCount} OR bp.content ILIKE $${paramCount} OR bp.excerpt ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
        }

        if (author) {
            paramCount++;
            whereConditions.push(`bp.author_id = $${paramCount}`);
            queryParams.push(author);
        }

        const whereClause = whereConditions.join(' AND ');

        const postsQuery = `
            SELECT 
                bp.*,
                bc.name as category_name,
                bc.slug as category_slug,
                bc.color as category_color,
                u.first_name || ' ' || u.last_name as author_name
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            LEFT JOIN users u ON bp.author_id = u.id
            WHERE ${whereClause}
            ORDER BY bp.published_at DESC, bp.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        queryParams.push(parseInt(limit), offset);

        const result = await query(postsQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            WHERE ${whereClause}
        `;

        const countResult = await query(countQuery, queryParams.slice(0, -2));
        const totalPosts = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalPosts / parseInt(limit));

        res.json({
            posts: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalPosts,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
});

// Get single blog post by slug
app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const result = await query(`
            SELECT 
                bp.*,
                bc.name as category_name,
                bc.slug as category_slug,
                bc.color as category_color,
                u.first_name || ' ' || u.last_name as author_name
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            LEFT JOIN users u ON bp.author_id = u.id
            WHERE bp.slug = $1 AND bp.status = 'published'
        `, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        // Increment view count
        await query(`
            UPDATE blog_posts SET view_count = view_count + 1 
            WHERE slug = $1
        `, [slug]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ error: 'Failed to fetch blog post' });
    }
});

// Get blog categories
app.get('/api/blog/categories', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                bc.*,
                COUNT(bp.id) as post_count
            FROM blog_categories bc
            LEFT JOIN blog_posts bp ON bc.id = bp.category_id AND bp.status = 'published'
            GROUP BY bc.id, bc.name, bc.slug, bc.description, bc.color, bc.display_order, bc.created_at, bc.updated_at
            ORDER BY bc.display_order, bc.name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching blog categories:', error);
        res.status(500).json({ error: 'Failed to fetch blog categories' });
    }
});

// Get recent blog posts (for sidebar, etc.)
app.get('/api/blog/recent', async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const result = await query(`
            SELECT 
                bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image, 
                bp.published_at, bp.reading_time,
                bc.name as category_name, bc.color as category_color
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            WHERE bp.status = 'published'
            ORDER BY bp.published_at DESC
            LIMIT $1
        `, [parseInt(limit)]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent posts:', error);
        res.status(500).json({ error: 'Failed to fetch recent posts' });
    }
});

// ======= ADMIN BLOG ENDPOINTS =======

// Get all posts for admin (including drafts)
app.get('/api/admin/blog/posts', requireAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            whereConditions.push(`bp.status = $${paramCount}`);
            queryParams.push(status);
        }

        if (category) {
            paramCount++;
            whereConditions.push(`bp.category_id = $${paramCount}`);
            queryParams.push(category);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`(bp.title ILIKE $${paramCount} OR bp.content ILIKE $${paramCount})`);
            queryParams.push(`%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const result = await query(`
            SELECT 
                bp.*,
                bc.name as category_name,
                bc.color as category_color,
                u.first_name || ' ' || u.last_name as author_name
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            LEFT JOIN users u ON bp.author_id = u.id
            ${whereClause}
            ORDER BY bp.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...queryParams, parseInt(limit), offset]);

        // Get total count
        const countResult = await query(`
            SELECT COUNT(*) as total
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            ${whereClause}
        `, queryParams);

        const totalPosts = parseInt(countResult.rows[0].total);

        res.json({
            posts: result.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalPosts / parseInt(limit)),
                totalPosts
            }
        });

    } catch (error) {
        console.error('Error fetching admin blog posts:', error);
        res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
});

// Create new blog post
app.post('/api/admin/blog/posts', requireAuth, async (req, res) => {
    try {
        const {
            title, content, excerpt, category_id, status = 'draft',
            featured_image, seo_title, seo_description, seo_keywords, tags
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        // Generate slug from title
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        // Calculate reading time (average 200 words per minute)
        const wordCount = content.split(' ').length;
        const reading_time = Math.max(1, Math.ceil(wordCount / 200));

        const id = uuidv4();
        const author_id = req.session.user.id;
        const published_at = status === 'published' ? new Date() : null;

        const result = await query(`
            INSERT INTO blog_posts (
                id, title, slug, content, excerpt, category_id, author_id, 
                status, featured_image, seo_title, seo_description, seo_keywords, 
                tags, reading_time, published_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            id, title, slug, content, excerpt, category_id, author_id,
            status, featured_image, seo_title, seo_description, seo_keywords,
            tags, reading_time, published_at
        ]);

        res.json(result.rows[0]);

    } catch (error) {
        if (error.message.includes('duplicate key') && error.message.includes('slug')) {
            return res.status(409).json({ error: 'A post with this title already exists. Please use a different title.' });
        }
        console.error('Error creating blog post:', error);
        res.status(500).json({ error: 'Failed to create blog post' });
    }
});

// Update blog post
app.put('/api/admin/blog/posts/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, content, excerpt, category_id, status,
            featured_image, seo_title, seo_description, seo_keywords, tags
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        // Generate new slug if title changed
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        // Calculate reading time
        const wordCount = content.split(' ').length;
        const reading_time = Math.max(1, Math.ceil(wordCount / 200));

        // If changing to published and wasn't published before, set published_at
        const currentPost = await query('SELECT status, published_at FROM blog_posts WHERE id = $1', [id]);
        let published_at = currentPost.rows[0]?.published_at;
        
        if (status === 'published' && currentPost.rows[0]?.status !== 'published') {
            published_at = new Date();
        }

        const result = await query(`
            UPDATE blog_posts SET 
                title = $1, slug = $2, content = $3, excerpt = $4, 
                category_id = $5, status = $6, featured_image = $7, 
                seo_title = $8, seo_description = $9, seo_keywords = $10, 
                tags = $11, reading_time = $12, published_at = $13, 
                updated_at = NOW()
            WHERE id = $14
            RETURNING *
        `, [
            title, slug, content, excerpt, category_id, status, featured_image,
            seo_title, seo_description, seo_keywords, tags, reading_time, 
            published_at, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        if (error.message.includes('duplicate key') && error.message.includes('slug')) {
            return res.status(409).json({ error: 'A post with this title already exists. Please use a different title.' });
        }
        console.error('Error updating blog post:', error);
        res.status(500).json({ error: 'Failed to update blog post' });
    }
});

// Delete blog post
app.delete('/api/admin/blog/posts/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM blog_posts WHERE id = $1 RETURNING title', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        res.json({ success: true, message: `Blog post "${result.rows[0].title}" deleted successfully` });

    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ error: 'Failed to delete blog post' });
    }
});

// Get single post for editing
app.get('/api/admin/blog/posts/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                bp.*,
                bc.name as category_name,
                u.first_name || ' ' || u.last_name as author_name
            FROM blog_posts bp
            LEFT JOIN blog_categories bc ON bp.category_id = bc.id
            LEFT JOIN users u ON bp.author_id = u.id
            WHERE bp.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching blog post for editing:', error);
        res.status(500).json({ error: 'Failed to fetch blog post' });
    }
});

// Blog category management
app.get('/api/admin/blog/categories', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                bc.*,
                COUNT(bp.id) as post_count
            FROM blog_categories bc
            LEFT JOIN blog_posts bp ON bc.id = bp.category_id
            GROUP BY bc.id
            ORDER BY bc.display_order, bc.name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching blog categories:', error);
        res.status(500).json({ error: 'Failed to fetch blog categories' });
    }
});

// Create blog category
app.post('/api/admin/blog/categories', requireAuth, async (req, res) => {
    try {
        const { name, description, color, display_order } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        const slug = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        const id = uuidv4();

        const result = await query(`
            INSERT INTO blog_categories (id, name, slug, description, color, display_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [id, name, slug, description, color || '#cda45e', display_order || 0]);

        res.json(result.rows[0]);

    } catch (error) {
        if (error.message.includes('duplicate key')) {
            return res.status(409).json({ error: 'A category with this name already exists' });
        }
        console.error('Error creating blog category:', error);
        res.status(500).json({ error: 'Failed to create blog category' });
    }
});

// Dynamic sitemap.xml generator
app.get('/sitemap.xml', async (req, res) => {
    try {
        res.set('Content-Type', 'text/xml');
        
        // Get all published blog posts for sitemap
        let blogPosts = [];
        try {
            const result = await query(`
                SELECT slug, updated_at, published_at 
                FROM blog_posts 
                WHERE status = 'published' 
                ORDER BY published_at DESC
            `);
            blogPosts = result.rows;
        } catch (error) {
            console.log('No blog posts found for sitemap');
        }

        const currentDate = new Date().toISOString().split('T')[0];
        
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage - Primary landing page for Cape Town private chef searches -->
  <url>
    <loc>https://chefstefan.co.za/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://chefstefan.co.za/assets/img/chef-stefan-hero.jpg</image:loc>
      <image:title>Chef Stefan Bekker - Award-Winning Private Chef Cape Town</image:title>
      <image:caption>International award-winning private chef serving Cape Town, Stellenbosch, and Western Cape</image:caption>
    </image:image>
  </url>

  <!-- Menu Page - High value for "private chef menu cape town" searches -->
  <url>
    <loc>https://chefstefan.co.za/menu.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>

  <!-- Cart Page - For booking flow -->
  <url>
    <loc>https://chefstefan.co.za/cart.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Blog - Fresh content for SEO -->
  <url>
    <loc>https://chefstefan.co.za/blog.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>

  <!-- Gallery - Visual content for engagement -->
  <url>
    <loc>https://chefstefan.co.za/gallery.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Chef Information Page - Authority building -->
  <url>
    <loc>https://chefstefan.co.za/chef-info.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>https://chefstefan.co.za/assets/img/chef-stefan-profile.jpg</image:loc>
      <image:title>Chef Stefan Bekker Professional Portrait</image:title>
      <image:caption>Executive chef with 19 years experience in luxury hospitality across Cape Town and Western Cape</image:caption>
    </image:image>
  </url>

  <!-- Service Pages (anchors to main page) -->
  <url>
    <loc>https://chefstefan.co.za/#services</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>

  <url>
    <loc>https://chefstefan.co.za/#book-a-table</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://chefstefan.co.za/#contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>

  <url>
    <loc>https://chefstefan.co.za/#about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;

        // Add individual blog posts to sitemap
        blogPosts.forEach(post => {
            const lastMod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : currentDate;
            sitemap += `

  <!-- Blog Post: ${post.slug} -->
  <url>
    <loc>https://chefstefan.co.za/blog-post.html?slug=${post.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
        });

        sitemap += `

</urlset>`;

        res.send(sitemap);

    } catch (error) {
        console.error('Error generating sitemap:', error);
        
        // Fallback to static sitemap
        res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (pool) await pool.end();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.DATABASE_URL) {
        console.log('Connected to PostgreSQL database');
    } else {
        console.log('Running without database connection');
    }
});