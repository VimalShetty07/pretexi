/**
 * Worker / portal checklist GET may return either a legacy plain array or
 * `{ items, superseded_documents }` — normalize so callers always get arrays.
 */
export function parseChecklistListPayload<TItem, TSup = unknown>(
  data: unknown
): { items: TItem[]; superseded_documents: TSup[] } {
  if (Array.isArray(data)) {
    return { items: data as TItem[], superseded_documents: [] as TSup[] };
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const items = Array.isArray(o.items) ? (o.items as TItem[]) : [];
    const superseded_documents = Array.isArray(o.superseded_documents)
      ? (o.superseded_documents as TSup[])
      : [];
    return { items, superseded_documents };
  }
  return { items: [], superseded_documents: [] as TSup[] };
}
