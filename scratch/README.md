# Scratch

This folder is a sandbox for manually testing the breaking-change linter with
`tsp compile`.  All `.tsp` files you create here are git-ignored so experiments
are never accidentally committed.

## One-time setup

Build the library and install this folder's dependencies:

```bash
# from the repository root
npm run build

# then inside this folder
cd scratch
npm install
```

`npm install` creates a local `node_modules/` that symlinks
`typespec-breaking-change-detector` back to the built library in the repo root
and installs `@typespec/compiler` / `@typespec/versioning`.

## Create a scenario file

Create a `main.tsp` (or any `.tsp` file) to try out a scenario, for example:

```typespec
import "@typespec/versioning";

using TypeSpec.Versioning;

@versioned(Versions)
namespace MyService {
  enum Versions {
    v1,
    v2,
  }

  model Pet {
    name: string;

    // Removing a property between versions triggers a linter warning.
    @removed(Versions.v2) owner: string;
  }

  op listPets(): Pet[];
}
```

## Compile

```bash
npx tsp compile main.tsp
```

The `tspconfig.yaml` in this folder already enables the
`typespec-breaking-change-detector/all` ruleset, so linter diagnostics appear
automatically.

## Rebuild after library changes

Whenever you change source files in `src/`, rebuild before re-running compile:

```bash
# from the repo root
npm run build
```
