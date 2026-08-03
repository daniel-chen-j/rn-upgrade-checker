"use strict";

function parseMajorMinor(version) {
  if (!version) return null;
  const cleaned = String(version).replace(/^[^0-9]*/, "");
  const parts = cleaned.split(".");
  if (parts.length < 2) return null;
  return { major: Number(parts[0]), minor: Number(parts[1]) };
}

function upgradeHints(pkg) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const rn = deps["react-native"];
  const hints = [];
  const v = parseMajorMinor(rn);
  if (!v) return hints;
  if (v.major === 0 && v.minor <= 72) {
    hints.push("RN <=0.72: plan Flipper removal and confirm Hermes is the default JS engine before upgrading.");
  }
  if (v.major === 0 && v.minor === 73) {
    hints.push("RN 0.73: next minor upgrades often touch Metro config and require matching react@18.2.x.");
  }
  if (v.major === 0 && v.minor >= 74) {
    hints.push("RN >=0.74: verify New Architecture flags and remove legacy community packages if unused.");
  }
  if (deps["react-native-gesture-handler"] && !deps["react-native-reanimated"]) {
    hints.push("gesture-handler is present without reanimated; confirm that pairing is intentional for navigation stacks.");
  }
  return hints;
}

module.exports = { upgradeHints, parseMajorMinor };
