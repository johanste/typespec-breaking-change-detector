import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noPropertyTypeChangedRule } from "../../src/rules/no-property-type-changed.js";
import { createVersioningTestRunner } from "../test-host.js";

describe("no-property-type-changed", () => {
  let tester: ReturnType<typeof createLinterRuleTester>;

  beforeEach(async () => {
    const runner = await createVersioningTestRunner();
    tester = createLinterRuleTester(
      runner,
      noPropertyTypeChangedRule,
      "typespec-breaking-change-detector"
    );
  });

  // ── Positive (should warn) ────────────────────────────────────────────────

  it("warns when a scalar type changes between versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            @typeChangedFrom(Versions.v2, string) count: int32;
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-type-changed",
        message: /count.*string.*int32/,
      });
  });

  it("warns when a model reference type changes between versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Address { street: string; }
          model Location { lat: float32; lng: float32; }

          model Foo {
            @typeChangedFrom(Versions.v2, Address) place: Location;
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-type-changed",
        message: /place.*Address.*Location/,
      });
  });

  // ── Negative (should not warn) ────────────────────────────────────────────

  it("does not warn when property type is unchanged", async () => {
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

  it("does not warn when a property is added (different rule)", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @added(Versions.v2) tag?: string;
          }
        }
        `
      )
      .toBeValid();
  });

  // ── Template suppression ──────────────────────────────────────────────────

  it("does not warn for type changes inside an uninstantiated template declaration", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Box<T> {
            @typeChangedFrom(Versions.v2, string) value: T;
          }
        }
        `
      )
      .toBeValid();
  });
});
