// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { Terminal, type ILink } from "@xterm/xterm";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { createPathLinkProvider } from "./path-link-provider";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/lib/open-file", () => ({ openFileOrReveal: vi.fn() }));

const terminals: Terminal[] = [];
afterEach(() => {
  for (const term of terminals.splice(0)) term.dispose();
});

async function linksFor(text: string): Promise<ILink[]> {
  // Use xterm's actual Unicode cells, including wide-glyph spacer cells and
  // combining marks; string indexes alone cannot describe these ranges.
  const term = new Terminal({ cols: 80, rows: 2, allowProposedApi: true });
  terminals.push(term);
  term.loadAddon(new Unicode11Addon());
  term.unicode.activeVersion = "11";
  await new Promise<void>((resolve) => term.write(text, resolve));
  return new Promise((resolve) => {
    createPathLinkProvider(term, "terminal-link-test").provideLinks(1, (links) =>
      resolve(links ?? []),
    );
  });
}

describe("terminal link cell ranges", () => {
  it.each([
    ["中文 /tmp/a.ts", 6, 14],
    ["e\u0301 /tmp/a.ts", 3, 11],
    ["🙂 /tmp/a.ts", 4, 12],
    ["ok /tmp/a.ts", 4, 12],
  ])("places the path on its rendered cells in %s", async (text, start, end) => {
    const links = await linksFor(text);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      text: "/tmp/a.ts",
      range: { start: { x: start, y: 1 }, end: { x: end, y: 1 } },
    });
  });

  it("includes wide characters inside a URL and maps a following path independently", async () => {
    const links = await linksFor("中 https://a.test/文档 /tmp/b.ts");
    expect(links.map(({ text, range }) => ({ text, range }))).toEqual([
      {
        text: "https://a.test/文档",
        range: { start: { x: 4, y: 1 }, end: { x: 22, y: 1 } },
      },
      {
        text: "/tmp/b.ts",
        range: { start: { x: 24, y: 1 }, end: { x: 32, y: 1 } },
      },
    ]);
  });
});
