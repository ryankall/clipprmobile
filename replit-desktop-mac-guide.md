# Finding Replit Desktop Files on Mac

## Common Locations to Check

### 1. User Library (Most Common)
```bash
~/Library/Application Support/Replit/
```

### 2. Alternative Locations
```bash
# Check these locations:
~/Library/Containers/com.replit.desktop/Data/Library/Application Support/Replit/
~/Documents/Replit/
~/.replit/
```

## How to Find Your Files

### Method 1: Using Finder
1. Open **Finder**
2. Press `Cmd + Shift + G` (Go to Folder)
3. Type: `~/Library/Application Support/`
4. Look for a **Replit** folder

### Method 2: Using Terminal
```bash
# Search for Replit folders
find ~ -name "*replit*" -type d 2>/dev/null

# Or check specific locations
ls -la ~/Library/Application\ Support/ | grep -i replit
ls -la ~/Library/Containers/ | grep -i replit
```

### Method 3: Check Replit Desktop Settings
1. Open **Replit Desktop**
2. Go to **Preferences/Settings**
3. Look for **"Workspace Location"** or **"Local Files"**
4. This will show you where files are stored

## Alternative: Direct Access in Replit Desktop

### Option A: Open in External Editor
1. Right-click the `mobile` folder in Replit Desktop
2. Select **"Open with External Editor"**
3. Choose your preferred editor (VS Code, etc.)

### Option B: Terminal in Replit Desktop
1. Open **Terminal** tab in Replit Desktop
2. Navigate to mobile folder: `cd mobile`
3. Run: `pwd` to see the full path
4. Run: `open .` to open in Finder

## Quick Setup Commands

Once you find the path:
```bash
# Replace PATH_TO_MOBILE with your actual path
cd PATH_TO_MOBILE
npm install
npx expo start
```

## If Files Not Found Locally

If Replit Desktop isn't storing files locally, you can:

1. **Export from Replit Desktop**:
   - File → Export → Download as ZIP
   - Extract to your desired location

2. **Use Git Clone** (recommended):
   ```bash
   # In Replit Desktop terminal
   git init
   git add .
   git commit -m "Initial commit"
   
   # Then clone to local location
   git clone YOUR_REPO_URL ~/Desktop/clippr
   ```

Let me know what you find and I'll help you set up the mobile development!