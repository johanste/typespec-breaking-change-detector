import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getVersionPairs, isProjectType, walkOperations } from "../version-comparison.js";

export const noOperationRemovedRule = createRule({
  name: "no-operation-removed",
  severity: "warning",
  description:
    "Warns when an operation that existed in a previous API version is absent in the next version. Removing an operation breaks all existing clients that call it.",
  messages: {
    default: paramMessage`Operation '${"opName"}' was removed between versions '${"prevVersion"}' and '${"currVersion"}'. Removing an operation is a breaking change.`,
  },
  create(context) {
    return {
      namespace(ns: Namespace) {
        if (!getVersion(context.program, ns)) return;

        for (const pair of getVersionPairs(context.program, ns)) {
          walkOperations(pair.prevNs, (prevOp, prevIface) => {
            if (!isProjectType(context.program, prevOp)) return;

            // Determine whether the same operation still exists in the current version.
            let stillExists = false;
            if (prevIface) {
              // Operation lives inside an interface: look up interface by name then op.
              const currIface = pair.currNs.interfaces.get(prevIface.name);
              stillExists = currIface?.operations.has(prevOp.name) ?? false;
            } else {
              stillExists = pair.currNs.operations.has(prevOp.name);
            }

            if (!stillExists) {
              context.reportDiagnostic({
                target: prevOp,
                format: {
                  opName: prevOp.name,
                  prevVersion: pair.prevVersion.name,
                  currVersion: pair.currVersion.name,
                },
              });
            }
          });
        }
      },
    };
  },
});
