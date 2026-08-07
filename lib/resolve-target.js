"use strict";

const fs = require("fs");
const path = require("path");

function resolvePackageJsonPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const stats = fs.statSync(resolved);

  if (stats.isDirectory()) {
    return path.join(resolved, "package.json");
  }

  return resolved;
}

module.exports = { resolvePackageJsonPath };
