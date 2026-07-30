import { chromium } from "playwright";
const WEB="http://127.0.0.1:5173", API="http://127.0.0.1:4100", OWNER="e44d32ca-7777-4c00-a001-c88f01b92e21";
const TARGETS=[".work-grid.page-grid",".work-grid.page-grid > div",".work-grid.page-grid > div > div.p-4"];
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
  localStorage.setItem("dente_ui_preferences_v1",JSON.stringify({onboardingDismissed:true}));
},{api:API,owner:OWNER});
await p.goto(`${WEB}/#visit`,{waitUntil:"domcontentloaded"});
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate((targets)=>{
  const props=["width","min-width","max-width","padding-left","padding-right","margin-left","margin-right","gap","grid-template-columns","display","box-sizing","flex-wrap"];
  return targets.map(t=>{
    const el=document.querySelector(t);
    if(!el) return {t, нет:true};
    const cs=getComputedStyle(el), r=el.getBoundingClientRect();
    const out={t, rect:Math.round(r.width)+"x"+Math.round(r.height)+" @"+Math.round(r.left), parentW:Math.round(el.parentElement.getBoundingClientRect().width)};
    for(const pr of props) out[pr]=cs.getPropertyValue(pr);
    const hits=[];
    for(const sheet of document.styleSheets){let rules;try{rules=sheet.cssRules}catch{continue}
      const walk=(list,media)=>{for(const rule of list){
        // Проверять selectorText НАДО ПЕРВЫМ: у CSSStyleRule в современных
        // браузерах тоже есть cssRules (вложенный CSS), и наивная проверка
        // на cssRules принимала каждое обычное правило за группу и
        // пропускала его. Из-за этого прошлые пробы возвращали пустой
        // список правил и я делал выводы на недостоверных данных.
        if(!rule.selectorText){ if(rule.cssRules) walk(rule.cssRules, rule.conditionText||media); continue }
        let m=false; try{m=el.matches(rule.selectorText)}catch{continue}
        if(!m)continue;
        for(const pr of ["display","width","min-width","margin","margin-left","grid-template-columns","flex-wrap"]){
          const v=rule.style.getPropertyValue(pr);
          if(v)hits.push(`${pr}: ${v}${rule.style.getPropertyPriority(pr)==="important"?" !important":""} <- ${rule.selectorText.slice(0,60)}${media?" @"+media:""}`);
        }}};
      walk(rules);}
    out.rules=hits;
    return out;
  });
}, TARGETS),null,1));
await b.close();
