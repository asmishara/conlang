import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseInterlinear, splitGloss } from "@/lib/interlinear";

type HastNode = { type: string; value?: string; tagName?: string; properties?: { className?: unknown }; children?: HastNode[] };

function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

function isGlossBlock(node: HastNode | undefined): node is HastNode {
  const code = node?.children?.[0];
  const cls = code?.properties?.className;
  return code?.tagName === "code" && Array.isArray(cls) && cls.includes("language-gloss");
}

/** A numbered, Leipzig-style interlinear example. */
export function GlossExample({ source }: { source: string }) {
  const { columns, tiers, translation, warning } = parseInterlinear(source);
  if (tiers === 0) return null;
  return (
    <div className="gloss-example my-4 flex gap-3">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col">
              {col.map((word, t) => (
                <span
                  key={t}
                  className={
                    t === 0 && tiers > 1
                      ? "font-ipa italic"
                      : t === tiers - 1 && tiers > 1
                        ? "text-sm"
                        : "font-ipa"
                  }
                >
                  {t === tiers - 1 && tiers > 1 ? <GlossWord word={word} /> : word || "\u00a0"}
                </span>
              ))}
            </div>
          ))}
        </div>
        {translation && <p className="mt-1">‘{translation}’</p>}
        {warning && <p className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>}
      </div>
    </div>
  );
}

function GlossWord({ word }: { word: string }) {
  if (!word) return <>{"\u00a0"}</>;
  return (
    <>
      {splitGloss(word).map((p, i) =>
        p.abbrev ? (
          <abbr key={i} className="small-caps no-underline" title={p.text.toUpperCase()}>
            {p.text}
          </abbr>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

const components: Components = {
  pre({ node, children }): ReactNode {
    if (isGlossBlock(node as HastNode)) return <GlossExample source={textOf(node as HastNode).replace(/\n$/, "")} />;
    return <pre>{children}</pre>;
  },
  // Keep links from user content from opening javascript: URLs or leaking the referrer.
  a({ href, children }) {
    const safe = href && /^(https?:|mailto:|\/|#)/i.test(href) ? href : undefined;
    const external = safe?.startsWith("http");
    return (
      <a href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
        {children}
      </a>
    );
  },
};

/** Renders a grammar page's Markdown, with ```gloss blocks as interlinear examples. */
export function GrammarMarkdown({ source }: { source: string }) {
  return (
    <div className="grammar-prose">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
