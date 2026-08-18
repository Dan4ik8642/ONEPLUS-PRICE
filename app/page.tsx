import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "./auth";
import CatalogClient from "./catalog-client";

export const dynamic = "force-dynamic";
export default async function Home() {
  const role = await verifySession((await cookies()).get("op_session")?.value);
  if (!role) redirect("/login");
  return <CatalogClient role={role} />;
}
