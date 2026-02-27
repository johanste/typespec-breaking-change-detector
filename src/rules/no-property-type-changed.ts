import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getVersionPairs, isProjectType, typeId, walkModels } from "../version-comparison.js";

export const noPropertyTypeChangedRule = createRule({
  name: "no-property-type-changed",
  severity: "warning",
  description:
    "Warns when the type of a model property changes between API versions. Type changes are generally incompatible with existing clients.",
  messages: {
    default: paramMessage`Type of property '${"propName"}' changed from '${"prevType"}' to '${"currType"}' between versions '${"prevVersion"}' and '${"currVersion"}'. Changing a property type is a breaking change.`,
  },
  create(context) {
    return {
      namespace(ns: Namespace) {
        if (!getVersion(context.program, ns)) return;

        for (const pair of getVersionPairs(context.program, ns)) {
          walkModels(pair.currNs, (currModel) => {
            if (!isProjectType(context.program, currModel)) return;

            const prevModel = pair.prevNs.models.get(currModel.name);
            if (!prevModel) return;

            for (const [propName, currProp] of currModel.properties) {
              const prevProp = prevModel.properties.get(propName);
              if (!prevProp) continue; // New property – handled by no-required-property-added.

              const prevType = typeId(prevProp.type);
              const currType = typeId(currProp.type);
              if (prevType !== currType) {
                context.reportDiagnostic({
                  target: currProp,
                  format: {
                    propName,
                    prevType,
                    currType,
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
