#!/bin/bash

# Set the Railway PostgreSQL DATABASE_URL you provided
export DATABASE_URL="postgresql://postgres:hdbThBinRSZWakoEMDsjtRldJWzigttv@centerbeam.proxy.rlwy.net:18118/railway"
export NODE_ENV="production"
export SESSION_SECRET="your-secure-session-secret-2024"

echo "🔍 Testing database connection..."
npm run test-db

echo ""
echo "🏗️ Creating database tables..."
npm run migrate

echo ""
echo "👤 Creating admin user..."
npm run create-admin

echo ""
echo "✅ Verifying setup..."
npm run verify

echo ""
echo "🎉 Database setup complete!"
echo "📧 Admin Login: info@privatechefstefan.co.za"
echo "🔑 Password: @dmin@123"