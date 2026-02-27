import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getVersionPairs, isProjectType, walkModels } from "../version-comparison.js";

export const noRequiredPropertyAddedRule = createRule({
  name: "no-required-property-added",
  severity: "warning",
  description:
    "Warns when a required property without a default value is added to a model in a new API version. Existing clients that do not know about the new property will fail to provide it.",
  messages: {
    default: paramMessage`Required property '${"propName"}' was added between versions '${"prevVersion"}' and '${"currVersion"}'. Adding a required property is a breaking change.`,
  },
  create(context) {
    return {
      namespace(ns: Namespace) {
        if (!getVersion(context.program, ns)) return;

        for (const pair of getVersionPairs(context.program, ns)) {
          walkModels(pair.currNs, (currModel) => {
            if (!isProjectType(context.program, currModel)) return;

            const prevModel = pair.prevNs.models.get(currModel.name);
            if (!prevModel) return; // New model entirely – out of scope for this rule.

            for (const [propName, currProp] of currModel.properties) {
              if (
                !prevModel.properties.has(propName) &&
                !currProp.optional &&
                currProp.defaultValue === undefined
              ) {
                context.reportDiagnostic({
                  target: currProp,
                  format: {
                    propName,
                    prevVersion: pair.prevVersion.name,
                    currVersion: pair.currVersion.name,
                  },
                });
              }
            }
          });
        }
      },
    };
  },
});
