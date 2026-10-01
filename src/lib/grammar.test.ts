import { describe, expect, it } from "vitest";
import { buildTree, flatten, subtreeIds } from "./grammar";

const rows = [
  { id: "b", parentId: null, title: "Verbs", position: 1 },
  { id: "a", parentId: null, title: "Nouns", position: 0 },
  { id: "a2", parentId: "a", title: "Pronouns", position: 0 },
  { id: "a2x", parentId: "a2", title: "Possessives", position: 0 },
  { id: "orphan", parentId: "gone", title: "Orphan", position: 5 },
];

describe("buildTree / flatten", () => {
  it("nests pages, sorts by position and keeps orphans at the top level", () => {
    const flat = flatten(buildTree(rows)).map(({ node, depth }) => `${depth}:${node.title}`);
    expect(flat).toEqual(["0:Nouns", "1:Pronouns", "2:Possessives", "0:Verbs", "0:Orphan"]);
  });
});

describe("subtreeIds", () => {
  it("includes the page and all descendants", () => {
    expect([...subtreeIds(rows, "a")].sort()).toEqual(["a", "a2", "a2x"]);
    expect([...subtreeIds(rows, "b")]).toEqual(["b"]);
  });
});
