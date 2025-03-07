#!/bin/bash

# Script to test the build process locally

echo "🧹 Cleaning up previous builds..."
rm -rf dist

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building the application..."
npm run build

echo "✅ Build completed! Output is in the 'dist' directory."
echo "📂 Contents of the dist directory:"
ls -la dist

echo "🚀 To test the production build locally, run: npm start" 