import {
  type Enum,
  type Interface,
  type Model,
  type Namespace,
  type Operation,
  type Program,
  type Type,
  type Union,
  getLocationContext,
  getTypeName,
  isTemplateDeclaration,
} from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace as mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { getVersion, getVersioningMutators } from "@typespec/versioning";
import type { Version, VersionSnapshotMutation } from "@typespec/versioning";

export interface VersionPair {
  readonly prevNs: Namespace;
  readonly currNs: Namespace;
  readonly prevVersion: Version;
  readonly currVersion: Version;
}

/**
 * Returns all consecutive version pairs for a versioned namespace by projecting
 * the type graph for each version using `mutateSubgraphWithNamespace`.
 *
 * Only processes namespaces that have `@versioned` applied directly (not sub-namespaces
 * that inherit versioning from a parent).  Returns an empty array for non-versioned
 * namespaces.
 */
export function getVersionPairs(program: Program, namespace: Namespace): VersionPair[] {
  // Only process namespaces with @versioned applied directly.
  if (!getVersion(program, namespace)) return [];

  const mutators = getVersioningMutators(program, namespace);
  if (!mutators || mutators.kind !== "versioned") return [];

  const { snapshots } = mutators;
  const pairs: VersionPair[] = [];

  for (let i = 1; i < snapshots.length; i++) {
    const prevSnapshot: VersionSnapshotMutation = snapshots[i - 1];
    const currSnapshot: VersionSnapshotMutation = snapshots[i];

    const { type: prevNs } = mutateSubgraphWithNamespace(program, [prevSnapshot.mutator], namespace);
    const { type: currNs } = mutateSubgraphWithNamespace(program, [currSnapshot.mutator], namespace);

    pairs.push({
      prevNs: prevNs as Namespace,
      currNs: currNs as Namespace,
      prevVersion: prevSnapshot.version,
      currVersion: currSnapshot.version,
    });
  }

  return pairs;
}

/**
 * Returns true when the projected type originates from the user's project (not a
 * compiler built-in or an imported library).  Template declarations are excluded
 * because they represent abstract building blocks rather than concrete API surface.
 */
export function isProjectType(program: Program, type: Type): boolean {
  const node = (type as { node?: object }).node;
  if (!node) return false;
  if (getLocationContext(program, node as never).type !== "project") return false;
  // Skip uninstantiated template declarations – only check concrete types.
  if ("node" in type && isTemplateDeclaration(type as Model)) return false;
  return true;
}

/**
 * Walk all models that are directly in `ns` or in any of its descendant
 * sub-namespaces.
 */
export function walkModels(ns: Namespace, callback: (model: Model) => void): void {
  for (const model of ns.models.values()) {
    callback(model);
  }
  for (const subNs of ns.namespaces.values()) {
    walkModels(subNs, callback);
  }
}

/**
 * Walk all operations (both top-level namespace operations and interface operations)
 * in `ns` and its descendant sub-namespaces.
 */
export function walkOperations(ns: Namespace, callback: (op: Operation, iface?: Interface) => void): void {
  for (const op of ns.operations.values()) {
    callback(op, undefined);
  }
  for (const iface of ns.interfaces.values()) {
    for (const op of iface.operations.values()) {
      callback(op, iface);
    }
  }
  for (const subNs of ns.namespaces.values()) {
    walkOperations(subNs, callback);
  }
}

/**
 * Walk all enums in `ns` and its descendant sub-namespaces.
 */
export function walkEnums(ns: Namespace, callback: (enumType: Enum) => void): void {
  for (const enumType of ns.enums.values()) {
    callback(enumType);
  }
  for (const subNs of ns.namespaces.values()) {
    walkEnums(subNs, callback);
  }
}

/**
 * Find a model by name inside `ns` or any of its descendant sub-namespaces,
 * matching by the same sub-namespace path as `sourcePath`.
 */
export function findModelInNs(ns: Namespace, name: string): Model | undefined {
  return ns.models.get(name);
}

/**
 * Find an operation by name inside `ns` or any of its interfaces.
 */
export function findOperationInNs(ns: Namespace, name: string): Operation | undefined {
  const direct = ns.operations.get(name);
  if (direct) return direct;
  for (const iface of ns.interfaces.values()) {
    const op = iface.operations.get(name);
    if (op) return op;
  }
  return undefined;
}

/**
 * Returns a stable string identifier for a TypeSpec type, used to detect type
 * changes between versions.
 */
export function typeId(type: Type): string {
  return getTypeName(type);
}

/**
 * Recursively collects all named model names reachable from `type`.
 * Handles Model (including source models from spreads/is) and Union types.
 */
function collectModelsFromType(type: Type, names: Set<string>, visited = new Set<string>()): void {
  if (type.kind === "Model") {
    const model = type as Model;
    if (model.name && !visited.has(model.name)) {
      names.add(model.name);
      visited.add(model.name);
      for (const prop of model.properties.values()) {
        collectModelsFromType(prop.type, names, visited);
      }
      for (const src of model.sourceModels) {
        collectModelsFromType(src.model, names, visited);
      }
    }
  } else if (type.kind === "Union") {
    for (const variant of (type as Union).variants.values()) {
      collectModelsFromType(variant.type, names, visited);
    }
  }
}

/**
 * Returns sets of model names that are used as inputs (operation parameters /
 * request bodies) and outputs (operation return types) within `ns` and its
 * descendant sub-namespaces.
 */
export function getModelUsage(ns: Namespace): { inputModels: Set<string>; outputModels: Set<string> } {
  const inputModels = new Set<string>();
  const outputModels = new Set<string>();
  const inputVisited = new Set<string>();
  const outputVisited = new Set<string>();

  walkOperations(ns, (op) => {
    for (const prop of op.parameters.properties.values()) {
      collectModelsFromType(prop.type, inputModels, inputVisited);
    }
    for (const src of op.parameters.sourceModels) {
      collectModelsFromType(src.model, inputModels, inputVisited);
    }
    collectModelsFromType(op.returnType, outputModels, outputVisited);
  });

  return { inputModels, outputModels };
}
