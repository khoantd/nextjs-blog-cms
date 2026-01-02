import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";

export default async function Dashboard() {
  await requireAuth();
  redirect("/blog-posts");
}
