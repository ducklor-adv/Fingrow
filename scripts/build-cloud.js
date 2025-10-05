#!/usr/bin/env node

// Build script for cloud deployment (Render.com)
// This script prepares the application for deployment without better-sqlite3

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Preparing for cloud deployment...');

// Copy cloud-compatible files
const projectRoot = path.join(__dirname, '..');

try {
    // Copy cloud database config to replace the regular one
    const cloudDbPath = path.join(projectRoot, 'api/config/database.cloud.js');
    const regularDbPath = path.join(projectRoot, 'api/config/database.js');
    
    if (fs.existsSync(cloudDbPath)) {
        fs.copyFileSync(cloudDbPath, regularDbPath);
        console.log('✅ Replaced database.js with cloud-compatible version');
    }
    
    // Copy cloud server to replace the regular one
    const cloudServerPath = path.join(projectRoot, 'api/server.cloud.js');
    const regularServerPath = path.join(projectRoot, 'api/server.js');
    
    if (fs.existsSync(cloudServerPath)) {
        fs.copyFileSync(cloudServerPath, regularServerPath);
        console.log('✅ Replaced server.js with cloud-compatible version');
    }
    
    // Update package.json to remove better-sqlite3 dependency
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.dependencies['better-sqlite3']) {
        delete packageJson.dependencies['better-sqlite3'];
        delete packageJson.dependencies['sqlite3'];
        console.log('✅ Removed SQLite dependencies from package.json');
    }
    
    // Add cloud environment variables
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['start:cloud'] = 'node api/server.js';
    packageJson.scripts['build:cloud'] = 'node scripts/build-cloud.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json for cloud deployment');
    
    // Create data directory
    const dataDir = path.join(projectRoot, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('✅ Created data directory');
    }
    
    // Create uploads directories
    const uploadsDir = path.join(projectRoot, 'uploads');
    const profilesDir = path.join(uploadsDir, 'profiles');
    const productsDir = path.join(uploadsDir, 'products');
    const qrcodesDir = path.join(uploadsDir, 'qrcodes');
    
    [uploadsDir, profilesDir, productsDir, qrcodesDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    console.log('✅ Created upload directories');
    
    console.log('🎉 Cloud deployment preparation complete!');
    console.log('');
    console.log('Next steps for Render.com:');
    console.log('1. Push changes to your git repository');
    console.log('2. Connect your repository to Render.com');
    console.log('3. Set build command: npm run build:cloud && npm ci --only=production');
    console.log('4. Set start command: npm run start:cloud');
    console.log('5. Add environment variables as needed');
    
} catch (error) {
    console.error('❌ Error preparing for cloud deployment:', error);
    process.exit(1);
}