#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { execSync } = require("child_process");
const path = require("path");
const { checkPackage } = require("../lib/checks");
const { buildReport, formatJson } = require("../lib/report");
const { deprecatedPackageIssues } = require("../lib/deprecated");
const {
  CODES,
  FINDING_VERSION,
  SEVERITY,
  createFinding,
  findingsMessages,
} = require("../lib/findings");
const {
  findProfile,
  loadMatrix,
  reactMatchesProfile,
} = require("../lib/matrix");
const { resolvePackageJsonPath } = require("../lib/resolve-target");
const { upgradeHelperLink, UPGRADE_HELPER_BASE } = require("../lib/hints");
const { resolveExitCode, shouldFail } = require("../lib/exit-codes");
const good = require("../examples/sample-app/package.json");
const legacy = require("../examples/legacy-app/package.json");
const expoApp = require("../examples/expo-app/package.json");
const { detectExpoProject, expoFindings } = require("../lib/expo");

// sample app should pass all checks
const goodResult = checkPackage(good);
assert.equal(goodResult.ok, true, "sample-app should pass");
assert.equal(goodResult.hasReactNative, true);
assert.equal(goodResult.react, "18.2.0");
assert.equal(goodResult.reactNative, "0.73.0");
assert.ok(goodResult.hints.length > 0, "sample-app should have upgrade hints");
console.log("ok: sample-app passes all checks");

// versioned finding model maps to stable issue strings
const finding = createFinding(
  CODES.REACT_PAIRING_MISMATCH,
  SEVERITY.ERROR,
  "react-native@0.73.0 usually pairs with react@18.2.x, found react@17.0.2"
);
assert.equal(finding.version, FINDING_VERSION);
assert.equal(finding.code, CODES.REACT_PAIRING_MISMATCH);
assert.equal(finding.severity, SEVERITY.ERROR);
assert.deepEqual(findingsMessages([finding]), [finding.message]);
assert.equal(
  goodResult.findings.length,
  0,
  "sample-app should not produce findings"
);
assert.deepEqual(goodResult.issues, findingsMessages(goodResult.findings));
console.log("ok: versioned finding model maps to issue strings");

// legacy app should fail on deprecated async-storage
const legacyResult = checkPackage(legacy);
assert.equal(legacyResult.ok, false);
assert.ok(
  legacyResult.issues.some((i) => i.includes("async-storage")),
  "legacy-app should flag async-storage"
);
assert.ok(
  legacyResult.findings.some((f) => f.code === CODES.DEPRECATED_PACKAGE),
  "legacy-app findings should include deprecated package code"
);
assert.deepEqual(legacyResult.issues, findingsMessages(legacyResult.findings));
console.log("ok: deprecated package detection works");

// react / react-native pairing: RN 0.73 requires react 18.2.x
const badPairing = {
  engines: { node: ">=18" },
  dependencies: { react: "17.0.2", "react-native": "0.73.0" },
};
const pairingResult = checkPackage(badPairing);
assert.equal(pairingResult.ok, false);
assert.ok(
  pairingResult.issues.some((i) => i.includes("18.2.x")),
  "should flag react version mismatch for RN 0.73"
);
console.log("ok: react/rn pairing check works");

// correct pairing for RN 0.73 should not produce pairing issues
const goodPairing = {
  engines: { node: ">=18" },
  dependencies: { react: "18.2.0", "react-native": "0.73.0" },
};
const goodPairingResult = checkPackage(goodPairing);
assert.equal(goodPairingResult.ok, true);
assert.ok(
  !goodPairingResult.issues.some((i) => i.includes("18.2.x")),
  "correct pairing should not flag react version"
);
console.log("ok: correct react/rn pairing passes");

// matrix profiles drive pairing checks for known RN versions
const matrix = loadMatrix();
const rn073Profile = findProfile(matrix, "0.73.0");
assert.ok(rn073Profile, "matrix should include RN 0.73 profile");
assert.equal(rn073Profile.react.major, 18);
assert.equal(rn073Profile.react.minor, 2);
assert.equal(reactMatchesProfile("18.2.0", rn073Profile), true);
assert.equal(reactMatchesProfile("17.0.2", rn073Profile), false);

const rn075Bad = {
  engines: { node: ">=18" },
  dependencies: { react: "18.2.0", "react-native": "0.75.0" },
};
const rn075BadResult = checkPackage(rn075Bad);
assert.equal(rn075BadResult.ok, false);
assert.ok(
  rn075BadResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "matrix should flag react mismatch for RN 0.75"
);

const rn075Good = {
  engines: { node: ">=18" },
  dependencies: { react: "18.3.1", "react-native": "0.75.0" },
};
const rn075GoodResult = checkPackage(rn075Good);
assert.equal(rn075GoodResult.ok, true);
assert.ok(
  rn075GoodResult.hints.some((h) => h.includes("react@18.3.x")),
  "matrix notes should appear in hints for RN 0.75"
);
console.log("ok: react native compatibility matrix works");

// missing react-native should fail
const noRn = { engines: { node: ">=18" }, dependencies: { react: "18.2.0" } };
const noRnResult = checkPackage(noRn);
assert.equal(noRnResult.ok, false);
assert.ok(
  noRnResult.issues.some((i) => i.includes("react-native is not present")),
  "should flag missing react-native"
);
console.log("ok: missing react-native detected");

// react missing while react-native present
const noReact = {
  engines: { node: ">=18" },
  dependencies: { "react-native": "0.73.0" },
};
const noReactResult = checkPackage(noReact);
assert.equal(noReactResult.ok, false);
assert.ok(
  noReactResult.issues.some((i) => i.includes("react is missing")),
  "should flag missing react"
);
console.log("ok: missing react detected");

// engines.node not set
const noEngines = {
  dependencies: { react: "18.2.0", "react-native": "0.73.0" },
};
const noEnginesResult = checkPackage(noEngines);
assert.equal(noEnginesResult.ok, false);
assert.ok(
  noEnginesResult.issues.some((i) => i.includes("engines.node is not set")),
  "should flag missing engines.node"
);
console.log("ok: missing engines.node detected");

// multiple deprecated packages
const multiDeprecated = {
  engines: { node: ">=18" },
  dependencies: {
    react: "18.2.0",
    "react-native": "0.73.0",
    "@react-native-community/async-storage": "1.12.1",
    "react-native-netinfo": "1.0.0",
  },
};
const deprecatedIssues = deprecatedPackageIssues(multiDeprecated);
assert.equal(deprecatedIssues.length, 2);
assert.ok(deprecatedIssues.some((i) => i.includes("async-storage")));
assert.ok(deprecatedIssues.some((i) => i.includes("netinfo")));
console.log("ok: multiple deprecated packages flagged");

// JSON report output
const jsonReport = buildReport("test/package.json", good, checkPackage(good));
assert.equal(jsonReport.ok, true);
assert.equal(jsonReport.engines.node, ">=18");
assert.equal(jsonReport.pairing.react, "18.2.0");
assert.equal(jsonReport.pairing.reactNative, "0.73.0");
assert.equal(jsonReport.pairing.ok, true);
assert.equal(jsonReport.deprecated.length, 0);
assert.ok(jsonReport.hints.length > 0);
assert.equal(jsonReport.issues.length, 0);
const parsed = JSON.parse(formatJson(jsonReport));
assert.equal(parsed.ok, true);
assert.deepEqual(Object.keys(parsed).sort(), [
  "deprecated",
  "engines",
  "hints",
  "issues",
  "ok",
  "pairing",
  "summary",
  "target",
]);
assert.deepEqual(jsonReport.summary, {
  error: 0,
  warning: 0,
  info: 0,
  total: 0,
});
console.log("ok: JSON report structure is stable");

// legacy JSON report should flag deprecated and fail
const legacyJson = buildReport(
  "test/legacy.json",
  legacy,
  checkPackage(legacy)
);
assert.equal(legacyJson.ok, false);
assert.ok(legacyJson.deprecated.length > 0);
assert.ok(legacyJson.issues.length > 0);
assert.deepEqual(legacyJson.summary, {
  error: 1,
  warning: 0,
  info: 0,
  total: 1,
});
console.log("ok: JSON report flags deprecated packages");

// CLI --format json smoke
const cliPath = path.join(__dirname, "..", "bin", "rn-upgrade-checker.js");
const samplePath = path.join(__dirname, "..", "examples", "sample-app", "package.json");
const cliOutput = execSync(`node ${cliPath} --format json ${samplePath}`, {
  encoding: "utf8",
});
const cliJson = JSON.parse(cliOutput);
assert.equal(cliJson.ok, true);
assert.equal(cliJson.pairing.ok, true);
console.log("ok: CLI --format json works");

function runCliExitCode(args) {
  try {
    execSync(`node ${cliPath} ${args}`, { encoding: "utf8", stdio: "pipe" });
    return 0;
  } catch (err) {
    return err.status;
  }
}

const samplePathArg = samplePath;
const legacyPath = path.join(__dirname, "..", "examples", "legacy-app", "package.json");

assert.equal(runCliExitCode(samplePathArg), 0, "sample-app CLI should exit 0");
assert.equal(runCliExitCode(legacyPath), 1, "legacy-app CLI should exit 1");
assert.equal(
  runCliExitCode(`--format json ${samplePathArg}`),
  0,
  "sample-app JSON CLI should exit 0"
);
assert.equal(
  runCliExitCode(`--format json ${legacyPath}`),
  1,
  "legacy-app JSON CLI should exit 1"
);
console.log("ok: CLI exit codes are stable");

// Upgrade Helper deep links in hints
const helperLink = upgradeHelperLink("0.73.0", "0.74.0");
assert.ok(helperLink, "upgrade helper link should be built");
assert.ok(
  helperLink.startsWith(UPGRADE_HELPER_BASE),
  "link should use upgrade helper base URL"
);
assert.ok(
  helperLink.includes("from=0.73.0") && helperLink.includes("to=0.74.0"),
  "link should include from/to query params"
);
assert.ok(
  goodResult.hints.some((h) => h.includes(UPGRADE_HELPER_BASE)),
  "sample-app hints should include upgrade helper link"
);
const humanOutput = execSync(`node ${cliPath} ${samplePathArg}`, {
  encoding: "utf8",
});
assert.ok(
  humanOutput.includes(UPGRADE_HELPER_BASE),
  "human output should include upgrade helper link"
);
assert.ok(
  humanOutput.includes("Summary:"),
  "human output should include Summary block"
);
assert.ok(
  /error=0 warning=0 info=0 total=0/.test(humanOutput),
  "sample-app Summary counts should be zero"
);
const jsonWithLink = JSON.parse(
  execSync(`node ${cliPath} --format json ${samplePathArg}`, { encoding: "utf8" })
);
assert.ok(
  jsonWithLink.hints.some((h) => h.includes(UPGRADE_HELPER_BASE)),
  "JSON output should include upgrade helper link"
);
console.log("ok: upgrade helper links appear in hints");

// project directory paths resolve package.json inside the directory
const sampleDir = path.join(__dirname, "..", "examples", "sample-app");
const samplePackageJson = path.join(sampleDir, "package.json");
assert.equal(
  resolvePackageJsonPath(sampleDir),
  samplePackageJson,
  "directory target should resolve package.json"
);
assert.equal(
  resolvePackageJsonPath(samplePackageJson),
  samplePackageJson,
  "package.json path should pass through"
);

const dirCliOutput = execSync(`node ${cliPath} ${sampleDir}`, {
  encoding: "utf8",
});
assert.ok(
  dirCliOutput.includes(samplePackageJson),
  "directory CLI should report resolved package.json path"
);
assert.equal(runCliExitCode(sampleDir), 0, "sample-app directory CLI should exit 0");
assert.equal(
  runCliExitCode(`--format json ${sampleDir}`),
  0,
  "sample-app directory JSON CLI should exit 0"
);
console.log("ok: project directory paths resolve package.json");

// --fail-on severity filter controls exit code
const errorFinding = createFinding(
  CODES.REACT_NATIVE_MISSING,
  SEVERITY.ERROR,
  "react-native is not present"
);
const warningFinding = createFinding(
  CODES.ENGINES_NODE_MISSING,
  SEVERITY.WARNING,
  "engines.node is not set"
);
const infoFinding = createFinding(
  CODES.REACT_MISSING,
  SEVERITY.INFO,
  "optional react note"
);

assert.equal(shouldFail([errorFinding], "error"), true);
assert.equal(shouldFail([warningFinding], "error"), false);
assert.equal(shouldFail([warningFinding], "warning"), true);
assert.equal(shouldFail([infoFinding], "warning"), false);
assert.equal(shouldFail([infoFinding], "any"), true);
assert.equal(shouldFail([], "any"), false);
assert.equal(resolveExitCode([warningFinding], "error"), 0);
assert.equal(resolveExitCode([warningFinding], "warning"), 1);
assert.equal(resolveExitCode([infoFinding], "any"), 1);

assert.equal(
  runCliExitCode(`--fail-on error ${legacyPath}`),
  1,
  "legacy-app should exit 1 with --fail-on error"
);
assert.equal(
  runCliExitCode(`--fail-on error ${samplePathArg}`),
  0,
  "sample-app should exit 0 with --fail-on error"
);
console.log("ok: --fail-on severity filter controls exit code");

// Expo SDK detection surfaces info finding without failing default checks
const expoDir = path.join(__dirname, "..", "examples", "expo-app");
const expoResult = checkPackage(expoApp, { projectDir: expoDir });
assert.equal(expoResult.ok, true, "expo-app should pass default checks");
assert.ok(
  expoResult.findings.some((f) => f.code === CODES.EXPO_PROJECT),
  "expo-app should include Expo project finding"
);
const expoReport = buildReport(expoDir, expoApp, expoResult);
assert.deepEqual(expoReport.summary, {
  error: 0,
  warning: 0,
  info: 1,
  total: 1,
});
assert.ok(
  expoResult.issues.some((i) => i.includes("Expo project detected")),
  "expo-app issues should mention Expo detection"
);
assert.equal(
  runCliExitCode(`--fail-on error ${expoDir}`),
  0,
  "expo-app should exit 0 with --fail-on error"
);
assert.equal(
  runCliExitCode(`--fail-on any ${expoDir}`),
  1,
  "expo-app should exit 1 with --fail-on any"
);

const configOnlyDir = path.join(__dirname, "..", "examples", "expo-config-only");
const configOnlyPkg = {
  engines: { node: ">=18" },
  dependencies: { react: "18.2.0", "react-native": "0.73.0" },
};
const configOnlyResult = checkPackage(configOnlyPkg, { projectDir: configOnlyDir });
assert.ok(
  configOnlyResult.findings.some((f) => f.code === CODES.EXPO_PROJECT),
  "app.config.js alone should trigger Expo detection"
);
assert.equal(detectExpoProject(good, sampleDir).isExpo, false);
console.log("ok: Expo SDK detection works");

console.log("all selftests passed");
