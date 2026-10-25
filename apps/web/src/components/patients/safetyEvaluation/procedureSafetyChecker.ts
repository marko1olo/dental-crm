import type { ClinicalSafetySeverity, PatientClinicalSafetyProfile } from "../safetyMath";

export function checkProcedureSafety(
	procedureName: string,
	profile?: Partial<PatientClinicalSafetyProfile> | null | undefined,
): {
	readonly isAllowed: boolean;
	readonly severity: ClinicalSafetySeverity;
	readonly warnings: readonly string[];
	readonly alternatives: readonly string[];
} {
	if (!profile) return { isAllowed: true, severity: "none", warnings: [], alternatives: [] };

	const pLower = procedureName.toLowerCase();
	const warnings: string[] = [];
	const alternatives: string[] = [];
	let isAllowed = true;
	let severity: ClinicalSafetySeverity = "none";

	const check = (cond: boolean, warn: string, alt: string, notAllowed = true) => {
		if (cond) {
			if (notAllowed) isAllowed = false;
			severity = "critical";
			warnings.push(warn);
			alternatives.push(alt);
		}
	};

	check(
		Boolean(profile.hasPacemakerExs && (pLower.includes("ультразвук") || pLower.includes("уз-") || pLower.includes("скейлинг") || pLower.includes("air-flow") || pLower.includes("чистк"))),
		"Ультразвуковой скейлинг абсолютно запрещен при наличии электрокардиостимулятора (ЭКС) из-за риска срыва ритма!",
		"Провести профессиональную гигиену ручными кюретами Грейси (Gracey) и полировочными пастами.",
	);
	check(
		Boolean(profile.hasPacemakerExs && (pLower.includes("электрокоагуляц") || pLower.includes("коагуляц") || pLower.includes("электронож"))),
		"Монополярная электрокоагуляция категорически запрещена пациентам с кардиостимулятором!",
		"Использовать лазерный скальпель или механический гемостаз швами и компрессией.",
	);
	check(
		Boolean(profile.takesBisphosphonates && (pLower.includes("удален") || pLower.includes("экстракц") || pLower.includes("имплант") || pLower.includes("синус-лифтинг"))),
		"Инвазивная хирургия и дентальная имплантация несут экстремальный риск остеонекроза челюсти (MRONJ/БОНЧ)!",
		"Органосохраняющая эндодонтия без резекции верхушки. При неизбежном удалении — онкоконсилиум и курс антибиотиков.",
	);
	check(
		Boolean(profile.takesAnticoagulants && (pLower.includes("удален") || pLower.includes("имплант") || pLower.includes("кюретаж") || pLower.includes("синус-лифтинг"))),
		"Прием антикоагулянтов: высокий риск профузного кровотечения. Требуется свежий анализ МНО (INR < 2.5) и местный гемостаз!",
		"Использовать гемостатическую губку с тромбином, транексамовую кислоту 5% и герметичное ушивание раны.",
		false,
	);
	check(
		Boolean(profile.pregnancyTrimester === "trimester_1" && (pLower.includes("кт") || pLower.includes("клкт") || pLower.includes("панорам") || pLower.includes("оптг"))),
		"Компьютерная томография (КТ/ОПТГ) в 1-м триместре беременности несет тератогенный риск и запрещена!",
		"Отложить до 2-го триместра либо при острой боли выполнить прицельный снимок на визиографе с двойным свинцовым фартуком.",
	);
	check(
		Boolean(profile.hasEsterAnestheticsAllergy && (pLower.includes("бензокаин") || pLower.includes("анестезин") || pLower.includes("новокаин") || pLower.includes("дикаин") || pLower.includes("hurricaine") || pLower.includes("dispodent") || (pLower.includes("аппликацион") && (pLower.includes("гель") || pLower.includes("спрей"))))),
		"Аппликационные гели на основе бензокаина (Hurricaine, Dispodent) и новокаин категорически запрещены при аллергии на эфирные анестетики!",
		"Использовать аппликационный Лидокаин-гель 2–5% (при отсутствии аллергии на лидокаин) либо контактное охлаждение.",
	);
	check(
		Boolean(profile.hasIodineAllergy && (pLower.includes("йод") || pLower.includes("бетадин") || pLower.includes("метапекс") || pLower.includes("альвожил") || pLower.includes("йодинол") || pLower.includes("йодоформ"))),
		"Препараты йода (Повидон-йод / Бетадин), йодоформные пасты (Metapex) и турунды (Альвожил) абсолютно противопоказаны при аллергии на йод!",
		"Использовать Хлоргексидин 0.05–0.2%, Мирамистин 0.01%, чистый гидроксид кальция (UltraCal XS) без йодоформа.",
	);
	check(
		Boolean(profile.hasPheochromocytoma && (pLower.includes("адреналин") || pLower.includes("эпинефрин") || pLower.includes("1:100") || pLower.includes("1:200") || pLower.includes("ультракаин д-с") || pLower.includes("ретракцион"))),
		"Анестетики и ретракционные нити с адреналином/эпинефрином абсолютно противопоказаны при феохромоцитоме (угроза смертельного криза)!",
		"Использовать Скандонест 3% (Мепивакаин без вазоконстриктора) и безадреналиновые ретракционные нити.",
	);
	check(
		Boolean((profile.hasSevereHypertensionStage3 || profile.hasThyrotoxicosis || profile.takesBetaBlockers) && (pLower.includes("адреналин") || pLower.includes("эпинефрин") || pLower.includes("1:100") || pLower.includes("1:200") || pLower.includes("ультракаин д-с") || pLower.includes("ультракаин форте") || pLower.includes("убистезин") || pLower.includes("септанест") || (pLower.includes("ретракцион") && pLower.includes("нить")))),
		"Препараты и ретракционные нити с адреналином абсолютно противопоказаны при кризовом АД, тиреотоксикозе или терапии бета-блокаторами!",
		"Препарат выбора: Скандонест 3% (Мепивакаин без вазоконстриктора). Безадреналиновые ретракционные нити.",
	);
	check(
		Boolean(profile.hasArticaineAllergy && (pLower.includes("артикаин") || pLower.includes("ультракаин") || pLower.includes("убистезин") || pLower.includes("септанест"))),
		"Артикаин (Ультракаин, Убистезин, Септанест) категорически противопоказан из-за подтвержденной аллергии!",
		"Препарат выбора: Скандонест 3% (Мепивакаин) под контролем аллерголога.",
	);
	check(
		Boolean(profile.hasMepivacaineAllergy && (pLower.includes("мепивакаин") || pLower.includes("скандонест") || pLower.includes("мепивастезин"))),
		"Мепивакаин (Скандонест) категорически противопоказан из-за подтвержденной аллергии!",
		"Использовать Артикаин (Ультракаин) при отсутствии аллергии на артикаин и сульфиты.",
	);
	check(
		Boolean((profile.hasSulfiteAllergy || profile.hasSulfitesAllergy) && (pLower.includes("ультракаин") || pLower.includes("убистезин") || pLower.includes("септанест") || pLower.includes("адреналин") || pLower.includes("эпинефрин"))),
		"Анестетики с адреналином содержат сульфиты (метабисульфит) в качестве антиоксиданта и противопоказаны при аллергии на сульфиты!",
		"Препарат выбора: Скандонест 3% (Мепивакаин без сульфитов).",
	);

	return { isAllowed, severity, warnings, alternatives };
}
