"use strict";

const { deprecatedPackageIssues } = require("./deprecated");
const { CODES } = require("./findings");

function summarizeFindings(findings) {
  const summary = { error: 0, warning: 0, info: 0, total: 0 };
  for (const finding of findings || []) {
    if (finding.severity === "error") summary.error += 1;
    else if (finding.severity === "warning") summary.warning += 1;
    else if (finding.severity === "info") summary.info += 1;
    summary.total += 1;
  }
  return summary;
}

function buildReport(target, pkg, result) {
  const deprecated = deprecatedPackageIssues(pkg);

  const pairingOk =
    result.react &&
    result.reactNative &&
    !result.findings.some(
      (finding) =>
        finding.code === CODES.REACT_PAIRING_MISMATCH ||
        finding.code === CODES.REACT_MISSING
    );

  return {
    ok: result.ok,
    target,
    engines: {
      node: result.enginesNode,
      process: result.processNode,
    },
    pairing: {
      react: result.react,
      reactNative: result.reactNative,
      ok: pairingOk,
    },
    summary: summarizeFindings(result.findings),
    deprecated: deprecated,
    hints: result.hints,
    issues: result.issues,
  };
}

function formatHuman(report) {
  const lines = [];
  lines.push(`Checking: ${report.target}`);
  lines.push(`Status: ${report.ok ? "OK" : "FAILED"}`);
  lines.push("");

  const summary = report.summary || { error: 0, warning: 0, info: 0, total: 0 };
  lines.push("Summary:");
  lines.push(
    `  error=${summary.error} warning=${summary.warning} info=${summary.info} total=${summary.total}`
  );
  lines.push("");

  lines.push("Engines:");
  lines.push(`  node: ${report.engines.node || "(not set)"} (process: ${report.engines.process})`);
  lines.push("");

  lines.push("React / React Native:");
  lines.push(`  react: ${report.pairing.react || "(missing)"}`);
  lines.push(`  react-native: ${report.pairing.reactNative || "(missing)"}`);
  lines.push(`  pairing: ${report.pairing.ok ? "OK" : "MISMATCH"}`);
  lines.push("");

  if (report.deprecated.length > 0) {
    lines.push("Deprecated:");
    for (const d of report.deprecated) {
      lines.push(`  - ${d}`);
    }
    lines.push("");
  }

  if (report.issues.length > 0) {
    lines.push("Issues:");
    for (const issue of report.issues) {
      lines.push(`  - ${issue}`);
    }
    lines.push("");
  }

  if (report.hints.length > 0) {
    lines.push("Hints:");
    for (const hint of report.hints) {
      lines.push(`  - ${hint}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatJson(report) {
  return JSON.stringify(report, null, 2);
}

const SARIF_SEVERITY = {
  error: "error",
  warning: "warning",
  info: "note",
};

/**
 * @param {{target?: string, findings?: Array<{code: string, severity: string, message: string, path?: string}>}} report
 * @returns {string}
 */
function formatSarif(report) {
  const findings = report.findings || [];
  const results = findings.map((finding) => {
    const result = {
      ruleId: finding.code,
      level: SARIF_SEVERITY[finding.severity] || "note",
      message: { text: finding.message },
    };
    if (finding.path) {
      result.locations = [
        {
          physicalLocation: {
            artifactLocation: { uri: report.target || "package.json" },
            region: { snippet: { text: finding.path } },
          },
        },
      ];
    }
    return result;
  });

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "rn-upgrade-checker",
            informationUri: "https://github.com/daniel-chen-j/rn-upgrade-checker",
            rules: [],
          },
        },
        results,
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}

module.exports = { buildReport, formatHuman, formatJson, formatSarif };
