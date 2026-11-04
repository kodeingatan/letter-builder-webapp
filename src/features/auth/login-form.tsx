"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@demo.id", password: "Admin1234!" },
  { label: "Operator", email: "operator@demo.id", password: "Operator1234!" },
];

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Masukkan alamat surel yang valid.");
      return;
    }
    if (password.length < 1) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Tidak dapat masuk. Coba lagi.");
        return;
      }
      const redirectTo = searchParams.get("next");
      // Full navigation guarantees the new session cookie is sent with the
      // first request for the workspace; client-side routing can reuse a
      // pre-login RSC payload that still points back to /login.
      window.location.assign(redirectTo?.startsWith("/app") ? redirectTo : "/app");
    } catch {
      setError("Koneksi ke server gagal. Periksa jaringan Anda.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Surel" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@organisasi.go.id"
          aria-invalid={Boolean(error)}
        />
      </Field>

      <Field label="Kata sandi" htmlFor="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[4px] p-1 text-faint hover:bg-warm hover:text-ink"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </Field>

      {error ? (
        <div
          role="alert"
          className="rounded-[6px] border border-[#f6d8d5] bg-danger-soft px-2.5 py-2 text-[12px] text-danger animate-in"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="primary" loading={loading} className="mt-1 w-full">
        {loading ? "Memeriksa…" : "Masuk"}
        {loading ? null : <LogIn className="h-3.5 w-3.5" />}
      </Button>

      <div className="mt-2 rounded-[8px] border border-line bg-warm/60 p-2.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-faint">
          Akun demo
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="flex-1 rounded-[5px] border border-line bg-canvas px-2 py-1.5 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
            >
              <span className="block text-[11.5px] font-medium text-ink">{account.label}</span>
              <span className="block truncate text-[10.5px] text-faint">{account.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10.5px] text-faint">
          Klik salah satu kartu untuk mengisi kredensial demo.
        </p>
      </div>
    </form>
  );
}
