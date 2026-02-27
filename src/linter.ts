import { defineLinter } from "@typespec/compiler";
import { noEnumMemberRemovedRule } from "./rules/no-enum-member-removed.js";
import { noOperationRemovedRule } from "./rules/no-operation-removed.js";
import { noPropertyMadeOptionalRule } from "./rules/no-property-made-optional.js";
import { noPropertyRemovedRule } from "./rules/no-property-removed.js";
import { noPropertyTypeChangedRule } from "./rules/no-property-type-changed.js";
import { noRequiredPropertyAddedRule } from "./rules/no-required-property-added.js";

export const $linter = defineLinter({
  rules: [
    noPropertyRemovedRule,
    noPropertyMadeOptionalRule,
    noRequiredPropertyAddedRule,
    noPropertyTypeChangedRule,
    noOperationRemovedRule,
    noEnumMemberRemovedRule,
  ],
  ruleSets: {
    all: {
      enable: {
        "typespec-breaking-change-detector/no-property-removed": true,
        "typespec-breaking-change-detector/no-property-made-optional": true,
        "typespec-breaking-change-detector/no-required-property-added": true,
        "typespec-breaking-change-detector/no-property-type-changed": true,
        "typespec-breaking-change-detector/no-operation-removed": true,
        "typespec-breaking-change-detector/no-enum-member-removed": true,
      },
    },
  },
});
