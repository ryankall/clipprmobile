#!/bin/bash

# Mobile Web App Initialization Script
echo "Initializing Clippr Mobile Web App..."

# Navigate to mobile web directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm install

# Initialize Tailwind CSS
echo "Initializing Tailwind CSS..."
npx tailwindcss init -p

echo "Mobile web app initialized successfully!"
echo "Run 'npm run dev' to start the development server."