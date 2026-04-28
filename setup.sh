#!/bin/bash
set -e

echo "🚀 InterviewPro — Setup Script"
echo "================================"

# Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the app:"
echo "  Terminal 1:  cd backend  && npm run dev"
echo "  Terminal 2:  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
