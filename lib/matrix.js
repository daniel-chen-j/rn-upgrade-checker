"use strict";

const fs = require("fs");
const path = require("path");

const MATRIX_PATH = path.join(__dirname, "..", "data", "rn-matrix.json");

function parseMajorMinor(version) {
  if (!version) return null;
  const cleaned = String(version).replace(/^[^0-9]*/, "");
  const parts = cleaned.split(".");
  if (parts.length < 2) return null;
  return { major: Number(parts[0]), minor: Number(parts[1]) };
}

function loadMatrix() {
  const raw = fs.readFileSync(MATRIX_PATH, "utf8");
  return JSON.parse(raw);
}

function profileKey(version) {
  const parsed = parseMajorMinor(version);
  if (!parsed) return null;
  return `${parsed.major}.${parsed.minor}.0`;
}

function findProfile(matrix, reactNativeVersion) {
  const key = profileKey(reactNativeVersion);
  if (!key) return null;
  return matrix.profiles.find((profile) => profile.reactNative === key) || null;
}

function reactMatchesProfile(reactVersion, profile) {
  const reactV = parseMajorMinor(reactVersion);
  if (!reactV || !profile || !profile.react) return null;
  return (
    reactV.major === profile.react.major && reactV.minor === profile.react.minor
  );
}

function pairingMismatchMessage(reactNativeVersion, reactVersion, profile) {
  const expected = `${profile.react.major}.${profile.react.minor}.x`;
  return `react-native@${reactNativeVersion} usually pairs with react@${expected}, found react@${reactVersion}`;
}

module.exports = {
  MATRIX_PATH,
  loadMatrix,
  findProfile,
  reactMatchesProfile,
  pairingMismatchMessage,
  profileKey,
};
