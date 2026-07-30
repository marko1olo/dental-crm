import { chromium } from "playwright";
const WEB="http://127.0.0.1:5173", API="http://127.0.0.1:4100", OWNER="e44d32ca-7777-4c00-a001-c88f01b92e21";
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
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
await p.goto(`${WEB}/#schedule`,{waitUntil:"domcontentloaded"});
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(()=>{
  const el=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Создать запись"));
  if(!el) return "кнопка не найдена";
  const cs=getComputedStyle(el);
  const hits=[];
  for(const sheet of document.styleSheets){let rules;try{rules=sheet.cssRules}catch{continue}
    const walk=(list)=>{for(const r of list){if(r.cssRules){walk(r.cssRules);continue}
      if(!r.selectorText)continue; let m=false; try{m=el.matches(r.selectorText)}catch{continue}
      if(!m)continue; const v=r.style.getPropertyValue("color");
      if(v)hits.push(`${v}${r.style.getPropertyPriority("color")==="important"?" !important":""}  <- ${r.selectorText.slice(0,70)}`);}};
    walk(rules);}
  return {onTeal:cs.getPropertyValue("--on-teal"), teal:cs.getPropertyValue("--teal"), parentColor:getComputedStyle(el.parentElement).color, disabled:el.disabled, color:cs.color, bgImage:cs.backgroundImage.slice(0,70), inline:el.getAttribute("style"), classes:el.className, colorRules:hits};
}),null,1));
await b.close();
