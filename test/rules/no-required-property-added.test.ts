import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noRequiredPropertyAddedRule } from "../../src/rules/no-required-property-added.js";
import { createVersioningTestRunner } from "../test-host.js";

describe("no-required-property-added", () => {
  let tester: ReturnType<typeof createLinterRuleTester>;

  beforeEach(async () => {
    const runner = await createVersioningTestRunner();
    tester = createLinterRuleTester(
      runner,
      noRequiredPropertyAddedRule,
      "typespec-breaking-change-detector"
    );
  });

  // ── Positive (should warn) ────────────────────────────────────────────────

  it("warns when a required property is added in a new version", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @added(Versions.v2) newRequired: string;
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /newRequired.*v1.*v2/,
      });
  });

  it("warns when a required property without a default is added", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            @added(Versions.v2) count: int32;
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /count/,
      });
  });

  // ── Negative (should not warn) ────────────────────────────────────────────

  it("does not warn when an optional property is added", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @added(Versions.v2) nickname?: string;
          }
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when no property is added or removed", async () => {
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

  it("does not warn when a required property was present in both versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @added(Versions.v1) id: string;
          }
        }
        `
      )
      .toBeValid();
  });

  // ── Template suppression ──────────────────────────────────────────────────

  it("does not warn for required properties inside an uninstantiated template declaration", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          /** Template – not a concrete API type. */
          model Resource<TKey> {
            @added(Versions.v2) newRequired: TKey;
          }
        }
        `
      )
      .toBeValid();
  });
});
