// app/api/auth/[...nextauth]/route.js
export const runtime = "nodejs";
export const revalidate = 0;
export { GET, POST } from "@/lib/auth";
