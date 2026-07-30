import { chromium } from "playwright";
const WEB="http://127.0.0.1:5173", API="http://127.0.0.1:4100";
const OWNER="e44d32ca-7777-4c00-a001-c88f01b92e21";
const login=await fetch(`${API}/api/auth/clinic/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"clinic@example.com",password:"dente2026"})}).then(r=>r.json());
const unlock=await fetch(`${API}/api/auth/staff/unlock`,{method:"POST",headers:{"Content-Type":"application/json","x-dente-clinic-token":login.clinicToken},body:JSON.stringify({userId:OWNER,pinCode:"0000"})}).then(r=>r.json());
const b=await chromium.launch({headless:true});
const c=await b.newContext({viewport:{width:1600,height:1100},locale:"ru-RU"});
const p=await c.newPage();
await p.route(u=>/\/src\/(workspaceShell\.tsx|components\/VoiceAssistantUI\.tsx|components\/Omnibar\.tsx)/.test(u.pathname),async r=>{const res=await r.fetch();const t=await res.text();await r.fulfill({response:res,body:t.replace(/(workspaceActions\/WorkspaceActions\.tsx)\?t=\d+/g,"$1")});});
await p.goto(WEB,{waitUntil:"domcontentloaded"});
await p.evaluate(({ct,st})=>{localStorage.setItem("dente_clinic_token",ct);localStorage.setItem("dente_staff_token",st);localStorage.setItem("dente_theme_mode","light");localStorage.setItem("dente_ui_preferences_v1",JSON.stringify({onboardingDismissed:true}));},{ct:login.clinicToken,st:unlock.staffToken});
await p.goto(`${WEB}/#patients`,{waitUntil:"domcontentloaded"});
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForTimeout(5500);
const scrollers=await p.evaluate(()=>{
  const out=[];
  for (const sel of ["html","body","main.app-shell","section.workspace",".patients-panel"]) {
    const el=document.querySelector(sel);
    if(!el) continue;
    const s=getComputedStyle(el);
    out.push({sel,overflowY:s.overflowY,scrollH:el.scrollHeight,clientH:el.clientHeight,scrolls:el.scrollHeight>el.clientHeight+1});
  }
  return {out, scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior, docScrollH:document.scrollingElement.scrollHeight, docClientH:document.scrollingElement.clientHeight};
});
console.log("SCROLLERS", JSON.stringify(scrollers));
await p.evaluate(()=>{document.documentElement.style.scrollBehavior="auto"; window.scrollTo(0,900);});
await p.waitForTimeout(700);
const after=await p.evaluate(()=>{
  const t=document.querySelector(".topbar"), host=document.getElementById("dnt-workspace-actions");
  const tb=t.getBoundingClientRect(), hb=host?host.getBoundingClientRect():null;
  return {scrollY:Math.round(window.scrollY), topbarY:Math.round(tb.y), topbarH:Math.round(tb.height),
    topbarOnScreen: tb.bottom>0 && tb.top<window.innerHeight,
    hostY: hb?Math.round(hb.y):null, hostOnScreen: hb?(hb.bottom>0 && hb.top<window.innerHeight):null,
    stickyPinned: Math.abs(tb.y)<2};
});
console.log("AFTER SETTLED SCROLL", JSON.stringify(after));
await c.close(); await b.close();
