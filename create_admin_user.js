const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, 'chef_stefan.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

async function createAdminUser() {
    const email = 'admin@privatechefstefan.co.za';
    const password = '@dmin@123';
    const firstName = 'Admin';
    const lastName = 'User';
    const role = 'admin';

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        db.run(`INSERT INTO users (id, first_name, last_name, email, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, firstName, lastName, email, hashedPassword, role, 1],
            function(err) {
                if (err) {
                    console.error('Error creating admin user:', err.message);
                } else {
                    console.log(`Admin user '${email}' created successfully.`);
                }
                db.close();
            });
    } catch (error) {
        console.error('Error hashing password or creating user:', error);
        db.close();
    }
}

createAdminUser();
