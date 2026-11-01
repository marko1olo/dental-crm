import type { VisitDraftAutosave } from "@dental/shared";
import { eq } from "drizzle-orm";
import { db } from "../../client.js";
import * as schema from "../../schema.js";

/**
 * Тип клинического шаблона протокола приёма для терапевтического,
 * хирургического и ортопедического отделений (Мандат 8e, Мандат 8x).
 */
export interface ClinicalProtocolTemplate {
	id: string;
	organizationId?: string;
	specialty: "therapist" | "surgeon" | "orthopedist" | "orthodontist" | "pediatric" | "hygienist";
	title: string;
	visitReason: string;
	complaintPrompt: string;
	objectiveTemplate: string;
	treatmentPlanTemplate: string;
	diagnosisHints: string[];
	safetyWarnings: string[];
}

/**
 * Канонические клинические пресеты DENTE CRM по ключевым специальностям.
 * Чистый семантический язык без сырых советских номеров приказов (Мандат 8x, Мандат 8ap).
 */
export const CORE_CLINICAL_PROTOCOL_TEMPLATES: ClinicalProtocolTemplate[] = [
	{
		id: "tpl_therapy_caries",
		specialty: "therapist",
		title: "Терапия: Лечение среднего/глубокого кариеса",
		visitReason: "Кариозное поражение твёрдых тканей зуба",
		complaintPrompt: "Жалобы на кратковременные боли от сладкого, холодного или попадания пищи в межзубный промежуток.",
		objectiveTemplate: "Зуб: глубокая кариозная полость в пределах дентина. Зондирование болезненно по эмалево-дентинной границе. Перкуссия безболезненна. ЭОД 2-6 мкА. Десна интактна.",
		treatmentPlanTemplate: "Препарирование кариозной полости, медикаментозная обработка 2% хлоргексидином, протравливание эмали 37% ортофосфорной кислотой, адгезивный протокол 5/7 поколения, послойная реставрация светоотверждаемым наногибридным композитом, шлифовка и полировка.",
		diagnosisHints: ["K02.1", "K02.0"],
		safetyWarnings: ["Контроль толщины дна кариозной полости перед внесением композита"],
	},
	{
		id: "tpl_therapy_pulpitis",
		specialty: "therapist",
		title: "Терапия: Эндодонтическое лечение пульпита",
		visitReason: "Острая пульсирующая или ночная зубная боль",
		complaintPrompt: "Жалобы на самопроизвольные приступообразные боли, усиливающиеся в ночное время и от температурных раздражителей с иррадиацией по ветвям тройничного нерва.",
		objectiveTemplate: "Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки резко болезненно, кровоточивость из устьев. Перкуссия слабочувствительна. ЭОД 25-40 мкА.",
		treatmentPlanTemplate: "Анестезия, изоляция коффердамом, механическая и медикаментозная обработка корневых каналов машинным файлами с обильной ирригацией 3% NaOCl и 17% ЭДТА, апекслокация, трёхмерная обтурация гуттаперчей с силером, временная/постоянная герметичная реставрация.",
		diagnosisHints: ["K04.0", "K04.01"],
		safetyWarnings: ["Апекслокация и рентген-контроль рабочей длины каналов строго обязательны"],
	},
	{
		id: "tpl_surgery_extraction",
		specialty: "surgeon",
		title: "Хирургия: Простое/сложное удаление зуба",
		visitReason: "Показания к удалению зуба по терапевтическим или ортодонтическим причинам",
		complaintPrompt: "Жалобы на разрушение коронковой части зуба, подвижность или периодические обострения воспалительного процесса.",
		objectiveTemplate: "Коронка зуба разрушена ниже уровня десны или патологическая подвижность II-III степени. Слизистая оболочка в области лунки умеренно гиперемирована.",
		treatmentPlanTemplate: "Инфильтрационная/проводниковая анестезия, синдесмотомия периодонтальной связки, элевация и люксация зуба щипцами/элеватором, тщательный кюретаж лунки, гемостаз гемостатической губкой, сближение краёв лунки узловыми швами.",
		diagnosisHints: ["K04.5", "K08.1"],
		safetyWarnings: ["Контроль гемостаза лунки и целостности альвеолярного отростка"],
	},
	{
		id: "tpl_ortho_crown",
		specialty: "orthopedist",
		title: "Ортопедия: Препарирование и протезирование коронкой",
		visitReason: "Восстановление анатомической формы и функции разрушенного зуба",
		complaintPrompt: "Жалобы на обширное разрушение коронки зуба, сколы стенок или эстетический дефект.",
		objectiveTemplate: "Дефект твердых тканей коронки зуба > 50%. Эндодонтическое лечение каналов ранее проведено удовлетворительно, верхушечный периодонт без патологических изменений.",
		treatmentPlanTemplate: "Восстановление культи зуба культевой штифтовой вкладкой/композитом со стекловолоконным штифтом, препарирование под металлокерамическую/диоксид-циркониевую коронку с круговым уступом 0.5-0.8 мм, ретракция десны, прецизионный оттиск силиконом А-силикон/3D интраоральное сканирование, фиксация провизорной коронки.",
		diagnosisHints: ["K08.1", "K03.8"],
		safetyWarnings: ["Водяное охлаждение наконечника не менее 50 мл/мин во избежание ожога культи"],
	},
	{
		id: "tpl_hygiene_complex",
		specialty: "hygienist",
		title: "Гигиена: Комплексная профессиональная гигиена полости рта",
		visitReason: "Профилактический осмотр, наличие зубных отложений и пигментированного налёта",
		complaintPrompt: "Жалобы на кровоточивость дёсен при чистке зубов, шероховатость эмали, налёт от кофе/курения.",
		objectiveTemplate: "Обильный над- и поддесневой зубной камень во фронтальном и боковых отделах. Гиперемия и отёчность десневого края. Индекс гигиены OHI-S умеренно повышен.",
		treatmentPlanTemplate: "Ультразвуковой скейлинг над- и поддесневых зубных отложений, воздушно-абразивная обработка Air-Flow мелкодисперсным порошком на основе глицина, полирование всех поверхностей зубов абразивной пастой, нанесение фторсодержащего реминерализирующего лака, обучение индивидуальной гигиене.",
		diagnosisHints: ["Z01.2", "K05.0"],
		safetyWarnings: ["Защита слизистой оболочки ретрактором и эвакуация аэрозоля пылесосом"],
	},
];

/**
 * Получение шаблонов протоколов для клиники из базы с fallback на дефолтные пресеты.
 */
export async function getClinicalProtocolTemplatesFromDb(
	organizationId: string,
	specialty?: string,
): Promise<ClinicalProtocolTemplate[]> {
	try {
		const query = db
			.select()
			.from(schema.protocolTemplates)
			.where(eq(schema.protocolTemplates.organizationId, organizationId));

		const dbTemplates = await query;
		if (dbTemplates.length > 0) {
			const mapped: ClinicalProtocolTemplate[] = dbTemplates.map((t) => ({
				id: t.id,
				organizationId: t.organizationId,
				specialty: t.specialty as ClinicalProtocolTemplate["specialty"],
				title: t.title,
				visitReason: t.visitReason,
				complaintPrompt: t.complaintPrompt,
				objectiveTemplate: t.objectiveTemplate,
				treatmentPlanTemplate: t.treatmentPlanTemplate,
				diagnosisHints: Array.isArray(t.diagnosisHints)
					? (t.diagnosisHints as string[])
					: [],
				safetyWarnings: Array.isArray(t.safetyWarnings)
					? (t.safetyWarnings as string[])
					: [],
			}));

			return specialty
				? mapped.filter((t) => t.specialty === specialty)
				: mapped;
		}
	} catch (error) {
		console.warn(
			"[visitProtocolTemplates] Ошибка чтения protocolTemplates из базы, отдаём встроенные пресеты:",
			error,
		);
	}

	return specialty
		? CORE_CLINICAL_PROTOCOL_TEMPLATES.filter((t) => t.specialty === specialty)
		: CORE_CLINICAL_PROTOCOL_TEMPLATES;
}

/**
 * 1-клик соматическая норма для врача у кресла (Мандат 8e):
 * «✓ Соматически здоров / Интактные зубы».
 * Заполняет физиологическую норму без блокировки сохранения и рутинного перебора.
 */
export function applyHealthyDentitionSoapPreset(
	draft: VisitDraftAutosave,
): VisitDraftAutosave {
	return {
		...draft,
		draft: {
			...draft.draft,
			complaint: draft.draft.complaint || "Жалоб на момент осмотра не предъявляет.",
			anamnesis:
				draft.draft.anamnesis ||
				"Соматически здоров. Аллергологический и инфекционный анамнез спокойный. Ранее санирован.",
			objectiveStatus:
				draft.draft.objectiveStatus ||
				"Конфигурация лица не изменена. Регионарные лимфоузлы не пальпируются. Слизистая оболочка рта бледно-розовая, умеренно увлажнена. Прикус ортогнатический. Зубы интактны.",
			diagnosis: draft.draft.diagnosis || "Z01.2",
			treatmentPlan:
				draft.draft.treatmentPlan ||
				"Проведён плановый профилактический осмотр полости рта, онкоскрининг, индексация гигиены. Рекомендован повторный профилактический осмотр через 6 месяцев.",
		},
	};
}

/**
 * Применение клинического шаблона к черновику визита с мягким объединением текста (Мандат 8e).
 */
export function applyClinicalTemplateToDraft(
	draft: VisitDraftAutosave,
	template: ClinicalProtocolTemplate,
): VisitDraftAutosave {
	const current = draft.draft;
	const appendField = (existing: string | null | undefined, incoming: string) => {
		if (!existing?.trim()) return incoming;
		if (existing.includes(incoming)) return existing;
		return `${existing}\n\n${incoming}`;
	};

	return {
		...draft,
		draft: {
			...current,
			complaint: appendField(current.complaint, template.complaintPrompt),
			objectiveStatus: appendField(
				current.objectiveStatus,
				template.objectiveTemplate,
			),
			treatmentPlan: appendField(
				current.treatmentPlan,
				template.treatmentPlanTemplate,
			),
			diagnosis: current.diagnosis || template.diagnosisHints[0] || "",
			warnings: Array.from(
				new Set([...(current.warnings || []), ...template.safetyWarnings]),
			),
		},
	};
}
