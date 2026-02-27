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

          op createFoo(body: Foo): void;
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

          op createFoo(body: Foo): void;
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

  // ── Operation parameters ──────────────────────────────────────────────────

  it("warns when a required parameter is added to an operation in a new version", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op doStuff(a: string, @added(Versions.v2) b: string): void;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /b.*v1.*v2/,
      });
  });

  it("does not warn when an optional parameter is added to an operation", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op doStuff(a: string, @added(Versions.v2) b?: string): void;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when a required parameter exists in both versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          op doStuff(a: string): void;
        }
        `
      )
      .toBeValid();
  });

  it("warns when a required parameter is added to an interface operation in a new version", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          interface Ops {
            doStuff(a: string, @added(Versions.v2) b: string): void;
          }
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /b.*v1.*v2/,
      });
  });

  // ── Context-aware (input vs output) ──────────────────────────────────────

  it("does not warn when a required property is added to a model used only as output", async () => {
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

          op getFoo(): Foo;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when a required property is added to a model not used in any operation", async () => {
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
      .toBeValid();
  });

  // ── madeRequired (optional→required on input) ─────────────────────────────

  it("warns when an existing optional property is made required on an input model", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @madeRequired(Versions.v2) age: int32;
          }

          op createFoo(body: Foo): void;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /age.*v1.*v2/,
      });
  });

  it("does not warn when an existing optional property is made required on an output-only model", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            name: string;
            @madeRequired(Versions.v2) age: int32;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toBeValid();
  });

  // ── Nested models ─────────────────────────────────────────────────────────

  it("warns when a required property is added to a nested input model", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Address {
            street: string;
            @added(Versions.v2) zipCode: string;
          }

          model CreatePersonRequest {
            name: string;
            address: Address;
          }

          op createPerson(body: CreatePersonRequest): void;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /zipCode/,
      });
  });

  // ── Models used in multiple operations ───────────────────────────────────

  it("warns when model is used in multiple operations including as input", async () => {
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

          op createFoo(body: Foo): void;
          op getFoo(): Foo;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /newRequired/,
      });
  });

  // ── Union input types ─────────────────────────────────────────────────────

  it("warns when a required property is added to a model used in a union input parameter", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Dog {
            kind: "dog";
            @added(Versions.v2) breed: string;
          }

          model Cat {
            kind: "cat";
          }

          op createPet(body: Dog | Cat): void;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-required-property-added",
        message: /breed/,
      });
  });

});
