import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getVersionPairs, isProjectType, walkModels } from "../version-comparison.js";

export const noPropertyRemovedRule = createRule({
  name: "no-property-removed",
  severity: "warning",
  description:
    "Warns when a model property that existed in a previous API version is absent in the next version.",
  messages: {
    default: paramMessage`Property '${"propName"}' was removed between versions '${"prevVersion"}' and '${"currVersion"}'. Removing a property is a breaking change.`,
  },
  create(context) {
    return {
      namespace(ns: Namespace) {
        // Only process namespaces with @versioned applied directly.
        if (!getVersion(context.program, ns)) return;

        for (const pair of getVersionPairs(context.program, ns)) {
          walkModels(pair.prevNs, (prevModel) => {
            if (!isProjectType(context.program, prevModel)) return;

            const currModel = pair.currNs.models.get(prevModel.name);
            if (!currModel) return; // Whole model removed – out of scope for this rule.

            for (const [propName, prevProp] of prevModel.properties) {
              if (!currModel.properties.has(propName)) {
                context.reportDiagnostic({
                  target: prevProp,
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
