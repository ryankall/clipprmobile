# Replit-Local Sync Setup for Clippr

## Recommended Approach: Git + Webhook Sync

### 1. Initial Setup
```bash
# In Replit Shell
git init
git add .
git commit -m "Initial Clippr project"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/clippr.git
git push -u origin main
```

### 2. Local Setup
```bash
# On your local machine
git clone https://github.com/yourusername/clippr.git
cd clippr/mobile
npm install
```

### 3. Auto-Sync Script (Optional)
Create a script to watch for changes and auto-sync:

```bash
#!/bin/bash
# watch-sync.sh
while true; do
    git pull origin main
    sleep 10
done
```

### 4. Development Workflow

#### From Replit to Local:
1. Make changes in Replit
2. In Replit Shell: `git add . && git commit -m "Update" && git push`
3. In Local: `git pull`
4. React Native hot reload updates automatically

#### From Local to Replit:
1. Make changes locally
2. In Local: `git add . && git commit -m "Update" && git push`
3. In Replit: `git pull`
4. Replit auto-restarts the backend

### 5. Real-time Development
```
┌─────────────────┐    Git Sync    ┌─────────────────┐
│  Replit         │ ←──────────────→ │  Local Machine  │
│  Backend API    │                 │  Mobile App     │
│  (Node.js)      │                 │  (React Native) │
│  Auto-restart   │                 │  Hot Reload     │
└─────────────────┘                 └─────────────────┘
```

## Alternative: Replit Desktop App

1. Download Replit Desktop from replit.com
2. Open your workspace in desktop app
3. Better file system integration
4. Local file access while keeping cloud benefits

## Quick Start Commands

### Setup (One-time):
```bash
# In Replit
git init && git add . && git commit -m "Initial"

# On Local
git clone YOUR_REPO_URL
cd clippr/mobile && npm install
```

### Daily Workflow:
```bash
# Sync changes
git pull  # Get latest changes
git add . && git commit -m "Update" && git push  # Share changes

# Run mobile app
npx expo start
```

This gives you the best of both worlds: Replit's cloud backend with local React Native development!