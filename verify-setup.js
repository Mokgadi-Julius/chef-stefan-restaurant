const { query } = require('./database');

async function verifySetup() {
    try {
        console.log('🔍 Verifying database setup...\n');

        // Check tables exist
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 Database Tables:');
        tables.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });

        if (tables.rows.length === 0) {
            console.log('❌ No tables found! Run: railway run npm run migrate');
            return;
        }

        // Check admin user exists
        const users = await query('SELECT id, email, role FROM users');
        console.log(`\n👥 Users (${users.rows.length} found):`);
        users.rows.forEach(user => {
            console.log(`   ✅ ${user.email} (${user.role})`);
        });

        if (users.rows.length === 0) {
            console.log('❌ No admin user found! Run: railway run npm run create-admin');
            return;
        }

        // Check categories exist
        const categories = await query('SELECT COUNT(*) as count FROM categories');
        console.log(`\n📂 Categories: ${categories.rows[0].count} found`);

        // Check menu items
        const menuItems = await query('SELECT COUNT(*) as count FROM menu_items');
        console.log(`🍽️ Menu Items: ${menuItems.rows[0].count} found`);

        // Check gallery images
        const galleryImages = await query('SELECT COUNT(*) as count FROM gallery_images');
        console.log(`📸 Gallery Images: ${galleryImages.rows[0].count} found`);

        // Check bookings
        const bookings = await query('SELECT COUNT(*) as count FROM bookings');
        console.log(`📅 Bookings: ${bookings.rows[0].count} found`);

        console.log('\n🎉 Database setup verification complete!');
        console.log('\n🔐 Admin Login Credentials:');
        console.log('   Email: info@privatechefstefan.co.za');
        console.log('   Password: @dmin@123');
        console.log('\n✨ Your app should now work correctly!');

    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        process.exit(1);
    }
}

verifySetup();