import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listAdministrasi } from "@/features/administrasi/server";
import { listSurat } from "@/features/surat/server";
import { SuratIndex } from "@/features/surat/surat-index";

export const metadata: Metadata = { title: "Surat" };
export const dynamic = "force-dynamic";

export default async function SuratPage({
  searchParams,
}: {
  searchParams: Promise<{ administrasi?: string }>;
}) {
  const { administrasi } = await searchParams;
  const [letters, administrasiList] = await Promise.all([
    Promise.resolve(listSurat()),
    Promise.resolve(listAdministrasi()),
    getCurrentUser(),
  ]);

  const groups = administrasiList
    .map((item) => ({
      administrasi: item,
      letters: letters.filter((letter) => letter.administrasiId === item.id),
    }))
    .filter((group) => group.administrasi.status === "active" || group.letters.length > 0);

  return <SuratIndex groups={groups} defaultAdministrasiId={administrasi} />;
}
