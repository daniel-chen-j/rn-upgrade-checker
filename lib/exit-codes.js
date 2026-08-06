"use strict";

const EXIT_OK = 0;
const EXIT_ISSUES_FOUND = 1;

function resolveExitCode(report) {
  return report.ok ? EXIT_OK : EXIT_ISSUES_FOUND;
}

module.exports = { EXIT_OK, EXIT_ISSUES_FOUND, resolveExitCode };
