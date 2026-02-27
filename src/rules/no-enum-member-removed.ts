import { type Namespace, createRule, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getVersionPairs, isProjectType, walkEnums } from "../version-comparison.js";

export const noEnumMemberRemovedRule = createRule({
  name: "no-enum-member-removed",
  severity: "warning",
  description:
    "Warns when an enum member that existed in a previous API version is absent in the next version. Clients that pattern-match on the removed value will break.",
  messages: {
    default: paramMessage`Enum member '${"memberName"}' was removed from '${"enumName"}' between versions '${"prevVersion"}' and '${"currVersion"}'. Removing an enum member is a breaking change.`,
  },
  create(context) {
    return {
      namespace(ns: Namespace) {
        if (!getVersion(context.program, ns)) return;

        for (const pair of getVersionPairs(context.program, ns)) {
          walkEnums(pair.prevNs, (prevEnum) => {
            if (!isProjectType(context.program, prevEnum)) return;

            const currEnum = pair.currNs.enums.get(prevEnum.name);
            if (!currEnum) return; // Whole enum removed – out of scope for this rule.

            for (const [memberName, prevMember] of prevEnum.members) {
              if (!currEnum.members.has(memberName)) {
                context.reportDiagnostic({
                  target: prevMember,
                  format: {
                    memberName,
                    enumName: prevEnum.name,
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
