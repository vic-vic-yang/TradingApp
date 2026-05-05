export type MarkdownSection = {
  id: string;
  title: string;
  body: string;
};

/** Split markdown on top-level `## ` headings for tab panels (preamble becomes first tab). */
export function splitMarkdownByH2(md: string): MarkdownSection[] {
  const trimmed = md.replace(/^\uFEFF/, "").trimEnd();
  if (!trimmed) {
    return [{ id: "empty", title: "完整报告", body: "" }];
  }
  const parts = trimmed.split(/^## (.+)$/m);
  if (parts.length <= 1) {
    return [{ id: "full", title: "完整报告", body: trimmed }];
  }
  const sections: MarkdownSection[] = [];
  const preamble = (parts[0] ?? "").trim();
  if (preamble) {
    sections.push({ id: "preamble", title: "导读", body: preamble });
  }
  for (let i = 1; i < parts.length; i += 2) {
    const title = (parts[i] ?? "").trim() || `章节 ${(i + 1) / 2}`;
    const body = (parts[i + 1] ?? "").trim();
    sections.push({ id: `h2-${i}`, title, body });
  }
  return sections;
}
