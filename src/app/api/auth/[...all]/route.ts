import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const handler = (req: Request): Promise<Response> | Response => auth.handler(req);

export const GET = handler;
export const POST = handler;
