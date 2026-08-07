"use strict";

const { findProfile } = require("./matrix");

const UPGRADE_HELPER_BASE =
  "https://react-native-community.github.io/upgrade-helper/";

function parseMajorMinor(version) {
  if (!version) return null;
  const cleaned = String(version).replace(/^[^0-9]*/, "");
  const parts = cleaned.split(".");
  if (parts.length < 2) return null;
  return { major: Number(parts[0]), minor: Number(parts[1]) };
}

function normalizeVersion(version) {
  const v = parseMajorMinor(version);
  if (!v) return null;
  const patch = String(version).replace(/^[^0-9]*/, "").split(".")[2];
  const patchNum = patch !== undefined && patch !== "" ? Number(patch) : 0;
  return `${v.major}.${v.minor}.${patchNum}`;
}

function suggestedTargetVersion(fromVersion) {
  const v = parseMajorMinor(fromVersion);
  if (!v) return null;
  return `${v.major}.${v.minor + 1}.0`;
}

function upgradeHelperLink(fromVersion, toVersion) {
  const from = normalizeVersion(fromVersion);
  const to = normalizeVersion(toVersion);
  if (!from || !to) return null;
  const params = new URLSearchParams({ from, to });
  return `${UPGRADE_HELPER_BASE}?${params.toString()}`;
}

function upgradeHints(pkg, matrix) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const rn = deps["react-native"];
  const hints = [];
  const v = parseMajorMinor(rn);
  if (!v) return hints;

  const targetVersion = suggestedTargetVersion(rn);
  const helperLink = targetVersion ? upgradeHelperLink(rn, targetVersion) : null;
  if (helperLink) {
    hints.push(
      `Upgrade Helper diff (${normalizeVersion(rn)} -> ${targetVersion}): ${helperLink}`
    );
  }

  const profile = matrix ? findProfile(matrix, rn) : null;
  if (profile && profile.notes) {
    hints.push(profile.notes);
  } else if (v.major === 0 && v.minor <= 72) {
    hints.push("RN <=0.72: plan Flipper removal and confirm Hermes is the default JS engine before upgrading.");
  } else if (v.major === 0 && v.minor === 73) {
    hints.push("RN 0.73: next minor upgrades often touch Metro config and require matching react@18.2.x.");
  } else if (v.major === 0 && v.minor >= 74) {
    hints.push("RN >=0.74: verify New Architecture flags and remove legacy community packages if unused.");
  }
  if (deps["react-native-gesture-handler"] && !deps["react-native-reanimated"]) {
    hints.push("gesture-handler is present without reanimated; confirm that pairing is intentional for navigation stacks.");
  }
  return hints;
}

module.exports = {
  upgradeHints,
  parseMajorMinor,
  normalizeVersion,
  suggestedTargetVersion,
  upgradeHelperLink,
  UPGRADE_HELPER_BASE,
};
