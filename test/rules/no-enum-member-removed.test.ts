import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noEnumMemberRemovedRule } from "../../src/rules/no-enum-member-removed.js";
import { createVersioningTestRunner } from "../test-host.js";

describe("no-enum-member-removed", () => {
  let tester: ReturnType<typeof createLinterRuleTester>;

  beforeEach(async () => {
    const runner = await createVersioningTestRunner();
    tester = createLinterRuleTester(
      runner,
      noEnumMemberRemovedRule,
      "typespec-breaking-change-detector"
    );
  });

  // ── Positive (should warn) ────────────────────────────────────────────────

  it("warns when an enum member is removed between versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          enum Status {
            Active,
            @removed(Versions.v2) Deprecated,
            Inactive,
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-enum-member-removed",
        message: /Deprecated.*Status.*v1.*v2/,
      });
  });

  it("warns for each removed enum member independently", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          enum Status {
            Active,
            @removed(Versions.v2) Deprecated,
            @removed(Versions.v2) Legacy,
          }
        }
        `
      )
      .toEmitDiagnostics([
        { code: "typespec-breaking-change-detector/no-enum-member-removed", message: /Deprecated/ },
        { code: "typespec-breaking-change-detector/no-enum-member-removed", message: /Legacy/ },
      ]);
  });

  // ── Negative (should not warn) ────────────────────────────────────────────

  it("does not warn when no enum member is removed", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          enum Status {
            Active,
            Inactive,
          }
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when an enum member is added", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          enum Status {
            Active,
            Inactive,
            @added(Versions.v2) Pending,
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
          enum Status { Active, Inactive }
        }
        `
      )
      .toBeValid();
  });

  // ── Template suppression ──────────────────────────────────────────────────

  it("does not warn for enum member removals inside an uninstantiated template declaration", async () => {
    // Enums inside template declarations are not in the namespace model map
    // and should not trigger warnings.
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Container<T> {
            data: T;
          }

          enum Status {
            Active,
            Inactive,
          }
        }
        `
      )
      .toBeValid();
  });
});
