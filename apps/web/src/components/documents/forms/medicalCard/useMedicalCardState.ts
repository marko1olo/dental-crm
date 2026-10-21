import { useState, useMemo, useCallback } from "react";
import {
	calculateDmftFromOdontogram,
	type FullForm043uPayload,
	type ToothClinicalStatusCode,
	type ToothSurface,
	type FdiToothRecord,
	type CpitnIndex,
	type DentalBiteType,
	type OralMucosaStatus,
} from "@dental/shared";
import {
	createForm043PhysiologicalNorm,
	createIntactOdontogramRecords,
} from "../../../../lib/clinicalProtocols";
import { showToast } from "../../../GlobalToast";
import { DEFAULT_CPITN, DEFAULT_ORAL_MUCOSA } from "../form043Utils";
import type { MedicalCardSnapshot } from "./useMedicalCardRevision";

export function useMedicalCardState(initialPayload?: Partial<FullForm043uPayload>) {
	const [activeTab, setActiveTab] = useState<"formula" | "indices" | "anamnesis">("formula");
	const [selectedTooth, setSelectedTooth] = useState<number>(16);
	const [activeStatus, setActiveStatus] = useState<ToothClinicalStatusCode>("caries_media");

	const [odontogram, setOdontogram] = useState<Record<number, FdiToothRecord>>(() => {
		const raw = initialPayload?.odontogramTeeth ?? [];
		const map: Record<number, FdiToothRecord> = {};
		for (const t of raw) map[t.toothNumber] = t;
		return map;
	});

	const dmftResult = useMemo(() => calculateDmftFromOdontogram(Object.values(odontogram)), [odontogram]);
	const [cpitn, setCpitn] = useState<CpitnIndex>(() => initialPayload?.cpitnIndex ?? DEFAULT_CPITN);
	const [hygieneIndexOhiS, setHygieneIndexOhiS] = useState<string>(() => initialPayload?.hygieneIndexOhiS ?? "OHI-S = 0.8 (Хорошая)");

	const [chiefComplaint, setChiefComplaint] = useState<string>(() => initialPayload?.chiefComplaint ?? "Жалобы на боли при приеме пищи, наличие кариозной полости");
	const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState<string>(() => initialPayload?.historyOfPresentIllness ?? "Считает себя больным в течение нескольких дней, когда впервые появились неприятные ощущения.");
	const [allergologicalHistory, setAllergologicalHistory] = useState<string>(() => initialPayload?.allergologicalHistory ?? "Аллергологический анамнез не отягощен. Аллергии на анестетики и медикаменты отрицает.");
	const [concomitantDiseases, setConcomitantDiseases] = useState<string>(() => initialPayload?.concomitantDiseases ?? "Сопутствующие соматические заболевания отрицает. ВИЧ, вирусные гепатиты, туберкулез отрицает.");
	const [currentMedications, setCurrentMedications] = useState<string>(() => initialPayload?.currentMedications ?? "Постоянный прием лекарственных препаратов отрицает.");
	const [pregnancyLactationStatus, setPregnancyLactationStatus] = useState<string>(() => initialPayload?.pregnancyLactationStatus ?? "Нет");
	const [pastDentalInterventions, setPastDentalInterventions] = useState<string>(() => initialPayload?.pastDentalInterventions ?? "Ранее проводилось терапевтическое лечение кариеса и профессиональная гигиена.");

	const [biteType, setBiteType] = useState<DentalBiteType>(() => initialPayload?.biteType ?? "orthognathic");
	const [biteDescription, setBiteDescription] = useState<string>(() => initialPayload?.biteDescription ?? "Прикус ортогнатический, смыкание зубных рядов по I классу Энгля.");
	const [oralMucosa, setOralMucosa] = useState<OralMucosaStatus>(() => initialPayload?.oralMucosaStatus ?? DEFAULT_ORAL_MUCOSA);
	const [xrayFindingsDescription, setXrayFindingsDescription] = useState<string>(() => initialPayload?.xrayFindingsDescription ?? "Рентгенологических изменений в периапикальных тканях не выявлено.");
	const [generalTreatmentPlan, setGeneralTreatmentPlan] = useState<string>(() => initialPayload?.generalTreatmentPlan ?? "1. Профессиональная гигиена полости рта;\n2. Санация кариозных полостей;\n3. Контрольный осмотр через 6 месяцев.");

	const createSnapshot = useCallback((): MedicalCardSnapshot => ({
		odontogram: { ...odontogram },
		cpitn: { ...cpitn },
		hygieneIndexOhiS,
		chiefComplaint,
		historyOfPresentIllness,
		allergologicalHistory,
		concomitantDiseases,
		currentMedications,
		pregnancyLactationStatus,
		pastDentalInterventions,
		biteType,
		biteDescription,
		oralMucosa: { ...oralMucosa },
		xrayFindingsDescription,
		generalTreatmentPlan,
	}), [odontogram, cpitn, hygieneIndexOhiS, chiefComplaint, historyOfPresentIllness, allergologicalHistory, concomitantDiseases, currentMedications, pregnancyLactationStatus, pastDentalInterventions, biteType, biteDescription, oralMucosa, xrayFindingsDescription, generalTreatmentPlan]);

	const restoreSnapshot = useCallback((s: MedicalCardSnapshot) => {
		setOdontogram(s.odontogram);
		setCpitn(s.cpitn);
		setHygieneIndexOhiS(s.hygieneIndexOhiS);
		setChiefComplaint(s.chiefComplaint);
		setHistoryOfPresentIllness(s.historyOfPresentIllness);
		setAllergologicalHistory(s.allergologicalHistory);
		setConcomitantDiseases(s.concomitantDiseases);
		setCurrentMedications(s.currentMedications);
		setPregnancyLactationStatus(s.pregnancyLactationStatus);
		setPastDentalInterventions(s.pastDentalInterventions);
		setBiteType(s.biteType);
		setBiteDescription(s.biteDescription);
		setOralMucosa(s.oralMucosa);
		setXrayFindingsDescription(s.xrayFindingsDescription);
		setGeneralTreatmentPlan(s.generalTreatmentPlan);
	}, []);

	const handleApplyAnamnesisNorm = useCallback(() => {
		const norm = createForm043PhysiologicalNorm();
		setChiefComplaint(norm.chiefComplaint);
		setHistoryOfPresentIllness(norm.historyOfPresentIllness);
		setAllergologicalHistory(norm.allergologicalHistory);
		setConcomitantDiseases(norm.concomitantDiseases);
		setCurrentMedications(norm.currentMedications);
		setPregnancyLactationStatus(norm.pregnancyLactationStatus);
		setPastDentalInterventions(norm.pastDentalInterventions);
		setBiteType(norm.biteType);
		setBiteDescription(norm.biteDescription);
		setOralMucosa(norm.oralMucosaStatus);
		setXrayFindingsDescription(norm.xrayFindingsDescription);
		setGeneralTreatmentPlan(norm.generalTreatmentPlan);
	}, []);

	return {
		activeTab, setActiveTab, selectedTooth, setSelectedTooth, activeStatus, setActiveStatus,
		odontogram, setOdontogram, dmftResult, cpitn, setCpitn, hygieneIndexOhiS, setHygieneIndexOhiS,
		chiefComplaint, setChiefComplaint, historyOfPresentIllness, setHistoryOfPresentIllness,
		allergologicalHistory, setAllergologicalHistory, concomitantDiseases, setConcomitantDiseases,
		currentMedications, setCurrentMedications, pregnancyLactationStatus, setPregnancyLactationStatus,
		pastDentalInterventions, setPastDentalInterventions, biteType, setBiteType,
		biteDescription, setBiteDescription, oralMucosa, setOralMucosa,
		xrayFindingsDescription, setXrayFindingsDescription, generalTreatmentPlan, setGeneralTreatmentPlan,
		createSnapshot, restoreSnapshot, handleApplyAnamnesisNorm,
	};
}
