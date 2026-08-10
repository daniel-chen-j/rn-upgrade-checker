"use strict";

const { CODES, SEVERITY, createFinding } = require("./findings");

/**
 * @param {string} name
 * @returns {boolean}
 */
function isFlipperPackage(name) {
  return name === "react-native-flipper" || name.startsWith("flipper-plugin-");
}

/**
 * Flag Flipper-related dependencies as warnings (not errors).
 * @param {object} pkg
 * @returns {Array<object>}
 */
function flipperFindings(pkg) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const findings = [];
  for (const name of Object.keys(deps)) {
    if (!isFlipperPackage(name)) continue;
    findings.push(
      createFinding(
        CODES.FLIPPER_DEPENDENCY,
        SEVERITY.WARNING,
        `Flipper-related dependency ${name}; Flipper was removed from the React Native template and should be uninstalled before upgrading`,
        `dependencies.${name}`
      )
    );
  }
  return findings;
}

module.exports = { isFlipperPackage, flipperFindings };
