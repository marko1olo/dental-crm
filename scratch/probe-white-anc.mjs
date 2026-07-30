import { chromium } from "playwright";
const WEB="http://127.0.0.1:5173", API="http://127.0.0.1:4100", OWNER="e44d32ca-7777-4c00-a001-c88f01b92e21";
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
await p.goto(WEB,{waitUntil:"domcontentloaded"});
await p.evaluate(async ({api,owner})=>{
  const r=await fetch(`${api}/api/auth/clinic/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"clinic@example.com",password:"dente2026"})});
  const bd=await r.json();
  const s=await fetch(`${api}/api/auth/staff/unlock`,{method:"POST",headers:{"Content-Type":"application/json","x-dente-clinic-token":bd.clinicToken},body:JSON.stringify({userId:owner,pinCode:"0000"})});
  const sb=await s.json();
  localStorage.setItem("dente_clinic_token",bd.clinicToken);
  localStorage.setItem("dente_staff_token",sb.staffToken);
  localStorage.setItem("dente_theme_mode","dark");
  localStorage.setItem("dente_ui_preferences_v1",JSON.stringify({onboardingDismissed:true}));
},{api:API,owner:OWNER});
await p.goto(`${WEB}/#finance`,{waitUntil:"domcontentloaded"});
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(()=>{
  const out=[];
  for(const el of document.querySelectorAll("*")){
    const cs=getComputedStyle(el);
    if(cs.backgroundColor==="rgb(255, 255, 255)"){
      const r=el.getBoundingClientRect();
      if(r.width<8||r.height<8) continue;
      out.push({tag:el.tagName.toLowerCase(), cls:String(el.className).slice(0,80), size:Math.round(r.width)+"x"+Math.round(r.height)});
    }
  }
  return out.slice(0,15);
}),null,1));
await b.close();
