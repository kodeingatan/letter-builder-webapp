import { z } from "zod";
import { getDb } from "@/lib/db";
import { startSession, verifyPassword } from "@/lib/auth";
import { ApiError, jsonOk, readJson, withApi } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Format surel tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const POST = withApi(async (request) => {
  const { email, password } = await readJson(request, schema);

  const user = getDb()
    .prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?")
    .get(email) as
    | { id: string; name: string; email: string; role: string; password_hash: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, "Surel atau kata sandi tidak sesuai.");
  }

  await startSession(user.id);

  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
