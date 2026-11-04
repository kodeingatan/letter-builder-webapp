export interface VariableOption {
  path: string;
  label: string;
  group: string;
}

export interface ComponentOption {
  id: string;
  name: string;
  category: string;
}

export interface TableFieldOption {
  name: string;
  label: string;
  type: string;
}

export interface TableOption {
  id: string;
  name: string;
  slug: string;
  fields: TableFieldOption[];
}

export interface LetterFieldOption {
  key: string;
  label: string;
  type: string;
}

export function buildVariableOptions(
  tables: TableOption[],
  letterFields: LetterFieldOption[],
  activeTableId?: string | null,
): VariableOption[] {
  const options: VariableOption[] = [];

  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;
  if (activeTable) {
    activeTable.fields.forEach((field) => {
      options.push({
        path: field.name,
        label: `${field.label} (baris aktif)`,
        group: "Baris data aktif",
      });
    });
  }

  letterFields.forEach((field) => {
    options.push({ path: `surat.${field.key}`, label: field.label, group: "Data surat" });
  });
  options.push({ path: "surat.nomor", label: "Nomor Surat", group: "Data surat" });
  options.push({ path: "surat.tanggal", label: "Tanggal Surat", group: "Data surat" });

  tables.forEach((table) => {
    table.fields.forEach((field) => {
      options.push({
        path: `${table.slug}.${field.name}`,
        label: field.label,
        group: `Tabel ${table.name}`,
      });
    });
  });

  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.group}:${option.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
