# Railway Deployment Guide

## 🚀 Quick Deploy

1. **Connect to Railway**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `chef-stefan-restaurant`

2. **Add PostgreSQL Database**
   - In your Railway dashboard
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

3. **Set Environment Variables**
   - Go to your service settings
   - Add these variables:
     ```
     NODE_ENV=production
     SESSION_SECRET=generate-secure-random-string
     ```

4. **Generate Session Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## 📋 Post-Deployment Setup

1. **Create Admin User**
   - After successful deployment, run:
   ```bash
   railway run npm run create-admin
   ```

2. **Default Admin Credentials**
   - Email: `admin@privatechefstefan.co.za`
   - Password: `@dmin@123`
   - **⚠️ Change these credentials immediately after first login!**

## 🔧 Features

- **PostgreSQL Database**: Production-ready with automatic migrations
- **Session Management**: Stored in PostgreSQL for persistence
- **Image Processing**: Sharp for optimized image uploads
- **File Storage**: Organized upload directories
- **Security**: Helmet, CORS, and secure session handling

## 📝 Scripts

- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run create-admin` - Create admin user
- `npm run dev` - Development with nodemon

## 🔍 Health Check

Visit `https://your-app.railway.app/health` to verify deployment

## 🗃️ Database Schema

- `users` - Admin users and authentication
- `categories` - Menu categories
- `menu_items` - Restaurant menu items
- `gallery_items` - Image gallery
- `sessions` - User sessions

## 🚨 Important Notes

1. **File Uploads**: Consider adding persistent volume or cloud storage for production
2. **Environment Variables**: Never commit secrets to repository
3. **Database Backups**: Set up regular PostgreSQL backups
4. **SSL/HTTPS**: Railway automatically provides HTTPS
5. **Logs**: Monitor Railway logs for any issues