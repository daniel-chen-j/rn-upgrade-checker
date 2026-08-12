#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { checkPackage } = require("../lib/checks");
const { FAIL_ON_LEVELS, resolveExitCode } = require("../lib/exit-codes");
const { CODES, findingsMessages } = require("../lib/findings");
const { buildReport, formatHuman, formatJson, formatSarif } = require("../lib/report");
const { resolvePackageJsonPath } = require("../lib/resolve-target");

function parseArgs(argv) {
  let format = process.env.RN_UPGRADE_CHECKER_FORMAT || "human";
  let failOn = "error";
  let target = null;
  let listCodes = false;
  let showVersion = false;
  const ignoreCodes = [];

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--format" && argv[i + 1]) {
      format = argv[i + 1];
      i++;
    } else if (argv[i] === "--fail-on" && argv[i + 1]) {
      failOn = argv[i + 1];
      i++;
    } else if (argv[i] === "--ignore-code" && argv[i + 1]) {
      ignoreCodes.push(argv[i + 1]);
      i++;
    } else if (argv[i] === "--list-codes") {
      listCodes = true;
    } else if (argv[i] === "--version") {
      showVersion = true;
    } else if (!argv[i].startsWith("-")) {
      target = argv[i];
    }
  }

  if (!target) {
    target = path.join(__dirname, "..", "examples", "sample-app");
  }

  if (!FAIL_ON_LEVELS.includes(failOn)) {
    console.error(
      `Invalid --fail-on value "${failOn}". Use one of: ${FAIL_ON_LEVELS.join(", ")}`
    );
    process.exit(2);
  }

  return { format, failOn, ignoreCodes, listCodes, showVersion, target };
}

/**
 * @param {Array<{code: string}>} findings
 * @param {string[]} ignoreCodes
 * @returns {Array<{code: string}>}
 */
function filterIgnoredFindings(findings, ignoreCodes) {
  if (!ignoreCodes || ignoreCodes.length === 0) {
    return findings;
  }
  const ignored = new Set(ignoreCodes);
  return findings.filter((finding) => !ignored.has(finding.code));
}

const { format, failOn, ignoreCodes, listCodes, showVersion, target } = parseArgs(process.argv);

if (listCodes) {
  for (const code of Object.values(CODES).sort()) {
    console.log(code);
  }
  process.exit(0);
}

if (showVersion) {
  const cliPkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
  );
  console.log(cliPkg.version);
  process.exit(0);
}

const packageJsonPath = resolvePackageJsonPath(target);
const projectDir = path.dirname(packageJsonPath);
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const result = checkPackage(pkg, { projectDir });
result.findings = filterIgnoredFindings(result.findings, ignoreCodes);
result.issues = findingsMessages(result.findings);
result.ok = result.findings.every((finding) => finding.severity !== "error");
const report = buildReport(packageJsonPath, pkg, result);
report.findings = result.findings;

if (format === "json") {
  console.log(formatJson(report));
} else if (format === "sarif") {
  console.log(formatSarif(report));
} else {
  console.log(formatHuman(report));
}

process.exit(resolveExitCode(report, failOn));
