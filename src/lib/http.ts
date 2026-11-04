import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { getCurrentUser, type AuthUser, type UserRole } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export async function readJson<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<output<S>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "Body request bukan JSON yang valid.");
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ApiError(422, "Data tidak valid.", result.error.flatten());
  }
  return result.data;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sesi berakhir. Silakan masuk kembali.");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new ApiError(403, "Hanya admin yang dapat melakukan aksi ini.");
  }
  return user;
}

export function assertSameOrigin(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin) return;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return;

  try {
    if (new URL(origin).host !== host) {
      throw new ApiError(403, "Permintaan lintas origin ditolak.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "Origin tidak valid.");
  }
}

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function withApi(handler: Handler): Handler {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, details: error.details ?? null },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Data tidak valid.", details: error.flatten() },
          { status: 422 },
        );
      }
      console.error("[api] unhandled error", error);
      return NextResponse.json(
        { error: "Terjadi kesalahan pada server. Coba lagi." },
        { status: 500 },
      );
    }
  };
}

export function assertRole(user: AuthUser, role: UserRole, message = "Akses ditolak."): void {
  if (user.role !== role) throw new ApiError(403, message);
}
