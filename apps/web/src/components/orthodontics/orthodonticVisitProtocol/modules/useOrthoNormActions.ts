import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";

export interface UseOrthoNormActionsParams {
	setAngleClass: (c: any) => void;
	setAnbClass: (c: any) => void;
	setAnbAngle: (a: number) => void;
	setSagittalAnomaly: (a: any) => void;
	setSagittalGapMm: (g: number) => void;
	setVerticalAnomaly: (a: any) => void;
	setTransversalAnomaly: (a: any) => void;
	setTmjStatus: (s: any) => void;
	setElasticScheme: (scheme: string) => void;
	setNotes: React.Dispatch<React.SetStateAction<string>>;
}

export function useOrthoNormActions(params: UseOrthoNormActionsParams) {
	const {
		setAngleClass, setAnbClass, setAnbAngle, setSagittalAnomaly,
		setSagittalGapMm, setVerticalAnomaly, setTransversalAnomaly, setTmjStatus,
		setElasticScheme, setNotes,
	} = params;

	const handleSetMasterPhysiologicalNorm = useCallback(() => {
		setAngleClass("class_1");
		setAnbClass("class_1");
		setAnbAngle(2.0);
		setSagittalAnomaly("norm");
		setSagittalGapMm(2);
		setVerticalAnomaly("norm");
		setTransversalAnomaly("norm");
		setTmjStatus("norm");
		setElasticScheme("none");
		setNotes("Физиологический ортогнатический прикус (Класс I по Энглю, ANB 2.0°). Окклюзионные соотношения в норме. ВНЧС интактен, пальпация безболезненная.");
		showToast("✓ Установлена норма: Физиологический ортогнатический прикус", "success", 3000);
	}, [setAngleClass, setAnbClass, setAnbAngle, setSagittalAnomaly, setSagittalGapMm, setVerticalAnomaly, setTransversalAnomaly, setTmjStatus, setElasticScheme, setNotes]);

	const handleSetAngleClassNorm = useCallback(() => {
		setAngleClass("class_1");
		setAnbClass("class_1");
		setAnbAngle(2.0);
		setElasticScheme("none");
		setNotes("Скелетный класс I по Энглю (ANB 2.0°), соотношение моляров и клыков нейтральное.");
		showToast("Норма: Скелетный класс I / Физиологический прикус", "success", 2500);
	}, [setAngleClass, setAnbClass, setAnbAngle, setElasticScheme, setNotes]);

	const handleSetOcclusionNorm = useCallback(() => {
		setSagittalAnomaly("norm");
		setSagittalGapMm(2);
		setVerticalAnomaly("norm");
		setTransversalAnomaly("norm");
		showToast("Норма: Окклюзионные взаимоотношения в норме", "success", 2500);
	}, [setSagittalAnomaly, setSagittalGapMm, setVerticalAnomaly, setTransversalAnomaly]);

	const handleSetTmjNorm = useCallback(() => {
		setTmjStatus("norm");
		showToast("Норма: ВНЧС безболезненный, девиации нет", "success", 2500);
	}, [setTmjStatus]);

	const handleSetAnbNorm = useCallback(() => {
		setAnbClass("class_1");
		setAnbAngle(2.0);
		showToast("Норма: Скелетный класс I (ANB 2.0°)", "success", 2500);
	}, [setAnbClass, setAnbAngle]);

	return {
		handleSetMasterPhysiologicalNorm,
		handleSetAngleClassNorm,
		handleSetOcclusionNorm,
		handleSetTmjNorm,
		handleSetAnbNorm,
	};
}
