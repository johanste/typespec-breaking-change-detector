import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "typespec-breaking-change-detector",
  diagnostics: {},
} as const);
