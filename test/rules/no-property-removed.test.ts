import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noPropertyRemovedRule } from "../../src/rules/no-property-removed.js";
import { createVersioningTestRunner } from "../test-host.js";

describe("no-property-removed", () => {
  let tester: ReturnType<typeof createLinterRuleTester>;

  beforeEach(async () => {
    const runner = await createVersioningTestRunner();
    tester = createLinterRuleTester(runner, noPropertyRemovedRule, "typespec-breaking-change-detector");
  });

  // ── Positive (should warn) ────────────────────────────────────────────────

  it("warns when a property is removed between two versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @removed(Versions.v2) removedProp: string;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-removed",
        message: /removedProp.*removed.*v1.*v2/,
      });
  });

  it("warns when a required property is removed between two versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Pet {
            name: string;
            @removed(Versions.v2) owner: string;
          }

          op getPet(): Pet;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-removed",
        message: /owner/,
      });
  });

  it("warns when an optional property is removed between two versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @removed(Versions.v2) nickname?: string;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-removed",
        message: /nickname/,
      });
  });

  it("warns once per removed property across a 3-version chain", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2, v3 }

          model Foo {
            name: string;
            @removed(Versions.v2) deprecated: string;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toEmitDiagnostics([
        { code: "typespec-breaking-change-detector/no-property-removed", message: /deprecated/ },
      ]);
  });

  // ── Negative (should not warn) ────────────────────────────────────────────

  it("does not warn when no property is removed", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            age: int32;
          }
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when a property is added (not removed)", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @added(Versions.v2) age?: int32;
          }
        }
        `
      )
      .toBeValid();
  });

  it("does not warn for unversioned namespaces", async () => {
    await tester
      .expect(
        `
        namespace MyService {
          model Foo {
            name: string;
          }
        }
        `
      )
      .toBeValid();
  });

  // ── Template suppression ──────────────────────────────────────────────────

  it("does not warn for properties inside an uninstantiated template declaration", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          /** Template – not a concrete API type; should not be checked. */
          model Container<T> {
            @removed(Versions.v2) legacyProp: string;
            data: T;
          }
        }
        `
      )
      .toBeValid();
  });

  // ── Context-aware (input vs output) ──────────────────────────────────────

  it("does not warn when a property is removed from a model used only as input", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @removed(Versions.v2) removedProp: string;
          }

          op createFoo(body: Foo): void;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when a property is removed from a model not used in any operation", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @removed(Versions.v2) removedProp: string;
          }
        }
        `
      )
      .toBeValid();
  });
});
