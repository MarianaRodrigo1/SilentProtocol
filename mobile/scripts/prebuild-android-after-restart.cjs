const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const mobileRoot = path.join(__dirname, '..');
const androidDir = path.join(mobileRoot, 'android');

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return true;
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    return true;
  } catch (e) {
    if (e.code === 'EBUSY' || (e.message && e.message.includes('EBUSY'))) {
      return false;
    }
    throw e;
  }
}

function main() {
  if (fs.existsSync(androidDir)) {
    let removed = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      if (rmDirRecursive(androidDir)) {
        removed = true;
        break;
      }
      try {
        if (process.platform === 'win32') {
          execSync('timeout /t 2 /nobreak >nul', { stdio: 'ignore', shell: true });
        } else {
          execSync('sleep 2', { stdio: 'ignore' });
        }
      } catch (_) {}
    }
    if (!removed) {
      console.error('\n× Still locked. Make sure you restarted and did NOT open Android Studio or run any build yet.');
      console.error('  Then run this script again: npm run prebuild:android:after-restart');
      process.exit(1);
    }
  }

  execSync('npx expo prebuild --platform android', {
    cwd: mobileRoot,
    stdio: 'inherit',
    shell: true,
  });
}

main();
