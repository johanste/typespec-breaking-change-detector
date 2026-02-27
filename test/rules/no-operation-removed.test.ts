import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noOperationRemovedRule } from "../../src/rules/no-operation-removed.js";
import { createVersioningTestRunner } from "../test-host.js";

describe("no-operation-removed", () => {
  let tester: ReturnType<typeof createLinterRuleTester>;

  beforeEach(async () => {
    const runner = await createVersioningTestRunner();
    tester = createLinterRuleTester(
      runner,
      noOperationRemovedRule,
      "typespec-breaking-change-detector"
    );
  });

  // ── Positive (should warn) ────────────────────────────────────────────────

  it("warns when a top-level operation is removed between versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op listPets(): void;
          @removed(Versions.v2) op deletePet(id: string): void;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-operation-removed",
        message: /deletePet.*v1.*v2/,
      });
  });

  it("warns when an interface operation is removed between versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          interface PetService {
            listPets(): void;
            @removed(Versions.v2) deletePet(id: string): void;
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-operation-removed",
        message: /deletePet/,
      });
  });

  it("warns for each removed operation independently", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op listPets(): void;
          @removed(Versions.v2) op createPet(): void;
          @removed(Versions.v2) op deletePet(id: string): void;
        }
        `
      )
      .toEmitDiagnostics([
        { code: "typespec-breaking-change-detector/no-operation-removed", message: /createPet/ },
        { code: "typespec-breaking-change-detector/no-operation-removed", message: /deletePet/ },
      ]);
  });

  // ── Negative (should not warn) ────────────────────────────────────────────

  it("does not warn when no operation is removed", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op listPets(): void;
          op getPet(id: string): void;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when an operation is added", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op listPets(): void;
          @added(Versions.v2) op createPet(): void;
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
          op listPets(): void;
        }
        `
      )
      .toBeValid();
  });

  // ── Template suppression ──────────────────────────────────────────────────

  it("does not warn for operations inside an uninstantiated interface template", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          /** Template interface – not concrete; should not be checked. */
          interface CrudOps<T> {
            @removed(Versions.v2) deleteLegacy(): void;
            get(): T;
          }
        }
        `
      )
      .toBeValid();
  });
});
