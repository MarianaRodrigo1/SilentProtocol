const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const mobileRoot = path.join(__dirname, '..');
const androidDir = path.join(mobileRoot, 'android');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return true;
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    return true;
  } catch (e) {
    if (e.code === 'EBUSY' || e.message && e.message.includes('EBUSY')) {
      return false;
    }
    throw e;
  }
}

async function main() {
  try {
    if (fs.existsSync(path.join(androidDir, 'gradlew.bat'))) {
      execSync('.\\gradlew.bat --stop', {
        cwd: androidDir,
        stdio: 'inherit',
        shell: true,
      });
    }
  } catch (e) {
    // Ignore (e.g. no daemon running)
  }

  const waitSeconds = 8;
  await sleep(waitSeconds * 1000);

  if (fs.existsSync(androidDir)) {
    let removed = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (rmDirRecursive(androidDir)) {
        removed = true;
        break;
      }
      await sleep(3000);
    }
    if (!removed) {
      console.error('\n× Could not delete mobile/android (files still in use).');
      console.error('  Fix: 1) Restart the PC');
      console.error('       2) Do NOT open Android Studio or run any build');
      console.error('       3) Open a terminal in mobile/ and run:');
      console.error('          npm run prebuild:android:after-restart');
      process.exit(1);
    }
  }

  execSync('npx expo prebuild --platform android', {
    cwd: mobileRoot,
    stdio: 'inherit',
    shell: true,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
