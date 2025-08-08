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
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                image VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                image VARCHAR(255),
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                is_available BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS gallery_items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                image VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR NOT NULL COLLATE "default",
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            )
            WITH (OIDS=FALSE)
        `);

        await query(`
            ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire)
        `);

        console.log('Database tables initialized successfully');
    } catch (err) {
        if (err.message.includes('already exists')) {
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