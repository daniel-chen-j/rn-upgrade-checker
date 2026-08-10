"use strict";

const FINDING_VERSION = 1;

const SEVERITY = {
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

const CODES = {
  ENGINES_NODE_MISSING: "engines.node.missing",
  ENGINES_NODE_MISMATCH: "engines.node.mismatch",
  REACT_NATIVE_MISSING: "react-native.missing",
  REACT_MISSING: "react.missing",
  REACT_PAIRING_MISMATCH: "react.pairing.mismatch",
  DEPRECATED_PACKAGE: "dependency.deprecated",
  EXPO_PROJECT: "expo.project.detected",
  FLIPPER_DEPENDENCY: "dependency.flipper",
};

/**
 * @param {string} code
 * @param {"error"|"warning"|"info"} severity
 * @param {string} message
 * @param {string} [findingPath]
 * @returns {{version: number, code: string, severity: string, message: string, path?: string}}
 */
function createFinding(code, severity, message, findingPath) {
  const finding = {
    version: FINDING_VERSION,
    code,
    severity,
    message,
  };
  if (findingPath) {
    finding.path = findingPath;
  }
  return finding;
}

function findingMessage(finding) {
  return finding.message;
}

function findingsMessages(findings) {
  return findings.map(findingMessage);
}

function isErrorFinding(finding) {
  return finding.severity === SEVERITY.ERROR;
}

module.exports = {
  FINDING_VERSION,
  SEVERITY,
  CODES,
  createFinding,
  findingMessage,
  findingsMessages,
  isErrorFinding,
};
