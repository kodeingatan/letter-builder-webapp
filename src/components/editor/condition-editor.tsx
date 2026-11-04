"use client";

import { Plus, X } from "lucide-react";
import type { Condition, ConditionOperator } from "@/lib/documents/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { VariableOption } from "./types";

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: "sama dengan",
  neq: "tidak sama dengan",
  contains: "berisi",
  notContains: "tidak berisi",
  gt: "lebih besar",
  gte: "lebih besar / sama",
  lt: "lebih kecil",
  lte: "lebih kecil / sama",
  empty: "kosong",
  notEmpty: "tidak kosong",
};

const OPERATORS = Object.keys(OPERATOR_LABELS) as ConditionOperator[];
const NO_VALUE: ConditionOperator[] = ["empty", "notEmpty"];

function groupVariables(variables: VariableOption[]) {
  return variables.reduce<Record<string, VariableOption[]>>((groups, variable) => {
    groups[variable.group] = groups[variable.group] ?? [];
    groups[variable.group].push(variable);
    return groups;
  }, {});
}

interface ConditionEditorProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  match: "all" | "any";
  onMatchChange: (match: "all" | "any") => void;
  variables: VariableOption[];
  compact?: boolean;
  showMatch?: boolean;
  emptyLabel?: string;
}

export function ConditionEditor({
  conditions,
  onChange,
  match,
  onMatchChange,
  variables,
  compact,
  showMatch = true,
  emptyLabel = "Belum ada kondisi — blok akan selalu ditampilkan.",
}: ConditionEditorProps) {
  const groups = groupVariables(variables);

  const update = (index: number, patch: Partial<Condition>) => {
    onChange(conditions.map((condition, i) => (i === index ? { ...condition, ...patch } : condition)));
  };

  return (
    <div className="flex flex-col gap-2">
      {showMatch ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <span>Penuhi</span>
          <Select
            value={match}
            onChange={(event) => onMatchChange(event.target.value as "all" | "any")}
            className="h-7 w-auto px-1.5 pr-6 text-[11px]"
            aria-label="Mode kondisi"
          >
            <option value="all">semua</option>
            <option value="any">salah satu</option>
          </Select>
          <span>kondisi berikut:</span>
        </div>
      ) : null}

      {conditions.length === 0 ? (
        <p className="rounded-[4px] border border-dashed border-line px-2 py-1.5 text-[11px] text-faint">
          {emptyLabel}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        {conditions.map((condition, index) => (
          <div key={index} className={compact ? "flex flex-col gap-1" : "flex items-center gap-1.5"}>
            <Select
              value={condition.field}
              onChange={(event) => update(index, { field: event.target.value })}
              className="h-7 min-w-0 flex-1 text-[11.5px]"
              aria-label="Field kondisi"
            >
              {!variables.some((variable) => variable.path === condition.field) ? (
                <option value={condition.field}>{condition.field || "Pilih field"}</option>
              ) : null}
              {Object.entries(groups).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((item) => (
                    <option key={`${group}-${item.path}`} value={item.path}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Select
              value={condition.operator}
              onChange={(event) =>
                update(index, { operator: event.target.value as ConditionOperator })
              }
              className="h-7 w-auto shrink-0 text-[11.5px]"
              aria-label="Operator"
            >
              {OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {OPERATOR_LABELS[operator]}
                </option>
              ))}
            </Select>
            {NO_VALUE.includes(condition.operator) ? null : (
              <Input
                value={condition.value}
                onChange={(event) => update(index, { value: event.target.value })}
                placeholder="nilai"
                className="h-7 min-w-0 flex-1 text-[11.5px]"
                aria-label="Nilai pembanding"
              />
            )}
            <button
              type="button"
              onClick={() => onChange(conditions.filter((_, i) => i !== index))}
              className="rounded-[3px] p-1 text-faint hover:bg-danger-soft hover:text-danger"
              aria-label="Hapus kondisi"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="w-fit text-muted"
        onClick={() =>
          onChange([
            ...conditions,
            { field: variables[0]?.path ?? "", operator: "eq", value: "" },
          ])
        }
      >
        <Plus className="h-3 w-3" />
        Tambah kondisi
      </Button>
    </div>
  );
}
