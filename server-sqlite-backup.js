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
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'chef-stefan-admin-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
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

// Database setup
const dbPath = path.join(__dirname, 'chef_stefan.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize database tables
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Categories table
            db.run(`CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT DEFAULT '#3498db',
                icon TEXT DEFAULT 'fas fa-utensils',
                display_order INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Menu items table
            db.run(`CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category_id TEXT,
                image_path TEXT,
                available BOOLEAN DEFAULT 1,
                featured BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )`);

            // Gallery images table
            db.run(`CREATE TABLE IF NOT EXISTS gallery_images (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                image_path TEXT NOT NULL,
                type TEXT DEFAULT 'food',
                featured BOOLEAN DEFAULT 0,
                file_size INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Users table (for basic user management)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                is_active BOOLEAN DEFAULT 1,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Add password_hash column if it doesn't exist (migration)
            db.run(`ALTER TABLE users ADD COLUMN password_hash TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Migration error:', err.message);
                }
            });

            // Add is_active column if it doesn't exist (migration)
            db.run(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Migration error:', err.message);
                }
            });

            // Add last_login column if it doesn't exist (migration)
            db.run(`ALTER TABLE users ADD COLUMN last_login DATETIME`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Migration error:', err.message);
                }
            });

            // Bookings table
            db.run(`CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                event_type TEXT,
                event_date TEXT NOT NULL,
                event_time TEXT,
                location TEXT,
                meal_type TEXT,
                occasion TEXT,
                dietary_restrictions TEXT,
                food_style TEXT,
                additional_info TEXT,
                selected_dishes TEXT,
                total_amount DECIMAL(10,2),
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Database initialized successfully');
                    insertDefaultData();
                    resolve();
                }
            });
        });
    });
}

// Insert default data
function insertDefaultData() {
    // Insert default categories
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

    // Check if categories exist, if not insert defaults
    db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (!err && row.count === 0) {
            const stmt = db.prepare(`INSERT INTO categories (id, name, description, color, icon, display_order) 
                                   VALUES (?, ?, ?, ?, ?, ?)`);
            
            defaultCategories.forEach(category => {
                stmt.run([category.id, category.name, category.description, category.color, category.icon, category.display_order]);
            });
            
            stmt.finalize();
            console.log('Default categories inserted');
        }
    });

    // Insert sample menu items
    const sampleMenuItems = [
        {
            id: 'item-1',
            name: 'Grilled Salmon',
            description: 'Fresh Atlantic salmon grilled to perfection with herbs and lemon',
            price: 28.50,
            category_id: 'mains',
            featured: 1
        },
        {
            id: 'item-2',
            name: 'Caesar Salad',
            description: 'Crisp romaine lettuce with parmesan cheese and croutons',
            price: 12.00,
            category_id: 'appetizers',
            featured: 0
        },
        {
            id: 'item-3',
            name: 'Chocolate Lava Cake',
            description: 'Warm chocolate cake with molten center and vanilla ice cream',
            price: 9.50,
            category_id: 'desserts',
            featured: 1
        }
    ];

    db.get("SELECT COUNT(*) as count FROM menu_items", (err, row) => {
        if (!err && row.count === 0) {
            const stmt = db.prepare(`INSERT INTO menu_items (id, name, description, price, category_id, featured) 
                                   VALUES (?, ?, ?, ?, ?, ?)`);
            
            sampleMenuItems.forEach(item => {
                stmt.run([item.id, item.name, item.description, item.price, item.category_id, item.featured]);
            });
            
            stmt.finalize();
            console.log('Sample menu items inserted');
        }
    });

    // Insert default admin user
    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (!err && row.count === 0) {
            try {
                const hashedPassword = await bcrypt.hash('admin123', 12);
                const adminId = uuidv4();
                
                const stmt = db.prepare(`INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_active) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?)`);
                
                stmt.run([
                    adminId,
                    'Chef',
                    'Stefan',
                    'info@privatechefstefan.co.za',
                    hashedPassword,
                    'admin',
                    1
                ], function(err) {
                    if (err) {
                        console.error('Error creating admin user:', err);
                    } else {
                        console.log('Default admin user created');
                        console.log('Login credentials:');
                        console.log('Email: info@privatechefstefan.co.za');
                        console.log('Password: admin123');
                        console.log('*** Please change the default password after first login ***');
                    }
                });
                
                stmt.finalize();
            } catch (error) {
                console.error('Error hashing password:', error);
            }
        }
    });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = uploadsDir;
        
        if (req.route.path.includes('/menu')) {
            uploadPath = menuDir;
        } else if (req.route.path.includes('/gallery')) {
            uploadPath = galleryDir;
        } else if (req.route.path.includes('/categories')) {
            uploadPath = categoriesDir;
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Helper function to process and optimize images
async function processImage(inputPath, outputPath, maxWidth = 800, quality = 80) {
    try {
        await sharp(inputPath)
            .resize(maxWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .jpeg({ quality })
            .toFile(outputPath);
        
        // Remove original if different from output
        if (inputPath !== outputPath) {
            await fs.remove(inputPath);
        }
        
        return outputPath;
    } catch (error) {
        console.error('Image processing error:', error);
        return inputPath; // Return original if processing fails
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId && req.session.isAuthenticated) {
        return next();
    } else {
        return res.status(401).json({ 
            error: 'Authentication required',
            redirect: '/login.html'
        });
    }
}

// Middleware to check if user is authenticated for admin pages
function checkAuthForAdminPages(req, res, next) {
    const adminPages = [
        '/Admin.html',
        '/admin-gallery.html', 
        '/admin-menu.html',
        '/Menu_Admin.html'
    ];
    
    if (adminPages.includes(req.path)) {
        if (!(req.session && req.session.userId && req.session.isAuthenticated)) {
            return res.redirect('/login.html');
        }
    }
    next();
}

// Apply auth check middleware to static files
app.use(checkAuthForAdminPages);

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        db.get("SELECT * FROM users WHERE email = ? AND is_active = 1", [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            
            try {
                // Verify password
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                
                if (!isValidPassword) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }
                
                // Create session
                req.session.userId = user.id;
                req.session.userEmail = user.email;
                req.session.userName = `${user.first_name} ${user.last_name}`;
                req.session.userRole = user.role;
                req.session.isAuthenticated = true;
                
                // Set session duration based on remember me
                if (rememberMe) {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                } else {
                    req.session.cookie.maxAge = 8 * 60 * 60 * 1000; // 8 hours
                }
                
                // Update last login
                db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
                
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: {
                        id: user.id,
                        email: user.email,
                        name: `${user.first_name} ${user.last_name}`,
                        role: user.role
                    }
                });
                
            } catch (passwordError) {
                console.error('Password verification error:', passwordError);
                return res.status(500).json({ error: 'Authentication failed' });
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logout successful' });
    });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    db.get("SELECT id, first_name, last_name, email, role, last_login FROM users WHERE id = ?", 
        [req.session.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            lastLogin: user.last_login
        });
    });
});

// API Routes

// Categories endpoints
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY display_order ASC", (err, rows) => {
        if (err) {
            console.error('Error fetching categories:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`Fetched ${rows.length} categories for public view.`);
        res.json(rows);
    });
});


app.post('/api/categories', requireAuth, (req, res) => {
    const { name, description, color, icon, display_order } = req.body;
    const id = uuidv4();
    
    const stmt = db.prepare(`INSERT INTO categories (id, name, description, color, icon, display_order) 
                           VALUES (?, ?, ?, ?, ?, ?)`);
    
    stmt.run([id, name, description, color, icon, display_order], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Return the created category
        db.get("SELECT * FROM categories WHERE id = ?", [id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
    
    stmt.finalize();
});

app.put('/api/categories/:id', requireAuth, (req, res) => {
    const { name, description, color, icon, display_order } = req.body;
    const categoryId = req.params.id;
    
    const stmt = db.prepare(`UPDATE categories 
                           SET name = ?, description = ?, color = ?, icon = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP 
                           WHERE id = ?`);
    
    stmt.run([name, description, color, icon, display_order, categoryId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        
        // Return updated category
        db.get("SELECT * FROM categories WHERE id = ?", [categoryId], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        });
    });
    
    stmt.finalize();
});

app.delete('/api/categories/:id', requireAuth, (req, res) => {
    const categoryId = req.params.id;
    
    // Check if any menu items use this category
    db.get("SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?", [categoryId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row.count > 0) {
            res.status(400).json({ error: `Cannot delete category. ${row.count} menu items are using this category.` });
            return;
        }
        
        // Delete category
        db.run("DELETE FROM categories WHERE id = ?", [categoryId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            
            res.json({ message: 'Category deleted successfully' });
        });
    });
});

// Menu items endpoints
app.get('/api/menu-items', (req, res) => {
    const query = `
        SELECT m.*, c.name as category_name, c.color as category_color 
        FROM menu_items m 
        LEFT JOIN categories c ON m.category_id = c.id 
        ORDER BY m.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error fetching menu items:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`Fetched ${rows.length} menu items for public view.`);
        res.json(rows);
    });
});

app.post('/api/menu-items', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category_id, available, featured } = req.body;
        const id = uuidv4();
        let imagePath = null;
        
        if (req.file) {
            const processedPath = path.join(menuDir, `processed_${req.file.filename}`);
            await processImage(req.file.path, processedPath);
            imagePath = `/uploads/menu/processed_${req.file.filename}`;
        }
        
        const stmt = db.prepare(`INSERT INTO menu_items (id, name, description, price, category_id, image_path, available, featured) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        
        stmt.run([
            id, 
            name, 
            description, 
            parseFloat(price), 
            category_id, 
            imagePath, 
            available === 'true' ? 1 : 0, 
            featured === 'true' ? 1 : 0
        ], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Return the created menu item with category info
            const query = `
                SELECT m.*, c.name as category_name, c.color as category_color 
                FROM menu_items m 
                LEFT JOIN categories c ON m.category_id = c.id 
                WHERE m.id = ?
            `;
            
            db.get(query, [id], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.status(201).json(row);
            });
        });
        
        stmt.finalize();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/menu-items/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category_id, available, featured } = req.body;
        const itemId = req.params.id;
        let imagePath = null;
        
        // Get current item to check for existing image
        db.get("SELECT image_path FROM menu_items WHERE id = ?", [itemId], async (err, currentItem) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!currentItem) {
                res.status(404).json({ error: 'Menu item not found' });
                return;
            }
            
            // Handle new image upload
            if (req.file) {
                const processedPath = path.join(menuDir, `processed_${req.file.filename}`);
                await processImage(req.file.path, processedPath);
                imagePath = `/uploads/menu/processed_${req.file.filename}`;
                
                // Delete old image if exists
                if (currentItem.image_path) {
                    const oldImagePath = path.join(__dirname, currentItem.image_path.replace('/uploads/', 'uploads/'));
                    fs.remove(oldImagePath).catch(console.error);
                }
            } else {
                imagePath = currentItem.image_path; // Keep existing image
            }
            
            const stmt = db.prepare(`UPDATE menu_items 
                                   SET name = ?, description = ?, price = ?, category_id = ?, image_path = ?, available = ?, featured = ?, updated_at = CURRENT_TIMESTAMP 
                                   WHERE id = ?`);
            
            stmt.run([
                name, 
                description, 
                parseFloat(price), 
                category_id, 
                imagePath, 
                available === 'true' ? 1 : 0, 
                featured === 'true' ? 1 : 0, 
                itemId
            ], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                if (this.changes === 0) {
                    res.status(404).json({ error: 'Menu item not found' });
                    return;
                }
                
                // Return updated menu item with category info
                const query = `
                    SELECT m.*, c.name as category_name, c.color as category_color 
                    FROM menu_items m 
                    LEFT JOIN categories c ON m.category_id = c.id 
                    WHERE m.id = ?
                `;
                
                db.get(query, [itemId], (err, row) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json(row);
                });
            });
            
            stmt.finalize();
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/menu-items/:id', requireAuth, (req, res) => {
    const itemId = req.params.id;
    
    // Get item to delete associated image
    db.get("SELECT image_path FROM menu_items WHERE id = ?", [itemId], (err, item) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!item) {
            res.status(404).json({ error: 'Menu item not found' });
            return;
        }
        
        // Delete menu item
        db.run("DELETE FROM menu_items WHERE id = ?", [itemId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Delete associated image
            if (item.image_path) {
                const imagePath = path.join(__dirname, item.image_path.replace('/uploads/', 'uploads/'));
                fs.remove(imagePath).catch(console.error);
            }
            
            res.json({ message: 'Menu item deleted successfully' });
        });
    });
});

// Gallery endpoints
app.get('/api/gallery', (req, res) => {
    db.all("SELECT * FROM gallery_images ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/gallery', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const uploadedImages = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const { title, description, type, featured } = req.body;
            const id = uuidv4();
            
            // Process image
            const processedPath = path.join(galleryDir, `processed_${file.filename}`);
            await processImage(file.path, processedPath);
            const imagePath = `/uploads/gallery/processed_${file.filename}`;
            
            // Get file stats
            const stats = await fs.stat(processedPath);
            
            const stmt = db.prepare(`INSERT INTO gallery_images (id, title, description, image_path, type, featured, file_size) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?)`);
            
            await new Promise((resolve, reject) => {
                stmt.run([
                    id, 
                    Array.isArray(title) ? title[i] : title || file.originalname.split('.')[0], 
                    Array.isArray(description) ? description[i] : description || '', 
                    imagePath, 
                    Array.isArray(type) ? type[i] : type || 'food', 
                    Array.isArray(featured) ? (featured[i] === 'true' ? 1 : 0) : (featured === 'true' ? 1 : 0), 
                    stats.size
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            stmt.finalize();
            
            // Get the inserted image
            const insertedImage = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM gallery_images WHERE id = ?", [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            uploadedImages.push(insertedImage);
        }
        
        res.status(201).json(uploadedImages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/gallery/:id', requireAuth, (req, res) => {
    const { title, description, type, featured } = req.body;
    const imageId = req.params.id;
    
    const stmt = db.prepare(`UPDATE gallery_images 
                           SET title = ?, description = ?, type = ?, featured = ?, updated_at = CURRENT_TIMESTAMP 
                           WHERE id = ?`);
    
    stmt.run([title, description, type, featured ? 1 : 0, imageId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Image not found' });
            return;
        }
        
        // Return updated image
        db.get("SELECT * FROM gallery_images WHERE id = ?", [imageId], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        });
    });
    
    stmt.finalize();
});

app.delete('/api/gallery/:id', requireAuth, (req, res) => {
    const imageId = req.params.id;
    
    // Get image to delete file
    db.get("SELECT image_path FROM gallery_images WHERE id = ?", [imageId], (err, image) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!image) {
            res.status(404).json({ error: 'Image not found' });
            return;
        }
        
        // Delete from database
        db.run("DELETE FROM gallery_images WHERE id = ?", [imageId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Delete file
            const imagePath = path.join(__dirname, image.image_path.replace('/uploads/', 'uploads/'));
            fs.remove(imagePath).catch(console.error);
            
            res.json({ message: 'Image deleted successfully' });
        });
    });
});

// Users endpoints (basic implementation)
app.get('/api/users', requireAuth, (req, res) => {
    db.all("SELECT * FROM users ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/users', requireAuth, (req, res) => {
    const { first_name, last_name, email, role } = req.body;
    const id = uuidv4();
    
    const stmt = db.prepare(`INSERT INTO users (id, first_name, last_name, email, role) 
                           VALUES (?, ?, ?, ?, ?)`);
    
    stmt.run([id, first_name, last_name, email, role || 'customer'], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
    
    stmt.finalize();
});

app.put('/api/users/:id', requireAuth, (req, res) => {
    const { first_name, last_name, email, role } = req.body;
    const userId = req.params.id;
    
    const stmt = db.prepare(`UPDATE users 
                           SET first_name = ?, last_name = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP 
                           WHERE id = ?`);
    
    stmt.run([first_name, last_name, email, role, userId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        });
    });
    
    stmt.finalize();
});

app.delete('/api/users/:id', requireAuth, (req, res) => {
    const userId = req.params.id;
    
    db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        
        res.json({ message: 'User deleted successfully' });
    });
});

// Statistics endpoint
app.get('/api/stats', requireAuth, (req, res) => {
    const stats = {};
    
    // Get menu items count
    db.get("SELECT COUNT(*) as count FROM menu_items", (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.menuItems = result.count;
        
        // Get categories count
        db.get("SELECT COUNT(*) as count FROM categories", (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.categories = result.count;
            
            // Get gallery images count
            db.get("SELECT COUNT(*) as count FROM gallery_images", (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.galleryImages = result.count;
                
                // Get users count
                db.get("SELECT COUNT(*) as count FROM users", (err, result) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.users = result.count;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// ===== BOOKING API ROUTES =====

// Create a new booking
app.post('/api/bookings', (req, res) => {
    const {
        customer_name,
        customer_email,
        customer_phone,
        event_type,
        event_date,
        event_time,
        location,
        meal_type,
        occasion,
        dietary_restrictions,
        food_style,
        additional_info,
        selected_dishes,
        total_amount
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone || !event_date) {
        return res.status(400).json({ 
            error: 'Missing required fields: customer_name, customer_email, customer_phone, event_date' 
        });
    }

    const bookingId = Date.now().toString();
    const dishesJson = selected_dishes ? JSON.stringify(selected_dishes) : null;

    const query = `
        INSERT INTO bookings (
            id, customer_name, customer_email, customer_phone, event_type, event_date,
            event_time, location, meal_type, occasion, dietary_restrictions, food_style,
            additional_info, selected_dishes, total_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.run(query, [
        bookingId, customer_name, customer_email, customer_phone, event_type, event_date,
        event_time, location, meal_type, occasion, dietary_restrictions, food_style,
        additional_info, dishesJson, total_amount
    ], function(err) {
        if (err) {
            console.error('Booking creation error:', err);
            return res.status(500).json({ error: 'Failed to create booking' });
        }

        console.log(`New booking created: ${bookingId} for ${customer_name}`);
        res.status(201).json({ 
            message: 'Booking created successfully',
            bookingId: bookingId,
            status: 'pending'
        });
    });
});

// Get all bookings (for admin)
app.get('/api/bookings', requireAuth, (req, res) => {
    const { status } = req.query;
    
    let query = 'SELECT * FROM bookings';
    const params = [];
    
    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }

        // Parse selected_dishes JSON for each booking
        const bookings = rows.map(booking => ({
            ...booking,
            selected_dishes: booking.selected_dishes ? JSON.parse(booking.selected_dishes) : null
        }));

        res.json(bookings);
    });
});

// Get a specific booking
app.get('/api/bookings/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Failed to fetch booking' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Parse selected_dishes JSON
        const booking = {
            ...row,
            selected_dishes: row.selected_dishes ? JSON.parse(row.selected_dishes) : null
        };

        res.json(booking);
    });
});

// Update booking status
app.put('/api/bookings/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    // Valid statuses
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    let query = 'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [status];

    if (notes) {
        query += ', additional_info = ?';
        params.push(notes);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating booking:', err);
            return res.status(500).json({ error: 'Failed to update booking' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        console.log(`Booking ${id} status updated to: ${status}`);
        res.json({ 
            message: 'Booking updated successfully',
            status: status
        });
    });
});

// Delete a booking
app.delete('/api/bookings/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM bookings WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting booking:', err);
            return res.status(500).json({ error: 'Failed to delete booking' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        console.log(`Booking deleted: ${id}`);
        res.json({ message: 'Booking deleted successfully' });
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Chef Stefan Admin Server running on http://localhost:${PORT}`);
        console.log(`Database: ${dbPath}`);
        console.log(`Uploads directory: ${uploadsDir}`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});