#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { execSync } = require("child_process");
const path = require("path");
const { checkPackage } = require("../lib/checks");
const { buildReport, formatJson } = require("../lib/report");
const { deprecatedPackageIssues } = require("../lib/deprecated");
const good = require("../examples/sample-app/package.json");
const legacy = require("../examples/legacy-app/package.json");

// sample app should pass all checks
const goodResult = checkPackage(good);
assert.equal(goodResult.ok, true, "sample-app should pass");
assert.equal(goodResult.hasReactNative, true);
assert.equal(goodResult.react, "18.2.0");
assert.equal(goodResult.reactNative, "0.73.0");
assert.ok(goodResult.hints.length > 0, "sample-app should have upgrade hints");
console.log("ok: sample-app passes all checks");

// legacy app should fail on deprecated async-storage
const legacyResult = checkPackage(legacy);
assert.equal(legacyResult.ok, false);
assert.ok(
  legacyResult.issues.some((i) => i.includes("async-storage")),
  "legacy-app should flag async-storage"
);
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
  "target",
]);
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

console.log("all selftests passed");
