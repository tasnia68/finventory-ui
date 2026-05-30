// Generate the cartesian product of option groups into variant rows.
//
//   generateMatrix([
//     { name: 'Color', values: ['Red', 'Blue'] },
//     { name: 'Size',  values: ['S', 'M', 'L'] },
//   ])
//
// returns 6 rows:
//   [{ attributeValues: { Color: 'Red',  Size: 'S' }, label: 'Red / S' }, ... ]
//
// Empty / single-group inputs are handled — passing `[]` returns a single
// "default" row so a product without options still yields one variant.

export const generateMatrix = (optionGroups = []) => {
  const groups = (optionGroups || [])
    .filter((g) => g && g.name && Array.isArray(g.values) && g.values.length > 0)
    .map((g) => ({
      name: g.name.trim(),
      values: g.values.map((v) => String(v).trim()).filter(Boolean),
    }))
    .filter((g) => g.values.length > 0);

  if (groups.length === 0) {
    return [{ attributeValues: {}, label: 'Default' }];
  }

  const rows = [{}];
  for (const group of groups) {
    const expanded = [];
    for (const row of rows) {
      for (const value of group.values) {
        expanded.push({ ...row, [group.name]: value });
      }
    }
    rows.splice(0, rows.length, ...expanded);
  }

  return rows.map((attributeValues) => ({
    attributeValues,
    label: Object.values(attributeValues).join(' / '),
  }));
};

// Merge a freshly-generated matrix with existing variant rows so users don't
// lose edits when they add/remove an option value. Match by attributeValues
// signature; new rows get default {} settings, removed rows are dropped.
export const reconcileMatrix = (newRows, existingRows = []) => {
  const sigOf = (row) => Object.entries(row.attributeValues || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');

  const existingBySig = new Map(existingRows.map((r) => [sigOf(r), r]));
  return newRows.map((row) => {
    const sig = sigOf(row);
    const existing = existingBySig.get(sig);
    return existing
      ? { ...existing, attributeValues: row.attributeValues, label: row.label }
      : row;
  });
};
