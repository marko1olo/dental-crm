/**
 * InformedConsentTemplateEngine.ts
 *
 * Сервис для генерации информированных добровольных согласий (ИДС)
 * в соответствии с приказом МЗ РФ № 1051н.
 * Поддерживает языки: ru, en, ar, zh.
 */

export type LanguageCode = 'ru' | 'en' | 'ar' | 'zh';

export type ClinicalProcedure = 'implant' | 'orthodontics' | 'endodontics' | 'extraction';

export interface ConsentData {
  patientFullName: string;
  patientDob: string;
  toothNumbers: string[];
  plannedMaterials: string[];
  risks: string[];
}

interface TemplateContent {
  title: string;
  body: string;
  risksHeader: string;
  materialsHeader: string;
}

const templates: Record<ClinicalProcedure, Record<LanguageCode, TemplateContent>> = {
  implant: {
    ru: {
      title: "Информированное добровольное согласие на имплантацию",
      body: "Я, {{patientFullName}}, подтверждаю, что мне разъяснены все риски операции имплантации.",
      risksHeader: "Возможные осложнения:",
      materialsHeader: "Планируемые материалы:"
    },
    en: {
      title: "Informed Consent for Dental Implantation",
      body: "I, {{patientFullName}}, confirm that I have been informed of all risks associated with the implantation procedure.",
      risksHeader: "Possible complications:",
      materialsHeader: "Planned materials:"
    },
    ar: {
      title: "الموافقة المستنيرة على زراعة الأسنان",
      body: "أنا، {{patientFullName}}، أؤكد أنني قد أُبلغت بجميع المخاطر المرتبطة بعملية الزراعة.",
      risksHeader: "المضاعفات المحتملة:",
      materialsHeader: "المواد المخطط استخدامها:"
    },
    zh: {
      title: "牙科种植知情同意书",
      body: "本人 {{patientFullName}} 确认已获知种植手术的所有风险。",
      risksHeader: "可能的并发症：",
      materialsHeader: "计划使用的材料："
    }
  },
  orthodontics: {
    ru: { title: "Согласие на ортодонтию", body: "...", risksHeader: "Риски:", materialsHeader: "Материалы:" },
    en: { title: "Orthodontic Consent", body: "...", risksHeader: "Risks:", materialsHeader: "Materials:" },
    ar: { title: "موافقة تقويم الأسنان", body: "...", risksHeader: "المخاطر:", materialsHeader: "المواد:" },
    zh: { title: "正畸同意书", body: "...", risksHeader: "风险：", materialsHeader: "材料：" }
  },
  endodontics: {
    ru: { title: "Согласие на эндодонтию", body: "...", risksHeader: "Риски:", materialsHeader: "Материалы:" },
    en: { title: "Endodontic Consent", body: "...", risksHeader: "Risks:", materialsHeader: "Materials:" },
    ar: { title: "موافقة علاج العصب", body: "...", risksHeader: "المخاطر:", materialsHeader: "المواد:" },
    zh: { title: "牙髓治疗同意书", body: "...", risksHeader: "风险：", materialsHeader: "材料：" }
  },
  extraction: {
    ru: { title: "Согласие на удаление зуба", body: "...", risksHeader: "Риски:", materialsHeader: "Материалы:" },
    en: { title: "Extraction Consent", body: "...", risksHeader: "Risks:", materialsHeader: "Materials:" },
    ar: { title: "موافقة خلع الأسنان", body: "...", risksHeader: "المخاطر:", materialsHeader: "المواد:" },
    zh: { title: "拔牙同意书", body: "...", risksHeader: "风险：", materialsHeader: "材料：" }
  }
};

export class InformedConsentTemplateEngine {
  static generate(
    procedure: ClinicalProcedure,
    lang: LanguageCode,
    data: ConsentData
  ): string {
    const template = templates[procedure][lang];
    let body = template.body
      .replace('{{patientFullName}}', data.patientFullName);
    
    return `
# ${template.title}

${body}

## ${template.risksHeader}
${data.risks.map(r => `- ${r}`).join('\n')}

## ${template.materialsHeader}
${data.plannedMaterials.map(m => `- ${m}`).join('\n')}
    `.trim();
  }
}
