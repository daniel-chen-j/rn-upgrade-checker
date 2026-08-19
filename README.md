# rn-upgrade-checker

CLI that checks Node engines, React Native presence, React/RN version pairing, flags known deprecated RN community packages, and prints upgrade hints.

## Usage

```bash
node bin/rn-upgrade-checker.js path/to/package.json
node bin/rn-upgrade-checker.js --print-target path/to/project
# or
npx rn-upgrade-checker --print-target examples/sample-app
```

Human-readable output is the default. Use `--format json` or set `RN_UPGRADE_CHECKER_FORMAT=json` for machine-readable CI reports.

Use `--print-target` to print the resolved `package.json` path to stderr before the report output.

Hints include deep links to the [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/) when a target version can be inferred.

Output includes hard `issues` (exit non-zero) and advisory `hints` (informational).

The CLI exits `0` when all checks pass and `1` when any issue is found (engines, pairing, deprecated packages). Hints alone do not change the exit code.

## CI

GitHub Actions runs the checker against `examples/sample-app/package.json` on every push and pull request.
