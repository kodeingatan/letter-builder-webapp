"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_PAGE } from "@/lib/documents/types";

const EMPTY_DOCUMENT = {
  version: 1,
  blocks: [
    {
      id: `blk_${Math.random().toString(36).slice(2, 12)}`,
      type: "paragraph",
      content: [],
    },
  ],
};

export function NewTemplateButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template baru",
          description: "",
          content: EMPTY_DOCUMENT,
          page: DEFAULT_PAGE,
        }),
      });
      const payload = (await response.json()) as { template?: { id: string }; error?: string };
      if (!response.ok || !payload.template) {
        toast.error(payload.error ?? "Gagal membuat template.");
        return;
      }
      router.push(`/app/templates/${payload.template.id}`);
      router.refresh();
    } catch {
      toast.error("Koneksi gagal", "Periksa jaringan lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant={variant} onClick={create} loading={loading}>
      <FilePlus2 className="h-3.5 w-3.5" />
      Template baru
    </Button>
  );
}
