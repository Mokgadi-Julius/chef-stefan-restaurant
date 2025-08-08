const bcrypt = require('bcryptjs');
const { query } = require('./database');

async function createAdminUser() {
    const email = 'admin@privatechefstefan.co.za';
    const password = '@dmin@123';
    const firstName = 'Admin';
    const lastName = 'User';
    const role = 'admin';

    try {
        // Check if admin user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            console.log(`Admin user '${email}' already exists.`);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await query(
            'INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [firstName, lastName, email, hashedPassword, role]
        );

        console.log(`Admin user '${email}' created successfully with ID: ${result.rows[0].id}`);
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
