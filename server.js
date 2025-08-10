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
            to: 'juliusmokgadilanga5@gmail.com',
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
            to: 'juliusmokgadilanga5@gmail.com',
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
            to: 'juliusmokgadilanga5@gmail.com',
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