// apps/web/app/api/auth/[...nextauth]/route.ts
//
// Thin route wrapper. The NextAuth configuration itself lives in `lib/auth.ts`
// so Server Components can call `auth()` without importing a route module.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
