# 🍽️ Chef Stefan's Website - Complete Setup Guide

## 🚀 Quick Start

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm run simple
   ```

4. **Access your website:**
   - **🌐 Main Website**: `http://localhost:3000`
   - **🖼️ Gallery Page**: `http://localhost:3000/gallery.html`
   - **👨‍💼 Admin Panel**: `http://localhost:3000/admin/dashboard.html`
   - **📱 Gallery Admin**: `http://localhost:3000/admin/gallery.html`

## 📋 Features Overview

### ✅ Frontend
- **Dynamic Homepage Gallery** - Shows selected images from admin
- **Beautiful Gallery Page** - Full gallery with filtering and dual layouts
- **Contact Forms** - Working contact and booking forms
- **Responsive Design** - Mobile-friendly throughout

### ✅ Admin Panel
- **Gallery Management** - Upload, organize, and control image display
- **User Management** - Manage website users
- **Content Control** - Toggle featured status and homepage display
- **Real-time Updates** - Changes reflect immediately on website

### ✅ Backend API
- **Image Upload** - Multer-powered file uploads with validation
- **JSON Storage** - File-based database (no MongoDB required)
- **CRUD Operations** - Full create, read, update, delete for all content
- **Error Handling** - Comprehensive error management

## 🎯 How to Use the Gallery System

### 1. **Upload Images (Admin)**
   - Go to: `http://localhost:3000/admin/gallery.html`
   - **Quick Upload**: Drag & drop images directly
   - **Detailed Upload**: Use "Upload Images" button for more control
   - Set category: Food, Events, Kitchen, General
   - Toggle "Featured" and "Display on Homepage" as needed

### 2. **Image Display Logic**
   - **Homepage Gallery**: Shows images marked "Display on Homepage" first
   - **Full Gallery**: Shows all images with filtering options
   - **Admin Control**: Toggle visibility with star (featured) and house (homepage) buttons

### 3. **Managing Content**
   - **Star Button** (⭐): Marks image as featured
   - **House Button** (🏠): Shows on homepage gallery
   - **Eye Button** (👁️): Preview image
   - **Trash Button** (🗑️): Delete image

## 🔧 Troubleshooting

### **Images not showing on homepage?**
1. Upload images via admin panel
2. Make sure "Display on Homepage" is checked
3. Refresh the homepage

### **Upload not working?**
1. Check file size (max 5MB)
2. Ensure image formats: JPG, PNG, GIF
3. Check console for error messages

### **Server not starting?**
1. Ensure you're in the `backend` directory
2. Run `npm install` first
3. Check port 3000 is not in use

## 📁 File Structure

```
Chef-Stefan/
├── backend/
│   ├── working-server.js     # Main server file
│   ├── package.json          # Dependencies
│   └── data/                 # JSON data storage
│       ├── gallery.json      # Image metadata
│       ├── users.json        # User data
│       ├── bookings.json     # Booking data
│       └── contacts.json     # Contact messages
├── public/
│   ├── index.html           # Main website
│   ├── gallery.html         # Full gallery page
│   ├── admin/               # Admin panel files
│   ├── assets/              # CSS, JS, images
│   └── uploads/             # User uploaded images
```

## 🎨 Customization

### **Change Gallery Layout**
- Edit `/public/gallery.html` for full gallery styling
- Modify `/public/assets/js/gallery.js` for homepage gallery behavior

### **Add New Categories**
- Update category options in `/public/admin/gallery.html`
- Add corresponding filters in `/public/gallery.html`

### **Modify Upload Limits**
- Edit `fileSize` limit in `/backend/working-server.js`
- Update validation in upload forms

## 🛡️ Security Notes

- File uploads are validated for image types only
- File size limited to 5MB
- No authentication system (add as needed for production)
- Runs on localhost for development

## 📝 API Endpoints

- `GET /api/gallery` - Get all images
- `POST /api/gallery` - Upload new image
- `PUT /api/gallery/:id` - Update image metadata
- `DELETE /api/gallery/:id` - Delete image
- `GET /api/users` - Get all users
- `POST /api/bookings` - Create booking
- `POST /api/contact` - Send contact message

## 🎯 Production Deployment

For production deployment:
1. Add authentication to admin routes
2. Use proper database (MongoDB/PostgreSQL)
3. Add image optimization
4. Implement proper error logging
5. Add HTTPS and security headers

---

**🍽️ Enjoy your professional Chef Stefan website!**