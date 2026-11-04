"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import type { UserRow } from "./server";
import { formatDate, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

export function UsersScreen({
  users: initialUsers,
  currentUser,
}: {
  users: UserRow[];
  currentUser: AuthUser;
}) {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/settings/users/${deleteTarget.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menghapus pengguna.");
        return;
      }
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      toast.success("Pengguna dihapus");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3 p-4 sm:p-5">
      <SectionCard
        title="Pengguna ruang kerja"
        description="Admin mengelola data dan pengaturan; operator membuat serta mengisi surat."
        actions={
          <Button size="xs" variant="secondary" onClick={() => setInviteOpen(true)}>
            <Plus className="h-3 w-3" />
            Pengguna
          </Button>
        }
        bodyClassName="p-0"
      >
        <table className="w-full border-collapse text-[12px]">
          <thead className="text-left text-[10px] uppercase tracking-[0.05em] text-faint">
            <tr>
              <th className="px-3.5 py-2 font-medium">Nama</th>
              <th className="px-2 py-2 font-medium">Surel</th>
              <th className="px-2 py-2 font-medium">Peran</th>
              <th className="hidden px-2 py-2 font-medium sm:table-cell">Dibuat</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="group border-t border-line">
                <td className="px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warm text-[9.5px] font-semibold text-muted">
                      {initials(user.name)}
                    </span>
                    <span className="font-medium text-ink">{user.name}</span>
                    {user.id === currentUser.id ? <Badge tone="blue">Anda</Badge> : null}
                  </div>
                </td>
                <td className="px-2 py-2 text-muted">{user.email}</td>
                <td className="px-2 py-2">
                  <Badge tone={user.role === "admin" ? "blue" : "neutral"}>
                    {user.role === "admin" ? "Admin" : "Operator"}
                  </Badge>
                </td>
                <td className="hidden px-2 py-2 text-[11px] text-faint sm:table-cell">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-2 py-2 text-right">
                  {user.id === currentUser.id ? null : (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                      className="rounded-[3px] p-1 text-faint opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                      aria-label={`Hapus ${user.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-start gap-2 border-t border-line bg-warm/40 px-3.5 py-2 text-[10.5px] leading-relaxed text-faint">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          Operator tidak dapat menghapus surat, memulihkan versi, atau mengubah template dan tabel.
          Minimal satu admin harus tetap ada.
        </div>
      </SectionCard>

      <PasswordCard />

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={(user) => {
          setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name)));
          setInviteOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Hapus ${deleteTarget?.name ?? "pengguna"}?`}
        description="Akun dan sesi pengguna dihapus. Surat yang pernah dibuat tetap tersimpan."
        confirmLabel="Hapus pengguna"
        destructive
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: UserRow) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });
      const payload = (await response.json()) as { user?: UserRow; error?: string };
      if (!response.ok || !payload.user) {
        setError(payload.error ?? "Gagal menambahkan pengguna.");
        return;
      }
      toast.success("Pengguna ditambahkan", "Bagikan kata sandi awal secara aman.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("operator");
      onCreated(payload.user);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pengguna baru"
      description="Akun langsung aktif. Minta pengguna mengganti kata sandi setelah masuk."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            <UserRound className="h-3.5 w-3.5" />
            Tambahkan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Nama lengkap" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </Field>
        <Field label="Surel" required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@instansi.go.id"
          />
        </Field>
        <Field label="Peran">
          <Select value={role} onChange={(event) => setRole(event.target.value as "admin" | "operator")}>
            <option value="operator">Operator — membuat dan mengisi surat</option>
            <option value="admin">Admin — akses penuh</option>
          </Select>
        </Field>
        <Field label="Kata sandi awal" required hint="Minimal 8 karakter, memuat huruf dan angka." error={error}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </div>
    </Dialog>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (next !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal mengganti kata sandi.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Kata sandi diperbarui");
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="Keamanan akun"
      description="Ganti kata sandi akun yang sedang Anda gunakan."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kata sandi saat ini">
          <Input
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="Kata sandi baru" hint="Min. 8 karakter, huruf dan angka.">
          <Input
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Ulangi kata sandi baru" error={error}>
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10.5px] text-faint">
          Sesi lain tetap aktif. Keluar lalu masuk kembali pada perangkat lain bila perlu.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={submit}
          loading={loading}
          disabled={!current || !next || !confirm}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Ubah kata sandi
        </Button>
      </div>
    </SectionCard>
  );
}
