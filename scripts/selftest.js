#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { checkPackage } = require("../lib/checks");
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

console.log("all selftests passed");
