"use strict";

const { CODES, SEVERITY, createFinding, findingsMessages } = require("./findings");

// Map of packages that should be replaced during RN upgrades.
const DEPRECATED = {
  "@react-native-community/async-storage": "@react-native-async-storage/async-storage",
  "@react-native-community/cameraroll": "@react-native-camera-roll/camera-roll",
  "@react-native-community/clipboard": "@react-native-clipboard/clipboard",
  "@react-native-community/masked-view": "@react-native-masked-view/masked-view",
  "@react-native-community/picker": "@react-native-picker/picker",
  "react-native-community/viewpager": "react-native-pager-view",
  "@react-native-community/viewpager": "react-native-pager-view",
  "react-native-netinfo": "@react-native-community/netinfo",
};

function deprecatedPackageFindings(pkg) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const findings = [];
  for (const [oldName, replacement] of Object.entries(DEPRECATED)) {
    if (deps[oldName]) {
      findings.push(
        createFinding(
          CODES.DEPRECATED_PACKAGE,
          SEVERITY.ERROR,
          `deprecated dependency ${oldName}; migrate to ${replacement}`,
          `dependencies.${oldName}`
        )
      );
    }
  }
  return findings;
}

function deprecatedPackageIssues(pkg) {
  return findingsMessages(deprecatedPackageFindings(pkg));
}

module.exports = { deprecatedPackageFindings, deprecatedPackageIssues, DEPRECATED };
