import type { ReactNode } from "react";

export type Axis = { name: string; values: { key: string; label: string }[] };

/**
 * Lays out a paradigm: the first dimension down the side, the second across
 * the top, and one table for each value of the third. `cell` gets the keys
 * of the cell's values in dimension order.
 */
export function ParadigmGrid({ axes, cell }: { axes: Axis[]; cell: (keys: string[]) => ReactNode }) {
  const [rows, cols, tables] = axes;
  if (!rows) return null;
  const cell2 = (row: string, col?: string, table?: string) =>
    cell([row, col, table].filter((k): k is string => k !== undefined));

  return (
    <div className="space-y-4">
      {(tables?.values ?? [undefined]).map((t) => (
        <div key={t?.key ?? "table"} className="overflow-x-auto">
          <table className="paradigm-table text-sm">
            {t && (
              <caption className="pb-1 text-left text-xs uppercase tracking-wide opacity-70">
                {tables!.name}: {t.label}
              </caption>
            )}
            <thead>
              <tr>
                <th scope="col" className="text-xs font-medium opacity-60">
                  {cols ? `${rows.name} \\ ${cols.name}` : rows.name}
                </th>
                {cols ? (
                  cols.values.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                    </th>
                  ))
                ) : (
                  <th scope="col" className="text-xs font-medium opacity-60">
                    Form
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.values.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.label}</th>
                  {cols ? (
                    cols.values.map((c) => <td key={c.key}>{cell2(r.key, c.key, t?.key)}</td>)
                  ) : (
                    <td>{cell2(r.key, undefined, t?.key)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
