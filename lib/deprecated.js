"use strict";

// Map of packages that should be replaced during RN upgrades.
const DEPRECATED = {
  "@react-native-community/async-storage": "@react-native-async-storage/async-storage",
  "react-native-community/viewpager": "react-native-pager-view",
  "@react-native-community/viewpager": "react-native-pager-view",
  "react-native-netinfo": "@react-native-community/netinfo",
};

function deprecatedPackageIssues(pkg) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const issues = [];
  for (const [oldName, replacement] of Object.entries(DEPRECATED)) {
    if (deps[oldName]) {
      issues.push(
        `deprecated dependency ${oldName}; migrate to ${replacement}`
      );
    }
  }
  return issues;
}

module.exports = { deprecatedPackageIssues, DEPRECATED };
