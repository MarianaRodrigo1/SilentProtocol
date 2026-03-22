const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Adds org.gradle.warning.mode=none to android/gradle.properties so the build
 * does not fail on Gradle 8.x deprecation warnings (incompatible with Gradle 9.0).
 * See: https://docs.gradle.org/current/userguide/command_line_interface.html#sec:command_line_warnings
 */
function withGradleWarningMode(config) {
  return withGradleProperties(config, (config) => {
    const key = 'org.gradle.warning.mode';
    const existing = config.modResults.find((p) => p.type === 'property' && p.key === key);
    if (existing) {
      existing.value = 'none';
    } else {
      config.modResults.push({ type: 'property', key, value: 'none' });
    }
    return config;
  });
}

module.exports = withGradleWarningMode;
