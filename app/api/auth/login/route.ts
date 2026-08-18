import { createSession, credentialsFor, type Role } from "../../../auth";
export async function POST(request: Request) {
  const body=await request.json() as {login?:string;password?:string;role?:Role}; const role:Role=body.role==="admin"?"admin":"partner"; const expected=credentialsFor(role);
  if(body.login!==expected.login||body.password!==expected.password) return Response.json({error:"Неверный логин или пароль"},{status:401});
  const token=await createSession(role); const secure=new URL(request.url).hostname==="localhost"?"":"; Secure"; return new Response(JSON.stringify({ok:true,role}),{headers:{"content-type":"application/json","set-cookie":`op_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=43200`}});
}
