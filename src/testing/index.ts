import { createTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

export const BreakingChangeDetectorTestLibrary = createTestLibrary({
  name: "typespec-breaking-change-detector",
  packageRoot: await findTestPackageRoot(import.meta.url),
});
