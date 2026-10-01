import { consonantPlaces, consonantRows, vowelBackness, vowelRows, type Cell } from "./ipa";

export type Chart = { columns: string[]; rows: { label: string; cells: string[][] }[]; others: string[] };

/** Keeps the rows and columns of a chart that hold at least one of `symbols`. */
function trim(columns: readonly string[], rows: { label: string; cells: Cell[] }[], symbols: string[]): Chart {
  const have = new Set(symbols);
  const kept = rows.map((r) => ({
    label: r.label,
    cells: r.cells.map((cell) => cell.filter((s): s is string => s !== null && have.has(s))),
  }));
  const usedColumns = columns.map((_, i) => kept.some((r) => r.cells[i].length > 0));
  const onChart = new Set(kept.flatMap((r) => r.cells.flat()));
  return {
    columns: columns.filter((_, i) => usedColumns[i]),
    rows: kept
      .filter((r) => r.cells.some((c) => c.length > 0))
      .map((r) => ({ label: r.label, cells: r.cells.filter((_, i) => usedColumns[i]) })),
    others: symbols.filter((s) => !onChart.has(s)),
  };
}

/** The language's consonants laid out by place and manner, plus any the grid doesn't cover. */
export function consonantChart(symbols: string[]): Chart {
  return trim(
    consonantPlaces,
    consonantRows.map((r) => ({ label: r.manner, cells: r.cells })),
    symbols,
  );
}

/** The language's vowels laid out by height and backness, plus any the grid doesn't cover. */
export function vowelChart(symbols: string[]): Chart {
  return trim(
    vowelBackness,
    vowelRows.map((r) => ({ label: r.height, cells: r.cells })),
    symbols,
  );
}
