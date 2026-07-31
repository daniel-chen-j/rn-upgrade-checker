"use strict";

function checkPackage(pkg) {
  const issues = [];
  const engines = (pkg && pkg.engines) || {};
  const nodeRange = engines.node;

  if (nodeRange) {
    const current = process.versions.node;
    const majorMatch = String(nodeRange).match(/(\d+)/);
    if (majorMatch) {
      const requiredMajor = Number(majorMatch[1]);
      const currentMajor = Number(String(current).split(".")[0]);
      if (currentMajor < requiredMajor) {
        issues.push(
          `engines.node requires major >= ${requiredMajor}, process is ${current}`
        );
      }
    }
  } else {
    issues.push("engines.node is not set");
  }

  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  if (!deps["react-native"]) {
    issues.push("react-native is not present in dependencies or devDependencies");
  }

  return {
    ok: issues.length === 0,
    enginesNode: nodeRange || null,
    processNode: process.versions.node,
    hasReactNative: Boolean(deps["react-native"]),
    issues,
  };
}

module.exports = { checkPackage };
