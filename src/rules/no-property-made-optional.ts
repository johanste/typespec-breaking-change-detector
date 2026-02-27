import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getModelUsage, getVersionPairs, isProjectType, walkModels } from "../version-comparison.js";

export const noPropertyMadeOptionalRule = createRule({
  name: "no-property-made-optional",
  severity: "warning",
  description:
    "Warns when a required property is changed to optional in a model used as an output (response). Clients that depend on the property always being present will break.",
  messages: {
    default: paramMessage`Required property '${"propName"}' was made optional between versions '${"prevVersion"}' and '${"currVersion"}'. Making a required output property optional is a breaking change.`,
  },
  create(context) {
    return {
      namespace(ns: Namespace) {
        if (!getVersion(context.program, ns)) return;

        for (const pair of getVersionPairs(context.program, ns)) {
          const { outputModels } = getModelUsage(pair.currNs);

          walkModels(pair.currNs, (currModel) => {
            if (!isProjectType(context.program, currModel)) return;
            if (!outputModels.has(currModel.name)) return; // Only breaking for output models.

            const prevModel = pair.prevNs.models.get(currModel.name);
            if (!prevModel) return; // New model – out of scope.

            for (const [propName, currProp] of currModel.properties) {
              const prevProp = prevModel.properties.get(propName);
              if (!prevProp) continue; // New property – handled by other rules.

              // Warn when a previously required property is now optional.
              if (!prevProp.optional && currProp.optional) {
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
