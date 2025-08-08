const fs = require('fs-extra');
const path = require('path');

async function setup() {
    console.log('🍽️  Setting up Chef Stefan Admin System...\n');

    try {
        // Create necessary directories
        const dirs = [
            'uploads',
            'uploads/menu',
            'uploads/gallery', 
            'uploads/categories'
        ];

        console.log('📁 Creating upload directories...');
        for (const dir of dirs) {
            await fs.ensureDir(dir);
            console.log(`   ✓ Created ${dir}/`);
        }

        // Create .gitignore if it doesn't exist
        const gitignoreContent = `
# Node modules
node_modules/

# Database
*.db
*.sqlite

# Uploads (uncomment to ignore uploaded files)
# uploads/

# Logs
logs/
*.log

# Environment variables
.env
.env.local
.env.production

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Temporary files
tmp/
temp/
`;

        if (!await fs.pathExists('.gitignore')) {
            await fs.writeFile('.gitignore', gitignoreContent.trim());
            console.log('   ✓ Created .gitignore');
        }

        // Create a sample environment file
        const envContent = `
# Chef Stefan Admin Configuration
PORT=3000

# Database Configuration (SQLite is used by default)
# Uncomment and modify if using a different database
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=chef_stefan
# DB_USER=your_username
# DB_PASS=your_password

# File Upload Settings
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,webp

# Security Settings (for production)
# JWT_SECRET=your-super-secret-jwt-key
# SESSION_SECRET=your-session-secret
`;

        if (!await fs.pathExists('.env.example')) {
            await fs.writeFile('.env.example', envContent.trim());
            console.log('   ✓ Created .env.example');
        }

        console.log('\n🎉 Setup completed successfully!\n');
        console.log('Next steps:');
        console.log('1. Install dependencies: npm install');
        console.log('2. Start the server: npm start');
        console.log('3. Open your browser to: http://localhost:3000');
        console.log('\nFor development with auto-reload: npm run dev\n');
        
        console.log('📋 Admin Panel Features:');
        console.log('   • Dashboard: Overview and statistics');
        console.log('   • Menu Management: Add/edit/delete menu items with images');
        console.log('   • Categories: Organize menu items by categories');
        console.log('   • Gallery: Upload and manage restaurant photos');
        console.log('   • Users: Basic user management');
        console.log('   • Real-time updates with SQLite database');
        console.log('   • Automatic image optimization and resizing');
        console.log('   • Responsive design for mobile and desktop\n');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup
setup();