import { chromium } from "playwright";
const WEB="http://127.0.0.1:5173", API="http://127.0.0.1:4100";
const OWNER="e44d32ca-7777-4c00-a001-c88f01b92e21";
const login=await fetch(`${API}/api/auth/clinic/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"clinic@example.com",password:"dente2026"})}).then(r=>r.json());
const unlock=await fetch(`${API}/api/auth/staff/unlock`,{method:"POST",headers:{"Content-Type":"application/json","x-dente-clinic-token":login.clinicToken},body:JSON.stringify({userId:OWNER,pinCode:"0000"})}).then(r=>r.json());
const b=await chromium.launch({headless:true});
for (const [w,h] of [[1600,1100],[900,900]]) {
  const c=await b.newContext({viewport:{width:w,height:h},locale:"ru-RU"});
  const p=await c.newPage();
  await p.route(u=>/\/src\/(workspaceShell\.tsx|components\/VoiceAssistantUI\.tsx|components\/Omnibar\.tsx)/.test(u.pathname),async r=>{const res=await r.fetch();const t=await res.text();await r.fulfill({response:res,body:t.replace(/(workspaceActions\/WorkspaceActions\.tsx)\?t=\d+/g,"$1")});});
  await p.goto(WEB,{waitUntil:"domcontentloaded"});
  await p.evaluate(({ct,st})=>{localStorage.setItem("dente_clinic_token",ct);localStorage.setItem("dente_staff_token",st);localStorage.setItem("dente_theme_mode","light");localStorage.setItem("dente_ui_preferences_v1",JSON.stringify({onboardingDismissed:true}));},{ct:login.clinicToken,st:unlock.staffToken});
  await p.goto(`${WEB}/#patients`,{waitUntil:"domcontentloaded"});
  await p.reload({waitUntil:"domcontentloaded"});
  await p.waitForTimeout(5500);
  const r=await p.evaluate(()=>{
    const t=document.querySelector(".topbar");
    const s=getComputedStyle(t);
    const before=t.getBoundingClientRect();
    window.scrollTo(0,900);
    void document.body.offsetHeight;
    const after=t.getBoundingClientRect();
    const host=document.getElementById("dnt-workspace-actions");
    const hostAfter=host?host.getBoundingClientRect():null;
    return {position:s.position,top:s.top,z:s.zIndex,
      topbarBefore:{y:Math.round(before.y),h:Math.round(before.height),bottom:Math.round(before.bottom)},
      scrollY:Math.round(window.scrollY),
      topbarAfterScroll:{y:Math.round(after.y),h:Math.round(after.height),bottom:Math.round(after.bottom)},
      stillOnScreenAfterScroll: after.bottom>0 && after.top<window.innerHeight,
      groupOnScreenAfterScroll: hostAfter? (hostAfter.bottom>0 && hostAfter.top<window.innerHeight):null,
      controls:document.querySelectorAll(".dnt-actions__control").length};
  });
  console.log(w+"x"+h, JSON.stringify(r));
  await c.close();
}
await b.close();
