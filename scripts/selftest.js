#!/usr/bin/env node
"use strict";
const assert = require("assert");
const { checkPackage } = require("../lib/checks");
const good = require("../examples/sample-app/package.json");
const legacy = require("../examples/legacy-app/package.json");
const goodResult = checkPackage(good);
assert.equal(goodResult.ok, true);
const legacyResult = checkPackage(legacy);
assert.equal(legacyResult.ok, false);
assert.ok(legacyResult.issues.some((i) => i.includes("async-storage")));
console.log("ok: deprecated package detection works");
