"use strict";

const { CODES, SEVERITY, createFinding, findingsMessages } = require("./findings");

// Map of packages that should be replaced during RN upgrades.
const DEPRECATED = {
  "@react-native-community/async-storage": "@react-native-async-storage/async-storage",
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
