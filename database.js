const { Pool } = require('pg');

// Only create pool if DATABASE_URL is available
let pool = null;

if (process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
} else {
    console.log('No DATABASE_URL found. Database operations will be skipped in development.');
}

const query = async (text, params) => {
    if (!pool) {
        throw new Error('Database connection not available. Ensure DATABASE_URL is set.');
    }
    
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('Database query error', err);
        throw err;
    }
};

const initializeDatabase = async () => {
    if (!pool) {
        console.log('Skipping database initialization - no DATABASE_URL available');
        return;
    }
    
    try {
        // Categories table - exact match to SQLite version
        await query(`
            CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                color VARCHAR(50) DEFAULT '#3498db',
                icon VARCHAR(100) DEFAULT 'fas fa-utensils',
                display_order INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Menu items table - exact match to SQLite version
        await query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category_id VARCHAR(255),
                image_path VARCHAR(500),
                available BOOLEAN DEFAULT true,
                featured BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
            )
        `);

        // Gallery images table - exact match to SQLite version  
        await query(`
            CREATE TABLE IF NOT EXISTS gallery_images (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_path VARCHAR(500) NOT NULL,
                type VARCHAR(50) DEFAULT 'food',
                featured BOOLEAN DEFAULT false,
                file_size INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Users table - exact match to SQLite version
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bookings table - exact match to SQLite version
        await query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50) NOT NULL,
                event_type VARCHAR(100),
                event_date VARCHAR(50) NOT NULL,
                event_time VARCHAR(50),
                location TEXT,
                meal_type VARCHAR(100),
                occasion VARCHAR(100),
                dietary_restrictions TEXT,
                food_style VARCHAR(100),
                additional_info TEXT,
                selected_dishes TEXT,
                total_amount DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Sessions table for connect-pg-simple
        await query(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            )
        `).catch(() => {}); // Ignore if exists

        await query(`
            CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire)
        `);

        // Contacts table for storing contact form submissions
        await query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(() => {}); // Ignore if exists

        console.log('Database tables initialized successfully');
    } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('relation') && err.message.includes('already exists')) {
            console.log('Database tables already exist');
        } else {
            console.error('Error initializing database:', err);
            throw err;
        }
    }
};

module.exports = {
    query,
    pool,
    initializeDatabase
};