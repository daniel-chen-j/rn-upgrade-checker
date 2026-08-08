#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { checkPackage } = require("../lib/checks");
const { FAIL_ON_LEVELS, resolveExitCode } = require("../lib/exit-codes");
const { buildReport, formatHuman, formatJson } = require("../lib/report");
const { resolvePackageJsonPath } = require("../lib/resolve-target");

function parseArgs(argv) {
  let format = process.env.RN_UPGRADE_CHECKER_FORMAT || "human";
  let failOn = "error";
  let target = null;

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--format" && argv[i + 1]) {
      format = argv[i + 1];
      i++;
    } else if (argv[i] === "--fail-on" && argv[i + 1]) {
      failOn = argv[i + 1];
      i++;
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

  return { format, failOn, target };
}

const { format, failOn, target } = parseArgs(process.argv);
const packageJsonPath = resolvePackageJsonPath(target);
const projectDir = path.dirname(packageJsonPath);
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const result = checkPackage(pkg, { projectDir });
const report = buildReport(packageJsonPath, pkg, result);
report.findings = result.findings;

if (format === "json") {
  console.log(formatJson(report));
} else {
  console.log(formatHuman(report));
}

process.exit(resolveExitCode(report, failOn));
