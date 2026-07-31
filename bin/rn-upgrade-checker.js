#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { checkPackage } = require("../lib/checks");

const target = process.argv[2] || path.join(__dirname, "..", "examples", "sample-app", "package.json");
const pkg = JSON.parse(fs.readFileSync(target, "utf8"));
const result = checkPackage(pkg);

console.log(JSON.stringify({ target, ...result }, null, 2));
process.exit(result.ok ? 0 : 1);
