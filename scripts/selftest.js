#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { execSync } = require("child_process");
const path = require("path");
const { checkPackage } = require("../lib/checks");
const { buildReport, formatJson, formatSarif } = require("../lib/report");
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

const rn076Profile = findProfile(matrix, "0.76.0");
assert.ok(rn076Profile, "matrix should include RN 0.76 profile");
assert.equal(rn076Profile.react.major, 18);
assert.equal(rn076Profile.react.minor, 3);

const rn076Good = {
  engines: { node: ">=18" },
  dependencies: { react: "18.3.1", "react-native": "0.76.0" },
};
const rn076GoodResult = checkPackage(rn076Good);
assert.equal(rn076GoodResult.ok, true);
assert.ok(
  !rn076GoodResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "good pairing react@18.3.1 should pass for RN 0.76"
);

const rn076Bad = {
  engines: { node: ">=18" },
  dependencies: { react: "18.2.0", "react-native": "0.76.0" },
};
const rn076BadResult = checkPackage(rn076Bad);
assert.equal(rn076BadResult.ok, false);
assert.ok(
  rn076BadResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "bad react@18.2.0 should yield REACT_PAIRING_MISMATCH for RN 0.76"
);

const rn077Profile = findProfile(matrix, "0.77.0");
assert.ok(rn077Profile, "matrix should include RN 0.77 profile");
assert.equal(rn077Profile.react.major, 18);
assert.equal(rn077Profile.react.minor, 3);

const rn077Good = {
  engines: { node: ">=18" },
  dependencies: { react: "18.3.1", "react-native": "0.77.0" },
};
const rn077GoodResult = checkPackage(rn077Good);
assert.equal(rn077GoodResult.ok, true);
assert.ok(
  !rn077GoodResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "good pairing react@18.3.1 should pass for RN 0.77"
);

const rn077Bad = {
  engines: { node: ">=18" },
  dependencies: { react: "18.2.0", "react-native": "0.77.0" },
};
const rn077BadResult = checkPackage(rn077Bad);
assert.equal(rn077BadResult.ok, false);
assert.ok(
  rn077BadResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "bad react@18.2.0 should yield REACT_PAIRING_MISMATCH for RN 0.77"
);

const rn078Profile = findProfile(matrix, "0.78.0");
assert.ok(rn078Profile, "matrix should include RN 0.78 profile");
assert.equal(rn078Profile.react.major, 18);
assert.equal(rn078Profile.react.minor, 3);

const rn078Good = {
  engines: { node: ">=18" },
  dependencies: { react: "18.3.1", "react-native": "0.78.0" },
};
const rn078GoodResult = checkPackage(rn078Good);
assert.equal(rn078GoodResult.ok, true);
assert.ok(
  !rn078GoodResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "good pairing react@18.3.1 should pass for RN 0.78"
);

const rn078Bad = {
  engines: { node: ">=18" },
  dependencies: { react: "18.2.0", "react-native": "0.78.0" },
};
const rn078BadResult = checkPackage(rn078Bad);
assert.equal(rn078BadResult.ok, false);
assert.ok(
  rn078BadResult.findings.some((f) => f.code === CODES.REACT_PAIRING_MISMATCH),
  "bad react@18.2.0 should yield REACT_PAIRING_MISMATCH for RN 0.78"
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

// community masked-view is deprecated in favor of the scoped package
const { DEPRECATED } = require("../lib/deprecated");
assert.equal(
  DEPRECATED["@react-native-community/masked-view"],
  "@react-native-masked-view/masked-view",
  "masked-view should map to the new scoped package"
);
const maskedViewPkg = {
  engines: { node: ">=18" },
  dependencies: {
    react: "18.2.0",
    "react-native": "0.73.0",
    "@react-native-community/masked-view": "0.1.11",
  },
};
const maskedResult = checkPackage(maskedViewPkg);
assert.equal(maskedResult.ok, false, "masked-view package should fail checks");
assert.ok(
  maskedResult.issues.some((i) => i.includes("@react-native-community/masked-view")),
  "should flag community masked-view"
);
assert.ok(
  maskedResult.issues.some((i) => i.includes("@react-native-masked-view/masked-view")),
  "should recommend @react-native-masked-view/masked-view"
);
assert.ok(
  maskedResult.findings.some((f) => f.code === CODES.DEPRECATED_PACKAGE),
  "masked-view finding should use deprecated package code"
);
assert.equal(
  checkPackage(good).ok,
  true,
  "sample-app should still pass without masked-view"
);
console.log("ok: community masked-view deprecation flagged");

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

// --ignore-code drops matching findings before report/exit
assert.equal(
  runCliExitCode(`--ignore-code dependency.deprecated ${legacyPath}`),
  0,
  "ignoring deprecated code should make legacy-app exit 0"
);
assert.equal(
  runCliExitCode(
    `--ignore-code dependency.deprecated --ignore-code engines.node.missing ${legacyPath}`
  ),
  0,
  "repeatable --ignore-code should accept multiple codes"
);
assert.equal(
  runCliExitCode(`--ignore-code expo.project.detected ${legacyPath}`),
  1,
  "non-matching --ignore-code should leave legacy-app failing"
);
const ignoredJson = JSON.parse(
  execSync(
    `node ${cliPath} --format json --ignore-code dependency.deprecated ${legacyPath}`,
    { encoding: "utf8" }
  )
);
assert.equal(ignoredJson.ok, true);
assert.equal(ignoredJson.issues.length, 0);
assert.deepEqual(ignoredJson.summary, {
  error: 0,
  warning: 0,
  info: 0,
  total: 0,
});
assert.equal(
  runCliExitCode(samplePathArg),
  0,
  "sample-app default path should still exit 0 without ignore codes"
);
console.log("ok: --ignore-code filter drops matching findings");

// Flipper-related dependencies are warnings (sample-app stays exit 0)
const { flipperFindings, isFlipperPackage } = require("../lib/flipper");
assert.equal(isFlipperPackage("react-native-flipper"), true);
assert.equal(isFlipperPackage("flipper-plugin-network"), true);
assert.equal(isFlipperPackage("react-native"), false);
const flipperPkg = {
  engines: { node: ">=18" },
  dependencies: {
    react: "18.2.0",
    "react-native": "0.73.0",
    "react-native-flipper": "0.212.0",
    "flipper-plugin-async-storage": "1.0.0",
  },
};
const flipperResult = checkPackage(flipperPkg);
assert.equal(flipperResult.ok, true, "Flipper findings must not fail default ok");
const flipperHits = flipperResult.findings.filter(
  (f) => f.code === CODES.FLIPPER_DEPENDENCY
);
assert.equal(flipperHits.length, 2);
assert.ok(flipperHits.every((f) => f.severity === SEVERITY.WARNING));
assert.equal(flipperFindings(good).length, 0);
assert.equal(
  runCliExitCode(samplePathArg),
  0,
  "sample-app must stay exit 0 after Flipper check"
);
assert.equal(
  resolveExitCode(flipperResult.findings, "error"),
  0,
  "Flipper warnings should not fail --fail-on error"
);
assert.equal(
  resolveExitCode(flipperResult.findings, "warning"),
  1,
  "Flipper warnings should fail --fail-on warning"
);
console.log("ok: Flipper-related dependencies flagged");

// SARIF 2.1.0 output maps findings to runs[0].results
const legacyResultForSarif = checkPackage(legacy);
const legacyReportForSarif = buildReport(legacyPath, legacy, legacyResultForSarif);
legacyReportForSarif.findings = legacyResultForSarif.findings;
const sarifParsed = JSON.parse(formatSarif(legacyReportForSarif));
assert.equal(sarifParsed.version, "2.1.0");
assert.ok(Array.isArray(sarifParsed.runs));
assert.equal(sarifParsed.runs.length, 1);
assert.ok(Array.isArray(sarifParsed.runs[0].results));
assert.ok(sarifParsed.runs[0].results.length > 0);
assert.equal(sarifParsed.runs[0].results[0].ruleId, CODES.DEPRECATED_PACKAGE);
assert.equal(sarifParsed.runs[0].results[0].level, "error");
assert.ok(sarifParsed.runs[0].results[0].message.text.includes("async-storage"));
let sarifCliRaw;
try {
  sarifCliRaw = execSync(`node ${cliPath} --format sarif ${legacyPath}`, {
    encoding: "utf8",
  });
} catch (err) {
  sarifCliRaw = err.stdout;
}
const sarifCli = JSON.parse(sarifCliRaw);
assert.equal(sarifCli.version, "2.1.0");
assert.ok(sarifCli.runs[0].results.some((r) => r.ruleId === CODES.DEPRECATED_PACKAGE));
const humanStill = execSync(`node ${cliPath} ${samplePathArg}`, { encoding: "utf8" });
assert.ok(humanStill.includes("Summary:"), "human format unchanged");
const jsonStill = JSON.parse(
  execSync(`node ${cliPath} --format json ${samplePathArg}`, { encoding: "utf8" })
);
assert.ok(jsonStill.summary, "json summary unchanged");
assert.equal(runCliExitCode(`--format sarif ${samplePathArg}`), 0);
console.log("ok: SARIF report format");

// --list-codes prints sorted finding codes and skips package scan
const listCodesOutput = execSync(`node ${cliPath} --list-codes`, {
  encoding: "utf8",
});
const listedCodes = listCodesOutput.trim().split("\n").filter(Boolean);
assert.deepEqual(
  listedCodes,
  Object.values(CODES).slice().sort(),
  "--list-codes should print sorted finding codes"
);
assert.equal(runCliExitCode("--list-codes"), 0, "--list-codes should exit 0");
assert.equal(
  runCliExitCode("--list-codes /nonexistent/path/package.json"),
  0,
  "--list-codes should exit 0 without scanning a package path"
);
console.log("ok: --list-codes prints sorted codes without package scan");

// --version prints package.json version and skips package scan
const pkgVersion = JSON.parse(
  require("fs").readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
).version;
const versionOutput = execSync(`node ${cliPath} --version`, {
  encoding: "utf8",
});
assert.equal(
  versionOutput.trim(),
  pkgVersion,
  "--version should print package.json version"
);
assert.equal(runCliExitCode("--version"), 0, "--version should exit 0");
assert.equal(
  runCliExitCode("--version /nonexistent/path/package.json"),
  0,
  "--version should exit 0 without scanning a package path"
);
console.log("ok: --version prints package version without package scan");

// --list-profiles prints matrix RN versions in file order and skips package scan
const listProfilesOutput = execSync(`node ${cliPath} --list-profiles`, {
  encoding: "utf8",
});
const listedProfiles = listProfilesOutput.trim().split("\n").filter(Boolean);
assert.deepEqual(
  listedProfiles,
  loadMatrix().profiles.map((profile) => profile.reactNative),
  "--list-profiles should print reactNative versions in file order"
);
assert.equal(runCliExitCode("--list-profiles"), 0, "--list-profiles should exit 0");
assert.equal(
  runCliExitCode("--list-profiles /nonexistent/path/package.json"),
  0,
  "--list-profiles should exit 0 without scanning a package path"
);
console.log("ok: --list-profiles prints matrix versions without package scan");

console.log("all selftests passed");
