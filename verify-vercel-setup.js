#!/usr/bin/env node

/**
 * Verification script for Vercel migration
 * Run this to check if the migration is set up correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Vercel Migration Setup...\n');

let hasErrors = false;

// Check required files
const requiredFiles = [
  'vercel.json',
  'api/health.js',
  'api/auth/setup.js',
  'api/auth/status.js',
  'api/auth/logout.js',
  'api/books/search.js',
  'api/notion/databases.js',
  'api/user/profile.js',
  'api/_middleware/cors.js',
  'api/_middleware/auth.js',
  'api/_middleware/handler.js',
  'backend/src/utils/authToken.js',
  'backend/src/lib/axios.js',
  'backend/src/lib/errors.js',
  'backend/src/lib/notion.js',
  'backend/src/handlers/auth/setup.js',
  'backend/src/handlers/auth/status.js',
  'backend/src/handlers/auth/logout.js',
  'backend/src/handlers/books/search.js',
  'backend/src/handlers/notion/getDatabases.js',
  'backend/src/handlers/user/profile.js'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check package.json modifications
console.log('\n📦 Checking package.json...');
try {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

  if (rootPackage.scripts['vercel-dev']) {
    console.log('✅ vercel-dev script added');
  } else {
    console.log('❌ vercel-dev script missing');
    hasErrors = true;
  }

  if (rootPackage.scripts['build:vercel']) {
    console.log('✅ build:vercel script added');
  } else {
    console.log('❌ build:vercel script missing');
    hasErrors = true;
  }

  if (rootPackage.devDependencies && rootPackage.devDependencies.vercel) {
    console.log('✅ Vercel CLI dependency added');
  } else {
    console.log('❌ Vercel CLI dependency missing');
    hasErrors = true;
  }

  const backendPackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend/package.json'), 'utf8'));

  if (!backendPackage.dependencies['express-session']) {
    console.log('✅ express-session removed from backend');
  } else {
    console.log('❌ express-session still in backend dependencies');
    hasErrors = true;
  }

  if (backendPackage.dependencies['cookie-parser']) {
    console.log('✅ cookie-parser added to backend');
  } else {
    console.log('❌ cookie-parser missing from backend');
    hasErrors = true;
  }

} catch (error) {
  console.log('❌ Error reading package.json files:', error.message);
  hasErrors = true;
}

// Check vercel.json configuration
console.log('\n⚙️  Checking vercel.json...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));

  if (vercelConfig.builds && vercelConfig.builds.length >= 2) {
    console.log('✅ Build configurations present');
  } else {
    console.log('❌ Build configurations missing or incomplete');
    hasErrors = true;
  }

  if (vercelConfig.routes && vercelConfig.routes.length > 0) {
    console.log('✅ Route configurations present');
  } else {
    console.log('❌ Route configurations missing');
    hasErrors = true;
  }

} catch (error) {
  console.log('❌ Error reading vercel.json:', error.message);
  hasErrors = true;
}

// Check frontend API client updates
console.log('\n🌐 Checking frontend API client...');
try {
  const apiClient = fs.readFileSync(path.join(__dirname, 'frontend/src/utils/api.ts'), 'utf8');

  if (apiClient.includes('vercel.app') && apiClient.includes('relative API URLs')) {
    console.log('✅ Frontend API client updated for Vercel');
  } else {
    console.log('❌ Frontend API client not updated for Vercel');
    hasErrors = true;
  }

} catch (error) {
  console.log('❌ Error reading frontend API client:', error.message);
  hasErrors = true;
}

// Check if fileStorage.js was removed
console.log('\n🗑️  Checking cleanup...');
if (!fs.existsSync(path.join(__dirname, 'backend/src/utils/fileStorage.js'))) {
  console.log('✅ fileStorage.js removed');
} else {
  console.log('❌ fileStorage.js still exists');
  hasErrors = true;
}

// Final summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Verification failed - some issues need to be fixed');
  console.log('Please review the errors above and fix them before deploying');
  process.exit(1);
} else {
  console.log('✅ All checks passed - ready for Vercel deployment!');
  console.log('\nNext steps:');
  console.log('1. Install Vercel CLI: npm install -g vercel');
  console.log('2. Login to Vercel: vercel login');
  console.log('3. Deploy: vercel');
  console.log('4. Set environment variables in Vercel dashboard');
  console.log('5. Redeploy with production: vercel --prod');

  console.log('\nLocal testing:');
  console.log('npm run vercel-dev');
}
console.log('='.repeat(50));