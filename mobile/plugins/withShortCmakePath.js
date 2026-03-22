const os = require('node:os');
const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Uses a short CMake build path on Windows to avoid the 260-character path limit
 * (Ninja "Filename longer than 260 characters"). Only applies on Windows.
 * @see https://github.com/AppAndFlow/react-native-safe-area-context/issues/424
 */
function withShortCmakePath(config) {
  if (os.platform() !== 'win32') {
    return config;
  }

  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }
    let contents = config.modResults.contents;
    if (contents.includes('buildStagingDirectory')) {
      return config;
    }

    const line = 'buildStagingDirectory = file("C:/tmp/rn-cmake")';
    const comment = '// Short CMake path for Windows 260-char limit (withShortCmakePath)';

    // Option 1: inject inside existing "cmake {" block (React Native / Expo may already have one)
    const cmakeBlockMatch = contents.match(/(\bcmake\s*\{\s*)/);
    if (cmakeBlockMatch && !contents.includes(line)) {
      contents = contents.replace(
        cmakeBlockMatch[0],
        `${cmakeBlockMatch[1]}${comment}\n                ${line}\n                `,
      );
      config.modResults.contents = contents;
      return config;
    }

    // Option 2: add full block after compileSdkVersion
    const snippet = `
        ${comment}
        externalNativeBuild {
            cmake {
                ${line}
            }
        }
`;
    const pattern = /(compileSdkVersion\s+[^\n]+)\n/;
    if (pattern.test(contents)) {
      contents = contents.replace(pattern, `$1${snippet}\n`);
    } else {
      const fallback = /(minSdkVersion\s+[^\n]+)\n/;
      if (fallback.test(contents)) {
        contents = contents.replace(fallback, `$1${snippet}\n`);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withShortCmakePath;
