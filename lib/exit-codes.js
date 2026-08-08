"use strict";

const { SEVERITY } = require("./findings");

const EXIT_OK = 0;
const EXIT_ISSUES_FOUND = 1;

const FAIL_ON_LEVELS = ["error", "warning", "any"];

/**
 * @param {Array<{severity: string}>} findings
 * @param {"error"|"warning"|"any"} failOn
 * @returns {boolean}
 */
function shouldFail(findings, failOn) {
  if (failOn === "error") {
    return findings.some((f) => f.severity === SEVERITY.ERROR);
  }
  if (failOn === "warning") {
    return findings.some(
      (f) => f.severity === SEVERITY.ERROR || f.severity === SEVERITY.WARNING
    );
  }
  if (failOn === "any") {
    return findings.length > 0;
  }
  return findings.some((f) => f.severity === SEVERITY.ERROR);
}

/**
 * @param {{findings?: Array<{severity: string}>}|Array<{severity: string}>} reportOrFindings
 * @param {"error"|"warning"|"any"} [failOn="error"]
 * @returns {number}
 */
function resolveExitCode(reportOrFindings, failOn = "error") {
  const findings = Array.isArray(reportOrFindings)
    ? reportOrFindings
    : reportOrFindings.findings || [];
  return shouldFail(findings, failOn) ? EXIT_ISSUES_FOUND : EXIT_OK;
}

module.exports = {
  EXIT_OK,
  EXIT_ISSUES_FOUND,
  FAIL_ON_LEVELS,
  shouldFail,
  resolveExitCode,
};
