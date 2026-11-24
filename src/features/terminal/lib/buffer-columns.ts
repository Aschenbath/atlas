import type { IBufferLine } from "@xterm/xterm";

/** Convert a UTF-16 offset in `translateToString` to a terminal cell column.
 * Wide glyphs have an extra spacer cell, while combining marks share a cell. */
export function cellColumn(line: IBufferLine, offset: number, cols: number): number {
  let seen = 0;
  for (let x = 0; x < cols; x++) {
    const cell = line.getCell(x);
    if (!cell || cell.getWidth() === 0) continue;
    if (seen >= offset) return x;
    seen += cell.getChars().length || 1;
  }
  return cols;
}
