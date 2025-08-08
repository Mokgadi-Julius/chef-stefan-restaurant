# Chef Stefan - Complete Restaurant Admin Panel

A fully functional restaurant management system with a modern admin panel for managing menus, categories, gallery, and users. Built with Node.js, Express, SQLite, and a responsive frontend with real database connectivity and image upload capabilities.

## 🌟 About the Project

Chef Stefan Admin Panel is a complete restaurant management solution that provides administrators with full control over their restaurant's digital presence. Unlike template systems, this is a working application with real database connectivity, file uploads, and production-ready features.

## 🚀 Features

### 📊 **Dashboard**
- Real-time statistics and overview
- Recent menu items display
- System status monitoring
- Quick action buttons

### 🍽️ **Menu Management**  
- Add/edit/delete menu items with images
- Automatic image optimization and resizing
- Category assignment and filtering
- Price management and currency formatting
- Availability and featured item toggles
- Advanced search and sort functionality
- Bulk operations support

### 🏷️ **Category Management**
- Create and customize food categories
- Color coding and icon assignment
- Display order management
- Category descriptions and metadata
- Visual category cards interface

### 🖼️ **Gallery Management**
- Drag-and-drop multiple image upload
- Image categorization (food, restaurant, chef, events)
- Featured image settings
- Search and filter gallery
- Automatic image optimization
- Storage usage statistics
- Batch image operations

### 👥 **User Management**
- Complete CRUD operations for users
- User roles and permissions
- Activity tracking and timestamps

### 🔧 **Technical Features**
- **Backend**: Node.js + Express with comprehensive API
- **Database**: SQLite with automatic schema creation
- **Image Processing**: Sharp for optimization and resizing
- **File Upload**: Multer with comprehensive validation
- **Security**: Helmet, CORS, input sanitization
- **API**: RESTful endpoints with proper error handling
- **Frontend**: Modern JavaScript with Bootstrap 5
- **Responsive**: Mobile-first responsive design
- **Real-time**: Live updates and notifications

## 💻 Technologies Used

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5
- **Image Processing**: Sharp
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **UI/UX**: Font Awesome, Bootstrap Icons
- **Database**: SQLite with automatic migrations

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## 🛠️ Installation & Setup

1. **Clone or download the project**
   ```bash
   cd Chef-Stefan
   ```

2. **Run the setup script**
   ```bash
   node setup.js
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Main website: `http://localhost:3000`
   - Admin Dashboard: `http://localhost:3000/admin-dashboard.html`
   - Menu Management: `http://localhost:3000/admin-menu.html`
   - Category Management: `http://localhost:3000/admin-categories.html`
   - Gallery Management: `http://localhost:3000/admin-gallery.html`
   - User Management: `http://localhost:3000/Admin.html`

## 🎯 Key Features That Work

✅ **Real Database Connectivity** - SQLite database with full CRUD operations  
✅ **Image Upload & Storage** - Real file uploads with automatic optimization  
✅ **API Endpoints** - Complete RESTful API with proper error handling  
✅ **Data Persistence** - All data saved to database, not localStorage  
✅ **File Management** - Organized file structure with automatic directory creation  
✅ **Image Processing** - Automatic image resizing and optimization  
✅ **Form Validation** - Both client-side and server-side validation  
✅ **Error Handling** - Comprehensive error handling and user feedback  
✅ **Responsive Design** - Works perfectly on desktop and mobile  
✅ **Production Ready** - Includes security headers, compression, and optimization  

## 📁 Project Structure

```
Chef-Stefan/
├── public/                     # Frontend files
│   ├── admin-dashboard.html    # Main dashboard
│   ├── admin-menu.html         # Menu management
│   ├── admin-categories.html   # Category management
│   ├── admin-gallery.html      # Gallery management  
│   ├── Admin.html              # User management
│   ├── index.html              # Main website
│   └── assets/
│       ├── css/                # Stylesheets
│       ├── js/                 # JavaScript files
│       │   ├── api-client.js   # API communication layer
│       │   └── menu-data.js    # Data management utilities
│       └── img/                # Static images
├── uploads/                    # Uploaded files (auto-created)
│   ├── menu/                   # Menu item images
│   ├── gallery/                # Gallery images
│   └── categories/             # Category images
├── server.js                   # Main server file with all APIs
├── package.json                # Dependencies and scripts
├── setup.js                    # Automated setup script
└── chef_stefan.db              # SQLite database (auto-created)
```

## 🔗 API Endpoints

All endpoints return JSON and include proper error handling:

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Menu Items
- `GET /api/menu-items` - Get all menu items with category info
- `POST /api/menu-items` - Create menu item (with image upload)
- `PUT /api/menu-items/:id` - Update menu item (with image upload)
- `DELETE /api/menu-items/:id` - Delete menu item

### Gallery
- `GET /api/gallery` - Get all gallery images
- `POST /api/gallery` - Upload multiple images
- `PUT /api/gallery/:id` - Update image details
- `DELETE /api/gallery/:id` - Delete image

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Statistics
- `GET /api/stats` - Get real-time dashboard statistics

## 🎯 Usage Guide

### Adding Menu Items
1. Go to **Menu Management** page
2. Click **"Add Menu Item"**
3. Fill in details (name, price, description, category)
4. Upload an image (optional, automatically optimized)
5. Set availability and featured status
6. Click **"Add Menu Item"**

### Managing Categories
1. Go to **Categories** page
2. Click **"Add Category"**
3. Set name, description, color, and icon
4. Define display order
5. Click **"Add Category"**

### Uploading Gallery Images
1. Go to **Gallery** page
2. Click **"Upload Images"**
3. Drag and drop images or click to browse
4. Add titles and descriptions for each image
5. Set image types and featured status
6. Click **"Upload Images"**

## 🔒 Security Features

- File upload validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection with Helmet middleware
- CORS configuration for secure cross-origin requests
- Input validation and sanitization
- Secure file handling with type and size restrictions
- Error message sanitization to prevent information leakage

## ⚙️ Configuration

### Environment Variables
Copy `.env.example` to `.env` and customize:

```env
PORT=3000
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,webp
```

### File Upload Limits
- Maximum file size: 10MB per file
- Supported formats: JPEG, JPG, PNG, GIF, WebP
- Images are automatically optimized and resized

### Database
- Uses SQLite by default (no setup required)
- Database file: `chef_stefan.db`
- Automatic schema creation and sample data insertion

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Change port in package.json or set environment variable
PORT=3001 npm start
```

**Database errors:**
- Delete `chef_stefan.db` to reset database
- Run `node setup.js` to recreate directories

**Image upload fails:**
- Check file size (max 10MB)
- Verify file format is supported
- Ensure `uploads/` directory exists and is writable

**Permission errors:**
```bash
# Fix directory permissions
chmod -R 755 uploads/
```

## 🚀 Production Deployment

The system is production-ready with:
- Compression middleware for faster loading
- Security headers via Helmet
- Proper error handling and logging
- File upload limits and validation
- Database connection pooling
- Image optimization to reduce bandwidth

### Production Setup
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up automated backups for database

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Development

### Adding New API Endpoints
1. Add route in `server.js`
2. Create corresponding database operations
3. Update `api-client.js` with new methods
4. Add frontend functionality

### Database Schema Changes
1. Modify table creation in `initializeDatabase()`
2. Add migration logic if needed
3. Update API endpoints accordingly
4. Test with fresh database

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## ✨ Credits

Built with:
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Express](https://expressjs.com/) - Web framework
- [SQLite](https://sqlite.org/) - Database
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing  
- [Bootstrap](https://getbootstrap.com/) - UI framework
- [Font Awesome](https://fontawesome.com/) - Icons

---

**Chef Stefan Admin Panel** - A complete, working restaurant management solution 🍽️