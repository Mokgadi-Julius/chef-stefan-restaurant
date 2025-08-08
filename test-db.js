const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
    try {
        console.log('Testing database connection...');
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Available' : 'Not set');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        
        const client = await pool.connect();
        console.log('✅ Database connection successful!');
        
        const result = await client.query('SELECT NOW()');
        console.log('✅ Query test successful:', result.rows[0]);
        
        // Test if tables exist
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('📋 Existing tables:', tables.rows.map(row => row.table_name));
        
        client.release();
        await pool.end();
        
        console.log('🎉 Database test completed successfully!');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

testConnection();