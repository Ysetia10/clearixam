#!/bin/bash

# CleariXam Frontend Deployment Script

echo "🚀 Starting CleariXam Frontend Deployment..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run production build
echo "🔨 Building for production..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📊 Build output:"
    ls -lh dist/
    echo ""
    echo "🎉 Frontend is ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy dist/ folder to your hosting service"
    echo "2. Set environment variable: VITE_API_BASE_URL=https://clearixam-backend.onrender.com/api"
    echo "3. Test the deployment"
else
    echo ""
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi
