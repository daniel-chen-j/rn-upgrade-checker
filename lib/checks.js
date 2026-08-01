"use strict";

function parseMajorMinor(version) {
  if (!version) return null;
  const cleaned = String(version).replace(/^[^0-9]*/, "");
  const parts = cleaned.split(".");
  if (parts.length < 2) return null;
  return { major: Number(parts[0]), minor: Number(parts[1]) };
}

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

  const react = deps.react;
  const rn = deps["react-native"];
  if (react && rn) {
    const reactV = parseMajorMinor(react);
    const rnV = parseMajorMinor(rn);
    // Rough pairing heuristic for the sample era: RN 0.73 expects React 18.2.x
    if (reactV && rnV && rnV.major === 0 && rnV.minor === 73) {
      if (!(reactV.major === 18 && reactV.minor === 2)) {
        issues.push(
          `react-native@${rn} usually pairs with react@18.2.x, found react@${react}`
        );
      }
    }
  } else if (rn && !react) {
    issues.push("react is missing while react-native is present");
  }

  return {
    ok: issues.length === 0,
    enginesNode: nodeRange || null,
    processNode: process.versions.node,
    hasReactNative: Boolean(deps["react-native"]),
    react: react || null,
    reactNative: rn || null,
    issues,
  };
}

module.exports = { checkPackage, parseMajorMinor };
