const { initializeDatabase } = require('./database');
const bcrypt = require('bcryptjs');
const { query } = require('./database');

async function migrate() {
    try {
        console.log('Starting database migration...');
        
        // Initialize database tables
        await initializeDatabase();
        
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrate();
}

module.exports = { migrate };