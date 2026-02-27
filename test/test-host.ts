import {
  createTestHost,
  createTestWrapper,
  type BasicTestRunner,
} from "@typespec/compiler/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";

/**
 * Create a test runner that has `@typespec/versioning` pre-loaded and
 * automatically adds `import "@typespec/versioning"; using TypeSpec.Versioning;`
 * to every test file.
 */
export async function createVersioningTestRunner(): Promise<BasicTestRunner> {
  const host = await createTestHost({
    libraries: [VersioningTestLibrary],
  });
  return createTestWrapper(host, {
    autoImports: ["@typespec/versioning"],
    autoUsings: ["TypeSpec.Versioning"],
  });
}
