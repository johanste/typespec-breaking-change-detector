import { type Namespace, type Operation, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getModelUsage, getVersionPairs, isProjectType, walkModels, walkOperations } from "../version-comparison.js";

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
          const { inputModels } = getModelUsage(pair.currNs);

          walkModels(pair.currNs, (currModel) => {
            if (!isProjectType(context.program, currModel)) return;
            if (!inputModels.has(currModel.name)) return; // Only breaking for input models.

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

          walkOperations(pair.currNs, (currOp: Operation, currIface) => {
            if (!isProjectType(context.program, currOp)) return;

            // Find the matching operation in the previous version.
            let prevOp: Operation | undefined;
            if (currIface) {
              const prevIface = pair.prevNs.interfaces.get(currIface.name);
              prevOp = prevIface?.operations.get(currOp.name);
            } else {
              prevOp = pair.prevNs.operations.get(currOp.name);
            }
            if (!prevOp) return; // New operation – not this rule's concern.

            // Check for required parameters added between versions.
            for (const [paramName, currParam] of currOp.parameters.properties) {
              if (
                !prevOp.parameters.properties.has(paramName) &&
                !currParam.optional &&
                currParam.defaultValue === undefined
              ) {
                context.reportDiagnostic({
                  target: currParam,
                  format: {
                    propName: paramName,
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
