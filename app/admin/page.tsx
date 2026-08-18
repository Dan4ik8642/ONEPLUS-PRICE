import { cookies } from "next/headers";import{redirect}from"next/navigation";import{verifySession}from"../auth";import AdminClient from"./admin-client";
export const dynamic="force-dynamic";export default async function Admin(){const role=await verifySession((await cookies()).get("op_session")?.value);if(role!=="admin")redirect("/login");return <AdminClient/>}
