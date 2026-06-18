import { redirect } from "next/navigation";

// Redirect root to login. Middleware sends authenticated users from /login → /dashboard.
export default function Home() {
  redirect("/login");
}
