#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { checkPackage } = require("../lib/checks");
const { resolveExitCode } = require("../lib/exit-codes");
const { buildReport, formatHuman, formatJson } = require("../lib/report");

function parseArgs(argv) {
  let format = process.env.RN_UPGRADE_CHECKER_FORMAT || "human";
  let target = null;

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--format" && argv[i + 1]) {
      format = argv[i + 1];
      i++;
    } else if (!argv[i].startsWith("-")) {
      target = argv[i];
    }
  }

  if (!target) {
    target = path.join(__dirname, "..", "examples", "sample-app", "package.json");
  }

  return { format, target };
}

const { format, target } = parseArgs(process.argv);
const pkg = JSON.parse(fs.readFileSync(target, "utf8"));
const result = checkPackage(pkg);
const report = buildReport(target, pkg, result);

if (format === "json") {
  console.log(formatJson(report));
} else {
  console.log(formatHuman(report));
}

process.exit(resolveExitCode(report));
