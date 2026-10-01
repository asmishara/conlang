"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canEdit } from "@/lib/access";
import { db } from "@/lib/db";
import { starterSections, subtreeIds } from "@/lib/grammar";

export type PageFormState = { error?: string; savedAt?: number };

function refresh(languageId: string) {
  revalidatePath(`/languages/${languageId}`, "layout");
}

async function nextPosition(languageId: string, parentId: string | null) {
  const last = await db.grammarPage.findFirst({
    where: { languageId, parentId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? -1) + 1;
}

export async function createPage(languageId: string, parentId: string | null) {
  if (!(await canEdit(languageId))) redirect("/signin");
  if (parentId) {
    const parent = await db.grammarPage.findFirst({ where: { id: parentId, languageId }, select: { id: true } });
    if (!parent) parentId = null;
  }
  const page = await db.grammarPage.create({
    data: { languageId, parentId, title: "Untitled page", position: await nextPosition(languageId, parentId) },
  });
  refresh(languageId);
  redirect(`/languages/${languageId}/grammar/${page.id}/edit`);
}

export async function createStarterPages(languageId: string) {
  if (!(await canEdit(languageId))) redirect("/signin");
  const existing = await db.grammarPage.count({ where: { languageId } });
  if (existing === 0) {
    await db.$transaction(async (tx) => {
      for (const [i, section] of starterSections.entries()) {
        const page = await tx.grammarPage.create({
          data: { languageId, title: section.title, body: section.body, position: i },
        });
        for (const [j, child] of (section.children ?? []).entries()) {
          await tx.grammarPage.create({
            data: { languageId, parentId: page.id, title: child.title, body: child.body, position: j },
          });
        }
      }
    });
  }
  refresh(languageId);
  redirect(`/languages/${languageId}/grammar`);
}

const pageInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().max(100_000, "This page is too long; split it into subpages"),
  parentId: z.string().max(40).transform((s) => s || null),
});

export async function savePage(
  languageId: string,
  pageId: string,
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  if (!(await canEdit(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const parsed = pageInput.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    parentId: formData.get("parentId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid page" };

  const pages = await db.grammarPage.findMany({
    where: { languageId },
    select: { id: true, parentId: true, title: true, position: true },
  });
  const page = pages.find((p) => p.id === pageId);
  if (!page) return { error: "This page no longer exists." };

  const { parentId } = parsed.data;
  if (parentId && (subtreeIds(pages, pageId).has(parentId) || !pages.some((p) => p.id === parentId))) {
    return { error: "A page can't be moved under itself or one of its subpages." };
  }
  const moved = parentId !== page.parentId;

  await db.grammarPage.update({
    where: { id: pageId },
    data: {
      title: parsed.data.title,
      body: parsed.data.body.replace(/\r\n/g, "\n"),
      parentId,
      ...(moved ? { position: await nextPosition(languageId, parentId) } : {}),
    },
  });
  refresh(languageId);
  return { savedAt: Date.now() };
}

export async function movePage(languageId: string, pageId: string, direction: "up" | "down") {
  if (!(await canEdit(languageId))) return;
  const page = await db.grammarPage.findFirst({ where: { id: pageId, languageId } });
  if (!page) return;
  const siblings = await db.grammarPage.findMany({
    where: { languageId, parentId: page.parentId },
    orderBy: [{ position: "asc" }, { title: "asc" }],
    select: { id: true },
  });
  const i = siblings.findIndex((s) => s.id === pageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return;
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  await db.$transaction(siblings.map((s, position) => db.grammarPage.update({ where: { id: s.id }, data: { position } })));
  refresh(languageId);
}

export async function deletePage(languageId: string, pageId: string) {
  if (await canEdit(languageId)) {
    // Subpages are removed with it (cascade).
    await db.grammarPage.deleteMany({ where: { id: pageId, languageId } });
    refresh(languageId);
  }
  redirect(`/languages/${languageId}/grammar`);
}
