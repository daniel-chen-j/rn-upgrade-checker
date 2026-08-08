"use strict";

const fs = require("fs");
const path = require("path");
const { CODES, SEVERITY, createFinding } = require("./findings");

const EXPO_CONFIG_FILES = ["app.json", "app.config.js", "app.config.ts"];

/**
 * @param {string} [projectDir]
 * @returns {string|null}
 */
function findExpoConfigFile(projectDir) {
  if (!projectDir) return null;
  for (const name of EXPO_CONFIG_FILES) {
    const filePath = path.join(projectDir, name);
    if (fs.existsSync(filePath)) {
      return name;
    }
  }
  return null;
}

/**
 * @param {object} pkg
 * @param {string} [projectDir]
 * @returns {{isExpo: boolean, expoVersion: string|null, configFile: string|null}}
 */
function detectExpoProject(pkg, projectDir) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  const expoVersion = deps.expo || null;
  const configFile = findExpoConfigFile(projectDir);
  const isExpo = Boolean(expoVersion || configFile);
  return { isExpo, expoVersion, configFile };
}

/**
 * @param {object} pkg
 * @param {string} [projectDir]
 * @returns {Array<object>}
 */
function expoFindings(pkg, projectDir) {
  const { isExpo, expoVersion, configFile } = detectExpoProject(pkg, projectDir);
  if (!isExpo) return [];

  const parts = [];
  if (expoVersion) {
    parts.push(`expo@${expoVersion}`);
  }
  if (configFile) {
    parts.push(configFile);
  }

  const message =
    `Expo project detected (${parts.join(", ")}). ` +
    "Review Expo SDK release notes alongside React Native upgrade steps and run expo-doctor after bumping versions.";

  return [
    createFinding(CODES.EXPO_PROJECT, SEVERITY.INFO, message, "dependencies.expo"),
  ];
}

module.exports = {
  EXPO_CONFIG_FILES,
  findExpoConfigFile,
  detectExpoProject,
  expoFindings,
};
