# rn-upgrade-checker

CLI that checks Node engines, React Native presence, and React/RN version pairing.

## Usage

```bash
node bin/rn-upgrade-checker.js path/to/package.json
# or
npx rn-upgrade-checker examples/sample-app/package.json
```

## CI

GitHub Actions runs the checker against `examples/sample-app/package.json` on every push and pull request.
