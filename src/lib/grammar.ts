export type PageRow = { id: string; parentId: string | null; title: string; position: number };
export type PageNode = PageRow & { children: PageNode[] };

const byPosition = (a: PageRow, b: PageRow) => a.position - b.position || a.title.localeCompare(b.title);

/** Builds the page tree. Pages whose parent is missing become top-level. */
export function buildTree(rows: PageRow[]): PageNode[] {
  const nodes = new Map(rows.map((r) => [r.id, { ...r, children: [] as PageNode[] }]));
  const roots: PageNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: PageNode[]) => {
    list.sort(byPosition);
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Ids of a page and everything nested under it. */
export function subtreeIds(rows: PageRow[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.parentId && out.has(r.parentId) && !out.has(r.id)) {
        out.add(r.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Flattens the tree in reading order, with each page's depth. */
export function flatten(tree: PageNode[], depth = 0): { node: PageNode; depth: number }[] {
  return tree.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)]);
}

/** Sections offered when a language has no grammar pages yet. */
export const starterSections: { title: string; body: string; children?: { title: string; body: string }[] }[] = [
  {
    title: "Overview",
    body: "A short introduction: who speaks the language, its typology (word order, morphology), and anything unusual about it.",
  },
  {
    title: "Nouns",
    body: "Number, case, gender or noun classes, and how nouns are marked for them.",
    children: [{ title: "Pronouns", body: "Personal, demonstrative and interrogative pronouns." }],
  },
  {
    title: "Verbs",
    body: "Tense, aspect, mood, agreement and how verbs inflect.",
  },
  {
    title: "Syntax",
    body: [
      "Basic word order, questions, negation and clause combining.",
      "",
      "Glossed examples go in a `gloss` block. Words line up by position, and a quoted last line is the translation:",
      "",
      "```gloss",
      "tama-ki   nami",
      "water-PL  run",
      '"The waters run."',
      "```",
    ].join("\n"),
  },
];
