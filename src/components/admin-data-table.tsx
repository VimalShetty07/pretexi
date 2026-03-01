import { ReactNode } from "react";

interface AdminDataTableProps {
  headers: string[];
  colSpan: number;
  loading: boolean;
  isEmpty: boolean;
  loadingContent: ReactNode;
  emptyContent: ReactNode;
  children: ReactNode;
  fontSize?: number;
}

export function AdminDataTable({
  headers,
  colSpan,
  loading,
  isEmpty,
  loadingContent,
  emptyContent,
  children,
  fontSize = 13,
}: AdminDataTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full admin-uniform-table" style={{ fontSize }}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              {headers.map((h) => (
                <th
                  key={h || "_action"}
                  className="text-left font-semibold text-[var(--muted-foreground)] uppercase"
                  style={{ padding: "12px 16px", fontSize: 11, letterSpacing: "0.05em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="text-center text-[var(--muted-foreground)]" style={{ padding: 40 }}>
                  {loadingContent}
                </td>
              </tr>
            ) : isEmpty ? (
              <tr>
                <td colSpan={colSpan} className="text-center" style={{ padding: 40 }}>
                  {emptyContent}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
