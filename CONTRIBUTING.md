# Contributing to typespec-breaking-change-detector

Thank you for your interest in contributing! This document explains how to clone, build, and test the project locally.

## Option A — Dev Container (recommended)

The repository ships with a [Dev Container](https://containers.dev/) configuration (`.devcontainer/devcontainer.json`). This gives you a pre-configured environment with the correct Node.js version and all recommended VS Code extensions installed automatically.

**Open in GitHub Codespaces**

Click **Code → Codespaces → Create codespace on `main`** in the GitHub UI, or use the button below:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/johanste/typespec-breaking-change-detector)

**Open locally in VS Code**

1. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension.
2. Clone the repo and open the folder in VS Code.
3. When prompted, click **Reopen in Container** (or run the **Dev Containers: Reopen in Container** command).

In both cases `npm install` runs automatically and the environment is ready to use.

## Option B — Local setup (without a container)

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| [Node.js](https://nodejs.org/) | 20 |
| npm | 10 (bundled with Node 20) |

No global TypeSpec installation is required — all TypeSpec dependencies are installed locally as dev-dependencies.

## Clone the repository

```bash
git clone https://github.com/johanste/typespec-breaking-change-detector.git
cd typespec-breaking-change-detector
```

## Install dependencies

```bash
npm install
```

## Build

Compile TypeScript to `dist/`:

```bash
npm run build
```

To rebuild automatically whenever source files change:

```bash
npx tsc -p tsconfig.build.json --watch
```

To delete the compiled output:

```bash
npm run clean
```

## Run the tests

Run the full test suite once:

```bash
npm test
```

Run tests in watch mode (re-runs on every save):

```bash
npm run test:watch
```

## Project structure

```
src/
  index.ts                  # Public entry point – re-exports rules and linter
  lib.ts                    # createTypeSpecLibrary() definition
  linter.ts                 # $linter export (all rules + "all" ruleset)
  version-comparison.ts     # Shared utilities: version projection, graph walking
  rules/
    no-property-removed.ts
    no-required-property-added.ts
    no-property-type-changed.ts
    no-operation-removed.ts
    no-enum-member-removed.ts
  testing/
    index.ts                # BreakingChangeDetectorTestLibrary for downstream test hosts

test/
  test-host.ts              # Shared test runner factory (versioning pre-loaded)
  rules/
    *.test.ts               # One test file per rule
```

### How a rule works

Each rule is a plain TypeSpec linter rule created with `createRule` from `@typespec/compiler`. In the `namespace` listener it calls `getVersionPairs()` from `version-comparison.ts`, which uses `mutateSubgraphWithNamespace` to project a concrete type-graph snapshot for every API version, then compares consecutive pairs to detect structural regressions.

## Adding a new rule

1. Create `src/rules/my-new-rule.ts`:

   ```ts
   import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
   import { getVersion } from "@typespec/versioning";
   import { getVersionPairs } from "../version-comparison.js";

   export const myNewRule = createRule({
     name: "my-new-rule",
     severity: "warning",
     description: "Short description of what this rule detects.",
     messages: {
       default: paramMessage`Describe the problem with ${"detail"}.`,
     },
     create(context) {
       return {
         namespace(ns: Namespace) {
           if (!getVersion(context.program, ns)) return; // skip unversioned namespaces
           for (const pair of getVersionPairs(context.program, ns)) {
             // compare pair.prevNs vs pair.currNs …
           }
         },
       };
     },
   });
   ```

2. Export the rule from `src/index.ts`.

3. Register it in the `rules` array and `all` ruleset inside `src/linter.ts`.

4. Add a test file `test/rules/my-new-rule.test.ts` following the pattern of the existing tests (positive cases that should warn, negative cases that should be valid, and a template-suppression case).

5. Run `npm run build && npm test` to verify everything compiles and all tests pass.
