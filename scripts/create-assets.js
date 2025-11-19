// Simple script to create placeholder assets
// Run with: node scripts/create-assets.js

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple placeholder note
const placeholderNote = `# Placeholder Assets

These are placeholder files. Replace them with actual assets:
- icon.png (1024x1024)
- splash.png (1284x2778)
- adaptive-icon.png (1024x1024)
- favicon.png (48x48)

For now, Expo will use default placeholders if these are missing.
`;

fs.writeFileSync(path.join(assetsDir, 'README.txt'), placeholderNote);
console.log('Created assets directory with README');

