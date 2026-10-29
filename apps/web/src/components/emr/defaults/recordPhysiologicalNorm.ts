import type { MedicalCardForm043uData } from "../emr043Types";
import { DEFAULT_32_PERMANENT_TEETH } from "./recordDefaultTeeth";

/** Заполнение незаполненных полей анамнеза, осмотра и интактных зубов физиологической нормой в 1 клик (Мандат 8e) */
export function applyForm043PhysiologicalNorm(prev: MedicalCardForm043uData): MedicalCardForm043uData {
	return {
		...prev,
		anamnesis: {
			...prev.anamnesis,
			chiefComplaint: prev.anamnesis?.chiefComplaint?.trim()
				? prev.anamnesis.chiefComplaint
				: "Плановый профилактический осмотр, санация полости рта.",
			historyOfPresentIllness: prev.anamnesis?.historyOfPresentIllness?.trim()
				? prev.anamnesis.historyOfPresentIllness
				: "Обратился для планового профилактического осмотра и оценки гигиенического состояния полости рта.",
			medicalHistoryVitae: prev.anamnesis?.medicalHistoryVitae?.trim()
				? prev.anamnesis.medicalHistoryVitae
				: "Рос и развивался соответственно возрасту. Туберкулез, гепатиты, ВИЧ, сифилис отрицает. Наследственный анамнез не отягощен.",
			allergologicalHistory: prev.anamnesis?.allergologicalHistory?.trim()
				? prev.anamnesis.allergologicalHistory
				: "Аллергологический анамнез не отягощен. Непереносимости местных анестетиков артикаинового ряда и лекарственных средств не отмечает.",
			concomitantSomaticDiseases: prev.anamnesis?.concomitantSomaticDiseases?.trim()
				? prev.anamnesis.concomitantSomaticDiseases
				: "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.",
			currentSystemicMedications: prev.anamnesis?.currentSystemicMedications?.trim()
				? prev.anamnesis.currentSystemicMedications
				: "Постоянный прием лекарственных препаратов отрицает.",
			pastDentalInterventions: prev.anamnesis?.pastDentalInterventions?.trim()
				? prev.anamnesis.pastDentalInterventions
				: "Ранее проводившиеся стоматологические вмешательства и местную анестезию переносил удовлетворительно.",
			occupationalHazardsAndHabits: prev.anamnesis?.occupationalHazardsAndHabits?.trim()
				? prev.anamnesis.occupationalHazardsAndHabits
				: "Вредных производственных факторов и вредных привычек не отмечает.",
		},
		dentalStatus: {
			...prev.dentalStatus,
			odontogramTeeth: prev.dentalStatus?.odontogramTeeth?.length
				? prev.dentalStatus.odontogramTeeth
				: DEFAULT_32_PERMANENT_TEETH,
			biteType: prev.dentalStatus?.biteType || "orthognathic",
			biteDescription:
				prev.dentalStatus?.biteDescription ||
				"Прикус ортогнатический, смыкание моляров и клыков по I классу Энгля, резцовое перекрытие в пределах 1/3 высоты коронки.",
			oralMucosaStatus: {
				color: prev.dentalStatus?.oralMucosaStatus?.color || "pale_pink_normal",
				moisture: prev.dentalStatus?.oralMucosaStatus?.moisture || "normal",
				pathologicalElements: prev.dentalStatus?.oralMucosaStatus?.pathologicalElements ?? null,
				gingivalPapillae: prev.dentalStatus?.oralMucosaStatus?.gingivalPapillae || "normal_pointed",
				bleedingPBI: prev.dentalStatus?.oralMucosaStatus?.bleedingPBI || "grade_0",
				tongueStatus:
					prev.dentalStatus?.oralMucosaStatus?.tongueStatus ||
					"Язык чистый, влажный, сосочковый слой выражен умеренно, налета нет.",
				regionalLymphNodes:
					prev.dentalStatus?.oralMucosaStatus?.regionalLymphNodes ||
					"Подчелюстные, шейные, подбородочные лимфатические узлы не пальпируются, безболезненные.",
				tmjFunction:
					prev.dentalStatus?.oralMucosaStatus?.tmjFunction ||
					"Открывание рта свободное, в полном объеме, движений девиации и крепитации/щелчков в суставах нет.",
			},
		},
	};
}
