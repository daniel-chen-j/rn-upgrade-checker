"use strict";

const { upgradeHints, parseMajorMinor } = require("./hints");
const { deprecatedPackageFindings } = require("./deprecated");
const { expoFindings } = require("./expo");
const { flipperFindings } = require("./flipper");
const {
  findProfile,
  loadMatrix,
  pairingMismatchMessage,
  reactMatchesProfile,
} = require("./matrix");
const {
  CODES,
  SEVERITY,
  createFinding,
  findingsMessages,
  isErrorFinding,
} = require("./findings");

const matrix = loadMatrix();

function parseNodeRangeMajors(nodeRange) {
  const range = String(nodeRange || "");
  const majors = [];

  const comparatorMatches = range.match(/(?:\^|~|>=?|=)\s*(\d+)/g) || [];
  for (const token of comparatorMatches) {
    const match = token.match(/(\d+)/);
    if (match) {
      majors.push(Number(match[1]));
    }
  }

  if (majors.length === 0) {
    const fallback = range.match(/(\d+)/g) || [];
    for (const token of fallback) {
      majors.push(Number(token));
    }
  }

  return majors.filter((n) => Number.isFinite(n));
}

function checkPackage(pkg, options = {}) {
  const findings = [];
  const projectDir = options.projectDir || null;
  const engines = (pkg && pkg.engines) || {};
  const nodeRange = engines.node;

  if (nodeRange) {
    const current = process.versions.node;
    const currentMajor = Number(String(current).split(".")[0]);
    const rangeMajors = parseNodeRangeMajors(nodeRange);
    if (rangeMajors.length > 0) {
      const requiredMajor = Math.min(...rangeMajors);
      if (currentMajor < requiredMajor) {
        findings.push(
          createFinding(
            CODES.ENGINES_NODE_MISMATCH,
            SEVERITY.ERROR,
            `engines.node requires major >= ${requiredMajor}, process is ${current}`,
            "engines.node"
          )
        );
      }
    }
  } else {
    findings.push(
      createFinding(
        CODES.ENGINES_NODE_MISSING,
        SEVERITY.ERROR,
        "engines.node is not set",
        "engines.node"
      )
    );
  }

  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  if (!deps["react-native"]) {
    findings.push(
      createFinding(
        CODES.REACT_NATIVE_MISSING,
        SEVERITY.ERROR,
        "react-native is not present in dependencies or devDependencies"
      )
    );
  }

  const react = deps.react;
  const rn = deps["react-native"];
  if (react && rn) {
    const profile = findProfile(matrix, rn);
    if (profile && reactMatchesProfile(react, profile) === false) {
      findings.push(
        createFinding(
          CODES.REACT_PAIRING_MISMATCH,
          SEVERITY.ERROR,
          pairingMismatchMessage(rn, react, profile)
        )
      );
    }
  } else if (rn && !react) {
    findings.push(
      createFinding(
        CODES.REACT_MISSING,
        SEVERITY.ERROR,
        "react is missing while react-native is present"
      )
    );
  }

  findings.push(...deprecatedPackageFindings(pkg));
  findings.push(...expoFindings(pkg, projectDir));
  findings.push(...flipperFindings(pkg));

  const issues = findingsMessages(findings);

  return {
    ok: findings.every((finding) => !isErrorFinding(finding)),
    enginesNode: nodeRange || null,
    processNode: process.versions.node,
    hasReactNative: Boolean(deps["react-native"]),
    react: react || null,
    reactNative: rn || null,
    findings,
    issues,
    hints: upgradeHints(pkg, matrix),
  };
}

module.exports = { checkPackage, parseMajorMinor };
