import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noPropertyMadeOptionalRule } from "../../src/rules/no-property-made-optional.js";
import { createVersioningTestRunner } from "../test-host.js";

describe("no-property-made-optional", () => {
  let tester: ReturnType<typeof createLinterRuleTester>;

  beforeEach(async () => {
    const runner = await createVersioningTestRunner();
    tester = createLinterRuleTester(
      runner,
      noPropertyMadeOptionalRule,
      "typespec-breaking-change-detector"
    );
  });

  // ── Positive (should warn) ────────────────────────────────────────────────

  it("warns when a required property is made optional on an output model", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2, v3 }

          model B {
            a: string;
            @madeOptional(Versions.v3) b?: string;
          }

          op getB(): B;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-made-optional",
        message: /b.*v2.*v3/,
      });
  });

  it("warns when a required property is made optional between two versions", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            @madeOptional(Versions.v2) name?: string;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-made-optional",
        message: /name.*v1.*v2/,
      });
  });

  it("warns for nested output model when its required property is made optional", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Address {
            street: string;
            @madeOptional(Versions.v2) city?: string;
          }

          model Person {
            name: string;
            address: Address;
          }

          op getPerson(): Person;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-made-optional",
        message: /city.*v1.*v2/,
      });
  });

  it("warns when model is used in multiple operations including as output", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            @madeOptional(Versions.v2) name?: string;
          }

          op createFoo(body: Foo): void;
          op getFoo(): Foo;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-made-optional",
        message: /name/,
      });
  });

  it("warns when output model is returned via a union", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Dog {
            kind: "dog";
            @madeOptional(Versions.v2) name?: string;
          }

          model Cat {
            kind: "cat";
            name: string;
          }

          op getPet(): Dog | Cat;
        }
        `
      )
      .toEmitDiagnostics({
        code: "typespec-breaking-change-detector/no-property-made-optional",
        message: /name.*v1.*v2/,
      });
  });

  // ── Negative (should not warn) ────────────────────────────────────────────

  it("does not warn when a property is made optional on an input-only model", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            @madeOptional(Versions.v2) name?: string;
          }

          op createFoo(body: Foo): void;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when a property is made optional on a model not used in any operation", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            @madeOptional(Versions.v2) name?: string;
          }
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when an already-optional property stays optional", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            name?: string;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn when a new optional property is added to an output model", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Foo {
            id: string;
            @added(Versions.v2) nickname?: string;
          }

          op getFoo(): Foo;
        }
        `
      )
      .toBeValid();
  });

  it("does not warn for template declarations", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        namespace MyService {
          enum Versions { v1, v2 }

          model Container<T> {
            @madeOptional(Versions.v2) value?: string;
            data: T;
          }

          op getContainer(): Container<string>;
        }
        `
      )
      .toBeValid();
  });
});
