import { showToast } from "../../../GlobalToast";

export type ClinicalNormSpecialty = "hygiene" | "therapy" | "surgery" | "pediatric" | "general";

export const HYGIENE_PHYSIOLOGICAL_NORM = {
	anamnesis:
		"Жалоб на момент приёма не предъявляет (профилактический осмотр). Соматически здоров. Хронические заболевания, сердечно-сосудистые патологии и аллергологический статус со слов отрицает. Опыт анестезии положительный, без осложнений.",
	statusLocalis:
		"Конфигурация лица не изменена. Регионарные лимфоузлы не увеличены, безболезненны при пальпации. Открывание рта в полном объеме, свободное, без щелчков. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Зубные ряды интактны, прикус физиологический. Пародонт: десна бледно-розовая, плотная, патологических зубодесневых карманов нет.",
	diagnosisIcd10: "Z01.2",
	diagnosisTooth: "",
	treatmentDescription:
		"Проведён плановый осмотр полости рта и онкоскрининг слизистой оболочки. Проведена контролируемая гигиена полости рта, даны индивидуальные рекомендации. Рекомендован плановый осмотр через 6 месяцев.",
	complications: "Осложнений нет.",
	comorbidities: "Соматически здоров, противопоказаний нет.",
};

export const THERAPY_PHYSIOLOGICAL_NORM = {
	anamnesis:
		"Жалоб на момент приёма активно не предъявляет (плановый терапевтический осмотр). Соматически здоров, аллергологический статус не отягощен.",
	statusLocalis:
		"Лицо симметрично, регионарные лимфоузлы интактны. Слизистая полости рта бледно-розовая, чистая. Зубные ряды интактны, краевое прилегание ранее наложенных пломб удовлетворительное, кариозных полостей не обнаружено. Перкуссия и зондирование безболезненны.",
	diagnosisIcd10: "Z01.2",
	diagnosisTooth: "",
	treatmentDescription:
		"Проведён плановый осмотр и ревизия окклюзионных взаимоотношений. Реминерализирующая терапия препаратами кальция и фтора. Рекомендован плановый контрольный осмотр через 6 месяцев.",
	complications: "Осложнений нет.",
	comorbidities: "Соматически здоров, сопутствующих патологий нет.",
};

export const SURGERY_PHYSIOLOGICAL_NORM = {
	anamnesis:
		"Жалоб на боли, отек или кровоточивость не предъявляет (контрольный хирургический осмотр). Общее самочувствие удовлетворительное.",
	statusLocalis:
		"Конфигурация лица не изменена, открывание рта в полном объеме. Послеоперационная область спокойна: слизистая бледно-розовая, швы состоятельны, лунка заживает первичным натяжением под плотным фибриновым сгустком. Экссудация отсутствует.",
	diagnosisIcd10: "Z09.0",
	diagnosisTooth: "",
	treatmentDescription:
		"Контрольный осмотр после хирургического вмешательства. Антисептическая обработка водным раствором хлоргексидина 0.05%. Процесс заживления физиологический, без осложнений. Даны рекомендации по гигиене.",
	complications: "Осложнений нет.",
	comorbidities: "Соматически здоров, противопоказаний нет.",
};

export function applyFullPhysiologicalNorm(
	ensureRevisingIfLocked: () => void,
	setDiary: (updater: (prev: any) => any) => void,
	setIcdSearch: (code: string) => void,
	scheduleDebouncedSave: () => void,
	specialty: ClinicalNormSpecialty = "general",
) {
	ensureRevisingIfLocked();

	let norm = HYGIENE_PHYSIOLOGICAL_NORM;
	let toastMsg = "Применена норма: соматически здоров / осмотр в норме";

	if (specialty === "therapy") {
		norm = THERAPY_PHYSIOLOGICAL_NORM;
		toastMsg = "Применена норма терапии: зубы интактны / осмотр в норме";
	} else if (specialty === "surgery") {
		norm = SURGERY_PHYSIOLOGICAL_NORM;
		toastMsg = "Применена норма хирургии: заживление без осложнений";
	} else if (specialty === "hygiene") {
		norm = HYGIENE_PHYSIOLOGICAL_NORM;
		toastMsg = "Применена норма профгигиены: слизистая и пародонт в норме";
	}

	setDiary((prev: any) => ({
		...prev,
		...norm,
	}));
	setIcdSearch(norm.diagnosisIcd10);
	scheduleDebouncedSave();
	showToast(toastMsg, "success", 4000);
}

export function applyTherapyPhysiologicalNorm(
	ensureRevisingIfLocked: () => void,
	setDiary: (updater: (prev: any) => any) => void,
	setIcdSearch: (code: string) => void,
	scheduleDebouncedSave: () => void,
) {
	applyFullPhysiologicalNorm(ensureRevisingIfLocked, setDiary, setIcdSearch, scheduleDebouncedSave, "therapy");
}

export function applySurgeryPhysiologicalNorm(
	ensureRevisingIfLocked: () => void,
	setDiary: (updater: (prev: any) => any) => void,
	setIcdSearch: (code: string) => void,
	scheduleDebouncedSave: () => void,
) {
	applyFullPhysiologicalNorm(ensureRevisingIfLocked, setDiary, setIcdSearch, scheduleDebouncedSave, "surgery");
}

export function applyHygienePhysiologicalNorm(
	ensureRevisingIfLocked: () => void,
	setDiary: (updater: (prev: any) => any) => void,
	setIcdSearch: (code: string) => void,
	scheduleDebouncedSave: () => void,
) {
	applyFullPhysiologicalNorm(ensureRevisingIfLocked, setDiary, setIcdSearch, scheduleDebouncedSave, "hygiene");
}

