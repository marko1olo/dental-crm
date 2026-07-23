import{s as k}from"./smartBookingParser-EOM2Y-e0.js";import{t as g,n as h,p as y}from"./smartPatientParser-88WJ-UZD.js";function U(l){const t={toothUpdates:[],emkUpdates:{}};let e=g(l);e=h(e),e=e.replace(/(?:^|[^0-9])([1-4])\s*[.,]\s*([1-8])(?:[^0-9]|$)/g," $1$2 "),e.toLowerCase();const n=e.split(/[.,;!?]/).map(s=>s.trim()).filter(Boolean);for(const s of n){const c=s.toLowerCase();let r=s.replace(/(?:^|[^а-яёa-z])(давление|ад)\s*\d+\s*(?:на|[\/])\s*\d+/ig," ");r=r.replace(/(?:^|[^а-яёa-z])(пульс|температура|т|t)\s*\d+(?:[.,]\d+)?/ig," ");const p=/(?:^|[^0-9])([1-4][1-8]|[5-8][1-5])(?:[^0-9]|$)(?!\s*[:.\-]\s*\d+)(?!\s*(?:часов|часа|ч|утра|дня|вечера|мин|минут|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|руб|рублей|тыс|лет|года|год|числа|число|триместр))/gi,m=[];let u;for(;(u=p.exec(r))!==null;)u[1]&&m.push(u[1]);const f=Array.from(new Set(m));if(f.length>0){let d="planned";/(удален|рвать|удалил|экстракц|отсутствует)/i.test(c)?d="missing":/(кариес|дырк|полост|клиновид|пломб|лечени|реставрац|восстанов|препарир|вылечен|пролечен|сделан)/i.test(c)||/(пульпит|нерв|эндо|канал|периодонтит|кист|гранулем)/i.test(c)?d="treatment":/(коронк|протез|ортопеди|винир|вкладк)/i.test(c)?d="prosthetics":/(имплант|хирурги|синус|остеопласт)/i.test(c)?d="implant":/(наблюд|осмотр)/i.test(c)&&(d="watch"),f.forEach(S=>t.toothUpdates.push({code:S,state:d}))}}const a=l.split(/\s+/).filter(Boolean);let i="";for(const s of a){const r=s.toLowerCase().replace(/[.,;!?:]/g,"");/^(жалоб)/.test(r)?i="complaint":/^(анамнез)/.test(r)?i="anamnesis":/^(объективно|статус)/.test(r)?i="objectiveStatus":/^(диагноз)/.test(r)?i="diagnosis":/^(лечени|план|сделано)/.test(r)?i="treatmentPlan":/^(аллерг|беремен)/.test(r)?i="anamnesis":i||(/(болит|ноет|реакци)/.test(r)?i="complaint":/(кариес|пульпит|периодонтит)/.test(r)?i="diagnosis":/(кт|сним|рентген|налет|полост|перкусс|слизист)/.test(r)&&(i="objectiveStatus")),i&&(t.emkUpdates[i]||(t.emkUpdates[i]=""),t.emkUpdates[i]+=(t.emkUpdates[i]?" ":"")+s)}if(t.emkUpdates.complaint){let s=t.emkUpdates.complaint.replace(/^жалобы\s*(на)?\s*[:\-]*\s*/i,"").trim();s?t.emkUpdates.complaint=s.charAt(0).toUpperCase()+s.slice(1)+(s.endsWith(".")?"":"."):delete t.emkUpdates.complaint}if(t.emkUpdates.anamnesis){let s=t.emkUpdates.anamnesis.replace(/^анамнез\s*[:\-]*\s*/i,"").trim();s?t.emkUpdates.anamnesis=s.charAt(0).toUpperCase()+s.slice(1)+(s.endsWith(".")?"":"."):delete t.emkUpdates.anamnesis}if(t.emkUpdates.objectiveStatus){let s=t.emkUpdates.objectiveStatus.replace(/^(объективно|статус)\s*[:\-]*\s*/i,"").trim();s?t.emkUpdates.objectiveStatus=s.charAt(0).toUpperCase()+s.slice(1)+(s.endsWith(".")?"":"."):delete t.emkUpdates.objectiveStatus}if(t.emkUpdates.diagnosis){let s=t.emkUpdates.diagnosis.replace(/^диагноз\s*[:\-]*\s*/i,"").trim();s?t.emkUpdates.diagnosis=s.charAt(0).toUpperCase()+s.slice(1)+(s.endsWith(".")?"":"."):delete t.emkUpdates.diagnosis}if(t.emkUpdates.treatmentPlan){let s=t.emkUpdates.treatmentPlan.replace(/^(?:план\s*)?лечени[ея]\s*[:\-]*\s*/i,"").trim();s?t.emkUpdates.treatmentPlan=s.charAt(0).toUpperCase()+s.slice(1)+(s.endsWith(".")?"":"."):delete t.emkUpdates.treatmentPlan}return t}const o={System:{Base:`Ты — высококлассный ИИ-ассистент современной стоматологической клиники. 
Твоя задача — помогать врачам, ассистентам и администраторам автоматизировать рутину.
Отвечай профессионально, четко, без лишней воды. Никакой сикофантии. Если данных не хватает — так и скажи.
Никаких галлюцинаций. Используй строго медицинскую терминологию там, где это уместно.`,StrictJSON:"ВАЖНО: Ты должен вернуть СТРОГО валидный JSON. Никакого текста до или после JSON. Никаких маркдаун-оберток (```json). Только сам объект."},Patient:{ExtractDetails:l=>`
Проанализируй следующий неструктурированный текст (диктовку или результаты распознавания OCR паспорта/анкеты).
Текст: "${l}"

Твоя задача — извлечь данные пациента.
Верни JSON в формате:
{
  "fullName": "ФИО в именительном падеже",
  "phone": "Телефон в формате +7 (XXX) XXX-XX-XX, если есть",
  "birthDate": "Дата рождения в формате YYYY-MM-DD, если есть",
  "passport": "Серия и номер паспорта, кем выдан, код подразделения, если есть",
  "notes": "Любые другие важные детали (аллергии, страхи, ДМС, и т.д.)"
}
`},Schedule:{AnalyzeNote:l=>`
Ты медицинский регистратор. Разбери сложную диктовку администратора или врача о записи пациента.
Текст: "${l}"

Извлеки максимум информации для создания записи в расписании.
Обрати особое внимание на относительные даты ("завтра", "послезавтра", "через неделю") и время ("пол-третьего", "в половину пятого").

Верни JSON:
{
  "dateTime": "YYYY-MM-DD HH:mm (если можно точно вычислить) или null",
  "relativeTime": "Относительное время, если точную дату вычислить нельзя",
  "patientName": "ФИО пациента",
  "service": "Услуга или причина обращения (например, Удаление зуба, Консультация)",
  "durationMinutes": "Длительность в минутах (число), если указано",
  "doctorRole": "Требуемый врач или специальность",
  "isCancellation": boolean (true, если это отмена записи),
  "isReschedule": boolean (true, если это перенос записи)
}
`},Medical:{StructureEmk:l=>`
Ты стоматолог-терапевт, хирург или ортопед. На основе сырой диктовки врача сформируй профессиональную медицинскую запись для ЭМК (Электронной Медицинской Карты).
Диктовка: "${l}"

Сформируй данные, используя строгую стоматологическую терминологию. 
Верни JSON:
{
  "complaint": "Жалобы пациента (лаконично)",
  "anamnesis": "Анамнез заболевания (развитие боли, ранее леченные зубы)",
  "objectiveStatus": "Объективный статус (зонд, перкуссия, пальпация, ЭОД, термопроба)",
  "diagnosis": "Диагноз (желательно с кодом по МКБ-10, если понятно из контекста)",
  "treatmentPlan": "План лечения (этапы, анестезия, материалы)",
  "toothCodes": ["Список номеров зубов (например, 46, 38), если упомянуты"]
}
`,ClinicalAudit:l=>`
Ты Главный врач стоматологической клиники. Проведи аудит следующей медицинской записи:
Запись: "${l}"

Проверь:
1. Соответствует ли план лечения поставленному диагнозу?
2. Нет ли противоречий в объективном статусе?
3. Достаточно ли полно описана картина для защиты клиники юридически?

Верни JSON:
{
  "isApproved": boolean (пройдена ли проверка),
  "issues": ["Список найденных проблем или неточностей"],
  "recommendations": ["Как улучшить запись"]
}
`},Imaging:{AnalyzeCTReport:l=>`
Ты стоматолог-рентгенолог. Разбери заключение по КЛКТ или панорамному снимку.
Текст: "${l}"

Верни JSON:
{
  "findings": ["Список ключевых находок (кисты, кариес, ретенция, воспаления)"],
  "teethAffected": ["Номера проблемных зубов"],
  "implantFeasibility": "Оценка возможности имплантации (объем кости, близость канала), если упомянуто",
  "summary": "Краткое резюме для пациента понятным языком"
}
`},Marketing:{PatientFollowUp:(l,t)=>`
Ты заботливый администратор клиники. Напиши короткое и вежливое сообщение (SMS/WhatsApp) пациенту ${l}, который недавно прошел процедуру: ${t}.
Сообщение должно спросить о самочувствии и напомнить, что в случае боли он может связаться с клиникой. Тон доброжелательный, но не навязчивый.
Верни JSON: { "messageText": "текст сообщения" }
`,GenerateReviewReply:(l,t,e,n)=>`
Ты опытный маркетолог стоматологической клиники "${e}". 
Напиши профессиональный ответ на отзыв пациента.
Тональность отзыва: ${t} (positive/neutral/negative)
Текст отзыва: "${l}"

Ключевые слова для SEO (используй 1-2 слова естественно в тексте, если тональность positive или neutral. При негативе - не используй, чтобы не звучать цинично):
${n.join(", ")}

Требования:
- Ответ должен быть вежливым и эмпатичным.
- Если отзыв негативный - извинись, поблагодари за обратную связь и попроси связаться с главным врачом для решения ситуации.
- Верни JSON: { "replyText": "твой ответ" }
`}},P={хирурги:"Хирургия",терапи:"Терапия",ортопеди:"Ортопедия",ортодонт:"Ортодонтия",гигиен:"Гигиена",профилактик:"Профилактика",имплантаци:"Имплантация",рентген:"Диагностика",диагностик:"Диагностика",детств:"Детская стоматология",детск:"Детская стоматология"};function $(l){const t={serviceName:"",price:null,category:null};let e=g(l);e=h(e);const n=[/(\d+[\d\s]*)\s*(?:тысяч|тыс|т\.р\.|т\.р|тр)\b/i,/(\d+[\d\s]*)\s*(?:рублей|руб|р\.|р\b)/i,/цена\s*(\d+[\d\s]*)/i,/стоимость\s*(\d+[\d\s]*)/i,/за\s*(\d+[\d\s]*)/i];for(const i of n){const s=e.match(i);if(s&&s[1]){const c=s[1].replace(/\s+/g,"");let r=parseInt(c,10);(i.source.includes("тысяч|тыс")||r<100&&c.length<3)&&(r=r*1e3),t.price=r,e=e.replace(s[0]," ");break}}for(const[i,s]of Object.entries(P)){const c=new RegExp(`(?:категори[а-я]*\\s*)?${i}[а-я]*`,"i"),r=e.match(c);if(r){t.category=s,e=e.replace(r[0]," ");break}}const a=/(?:^|[^а-яёa-z0-9])(добавь|добавить|создай|услугу|в прайс|прайс|позицию|новую|сделай|напиши|запиши)(?:[^а-яёa-z0-9]|$)/gi;return e=e.replace(a," ").replace(a," "),e=e.replace(/[,;.!?]/g," ").replace(/\s+/g," ").trim(),e.length>0&&(t.serviceName=e.charAt(0).toUpperCase()+e.slice(1)),t}function N(l){const t=l.toLowerCase();let e="";const n=t.match(/(\d+)[\s]*(тыс|тысяч|т\.р\.|тр)/i);if(n&&n[1])e=String(parseInt(n[1],10)*1e3);else{const s=l.replace(/\s+/g,"").match(/\d{2,7}/);s&&(e=s[0])}let a=null;/(карт|терминал|безнал)/i.test(t)?a="card":/(налич|нал)/i.test(t)?a="cash":/(сбп|перевод|банк|qr)/i.test(t)?a="bank_transfer":/(онлайн|ссылк)/i.test(t)&&(a="online");let i=null;return/(вычет|код 1|налог)/i.test(t)?i="1":/(код 2)/i.test(t)&&(i="2"),{amount:e,method:a,taxDeductionCode:i}}class b{static detectIntent(t){const e=t.toLowerCase();if(/(добавь.*в прайс|услугу|цена|стоимость.*руб|прайс)/i.test(e)&&/\d/.test(e))return"manage_prices";const n=/(запиш|прием|расписан|запись|перенес|перезапиш|отмен|удали|убери запись)/i.test(e),a=/(на завтра|на сегодня|в \d{1,2}:\d{2}|с \d{1,2}|в \d{1,2} час|на \d{1,2} час|через неделю|послезавтра)/i.test(e);if(n||a&&/(пациент|к врачу|к хирургу|к терапевту|на)/i.test(e))return"schedule_appointment";const s=/(первичный осмотр|создай карту|жалоб|диагноз|объективно|лечение|боль|пульпит|кариес|периодонтит|зуб|экстирпац|пломб|эндо|канал|вскрыл|рентген)/i.test(e);return/(клкт|рентген|панорам|снимок|кист|к\/т|ретенц|мрт)/i.test(e)&&!/(жалоб|диагноз|объективно|лечение|боль|пульпит|кариес|периодонтит|экстирпац|пломб)/i.test(e)?"imaging_analysis":s?"fill_emk":/(проверь карту|аудит|юридическ|косяк|документ|согласи|ошибк|прошлый месяц)/i.test(e)?"clinical_audit":/(напиши|напомни|отзыв|телеграм|сообщен|смс|whatsapp|позвони)/i.test(e)?"patient_communication":/(паспорт|анкет|выдан|телефон|дата рожден|снилс|инн|фио|полис)/i.test(e)?"parse_patient_document":"unknown"}static processEmkDictation(t){const e=U(t),n=e.toothUpdates.length>0,a=!!(e.emkUpdates.complaint||e.emkUpdates.objectiveStatus||e.emkUpdates.treatmentPlan||e.emkUpdates.diagnosis);return n||a?{source:"local_algorithm",data:e}:{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Medical.StructureEmk(t)}}static processScheduleBooking(t,e){const n=k(t,e);return n.patientId||n.patientName||n.startsAt&&n.reason?{source:"local_algorithm",data:n}:{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Schedule.AnalyzeNote(t)}}static processPatientInfo(t){const e=y(t);return e.fullName||e.phone||e.birthDate?{source:"local_algorithm",data:e}:{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Patient.ExtractDetails(t)}}static processPriceDictation(t){const e=$(t);return e.serviceName&&e.price?{source:"local_algorithm",data:e}:{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:"Extract serviceName, price (number), and category from: "+t}}static processClinicalAudit(t){return{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Medical.ClinicalAudit(t)}}static processImagingAnalysis(t){return{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Imaging.AnalyzeCTReport(t)}}static processPatientCommunication(t,e){return{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Marketing.PatientFollowUp(t,e)}}static processMarketingReview(t,e,n,a){return{source:"llm_required",systemPrompt:`${o.System.Base}
${o.System.StrictJSON}`,suggestedPrompt:o.Marketing.GenerateReviewReply(t,e,n,a)}}static processPaymentDictation(t){return{source:"local_algorithm",data:N(t)}}static parseGlobalNavigation(t){const e=t.toLowerCase().trim().replace(/[.,!?]/g,""),n=e.match(/^(?:найди|открой|ищи|поиск|найди пациента|открой карту|открой карточку)\s+(.+)$/i);if(n&&n[1]){const s=n[1].trim(),c=s.charAt(0).toUpperCase()+s.slice(1);return{view:"patients",query:c,feedbackText:`Ищу пациента ${c}.`}}let a,i="";if(/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:смен|работу|перв)/i.test(e)||e==="смена"?(a="shift",i="Открываю смену."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:запис|расписан|календар|очеред)/i.test(e)||/(записи|расписание|календарь)/i.test(e)?(a="schedule",i="Открываю расписание."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:пациент|карточ)/i.test(e)||e==="пациенты"?(a="patients",i="Открываю список пациентов."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:сним|рентген|визиогр|клкт|кт)/i.test(e)||/(снимки|рентген|клкт|визиограф)/i.test(e)?(a="imaging",i="Открываю снимки."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:прием|приём|текущ)/i.test(e)||e==="прием"||e==="приём"?(a="visit",i="Открываю текущий прием."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:документ|договор|согласи|справк)/i.test(e)||e==="документы"?(a="documents",i="Открываю документы."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:оплат|финанс|касс|долг)/i.test(e)||/(оплаты|финансы|касса)/i.test(e)?(a="finance",i="Открываю финансы."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:связ|сообщен|задач|чат|телеграм)/i.test(e)||e==="связь"||e==="сообщения"?(a="communications",i="Открываю связь."):/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:настройк|профил|клиник)/i.test(e)||e==="настройки"?(a="settings",i="Открываю настройки."):(/(?:перейди|открой|переключи|покажи)\s+(?:в|на)?\s*(?:маркетинг|seo|сео|отзыв)/i.test(e)||e==="маркетинг")&&(a="marketing",i="Открываю маркетинг."),a==="schedule"||!a&&/(?:запис|расписан|календар|прием|приём|завтра|сегодня|вчера|послезавтра)/i.test(e)){const s=new Date,c=s.getTimezoneOffset(),r=u=>new Date(u-c*60*1e3).toISOString().split("T")[0];let p,m="";if(e.includes("сегодня")?(p=r(s.getTime()),m="сегодня"):e.includes("завтра")?(p=r(s.getTime()+1440*60*1e3),m="завтра"):e.includes("вчера")?(p=r(s.getTime()-1440*60*1e3),m="вчера"):e.includes("послезавтра")&&(p=r(s.getTime()+2880*60*1e3),m="послезавтра"),p)return{view:a||"schedule",date:p,feedbackText:a?`Открываю расписание на ${m}.`:`Показываю записи на ${m}.`}}return a?{view:a,feedbackText:i}:{feedbackText:""}}}export{b as A};
