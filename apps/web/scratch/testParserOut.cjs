"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVisitDictationLocal = parseVisitDictationLocal;
function parseVisitDictationLocal(input) {
    var result = { toothUpdates: [], emkUpdates: {} };
    var lower = input.toLowerCase();
    // Extract teeth (2-digit numbers starting with 1-4)
    var teethMatches = input.match(/\b([1-4][1-8])\b/g);
    var teeth = teethMatches ? Array.from(new Set(teethMatches)) : [];
    // Keywords and patterns
    var isCaries = lower.includes("кариес");
    var isPulpitis = lower.includes("пульпит");
    var isExtraction = lower.includes("удален") || lower.includes("рвать") || lower.includes("удалил");
    var isHygiene = lower.includes("гигиен") || lower.includes("чистк");
    var isConsultation = lower.includes("консультац");
    if (teeth.length > 0) {
        var state_1 = "planned";
        if (isExtraction || isCaries || isPulpitis)
            state_1 = "treatment";
        if (lower.includes("канал") || lower.includes("эндо"))
            state_1 = "treatment";
        if (lower.includes("наблюд"))
            state_1 = "watch";
        if (lower.includes("готов") || lower.includes("заверш") || lower.includes("вылечил") || lower.includes("поставил"))
            state_1 = "done";
        if (isExtraction && lower.includes("удалил"))
            state_1 = "missing";
        teeth.forEach(function (t) { return result.toothUpdates.push({ code: t, state: state_1 }); });
    }
    // Pre-fill based on inferred conditions
    if (isCaries) {
        result.emkUpdates.diagnosis = "К02.1 Кариес дентина";
        result.emkUpdates.objectiveStatus = "Глубокая кариозная полость в пределах плащевого/околопульпарного дентина, зондирование болезненно по эмалево-дентинной границе.";
        if (lower.includes("пломб") || lower.includes("реставр")) {
            result.emkUpdates.treatmentPlan = "Анестезия, препарирование, медикаментозная обработка, адгезивный протокол, реставрация композитным материалом, полировка.";
        }
    }
    else if (isPulpitis) {
        result.emkUpdates.diagnosis = "К04.0 Острый пульпит (или обострение хронического)";
        result.emkUpdates.complaint = "На самопроизвольные, ночные боли, боли от температурных раздражителей.";
        result.emkUpdates.objectiveStatus = "Глубокая кариозная полость, сообщающаяся с полостью зуба, зондирование резко болезненно.";
        result.emkUpdates.treatmentPlan = "Анестезия, изоляция, экстирпация пульпы, механическая и медикаментозная обработка корневых каналов, временная/постоянная обтурация.";
    }
    else if (isExtraction) {
        result.emkUpdates.diagnosis = "К04.5 Хронический апикальный периодонтит (показание к удалению)";
        result.emkUpdates.treatmentPlan = "Анестезия, удаление зуба, кюретаж лунки, гемостаз, рекомендации.";
    }
    else if (isHygiene) {
        result.emkUpdates.diagnosis = "К05.1 Хронический гингивит";
        result.emkUpdates.objectiveStatus = "Над- и поддесневые зубные отложения, налет курильщика, кровоточивость при зондировании.";
        result.emkUpdates.treatmentPlan = "Ультразвуковой скейлинг, Air Flow, полировка пастами, фторирование, обучение индивидуальной гигиене.";
    }
    // Enhance with explicit phrases
    if (lower.includes("анестез")) {
        result.emkUpdates.treatmentPlan = (result.emkUpdates.treatmentPlan ? result.emkUpdates.treatmentPlan + " " : "") + "Инфильтрационная/проводниковая анестезия.";
    }
    if (lower.includes("коффердам")) {
        result.emkUpdates.treatmentPlan = (result.emkUpdates.treatmentPlan ? result.emkUpdates.treatmentPlan + " " : "") + "Изоляция рабочего поля (коффердам).";
    }
    return result;
}
