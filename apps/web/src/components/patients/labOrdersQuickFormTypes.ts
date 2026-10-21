import type React from "react";

export type ShadeGuideSystem = "classical" | "3d_master" | "bleach" | "stump";

export const RESTORATION_TYPES = [
	{ value: "single_crown", label: "Коронка анатомическая" },
	{ value: "bridge", label: "Мостовидный протез" },
	{ value: "veneer", label: "Керамический винир E.max" },
	{ value: "inlay_onlay", label: "Вкладка/Накладка E.max/Zr" },
	{ value: "screw_crown", label: "Коронка с винтовой фиксацией" },
	{ value: "abutment_crown", label: "Индивидуальный абатмент + коронка" },
	{ value: "core_build_up", label: "Культевая вкладка (CoCr/Zr)" },
	{ value: "temporary_pmma", label: "Временная коронка PMMA CAD/CAM" },
	{ value: "prothesis_complete", label: "Полный съемный протез" },
	{ value: "prothesis_partial", label: "Бюгельный/ЧСП протез" },
];

export interface LabOrdersQuickFormProps {
	selectedTeeth: number[];
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	restorationType: string;
	setRestorationType: (v: string) => void;
	material: string;
	setMaterial: (v: string) => void;
	shadeSystem: ShadeGuideSystem;
	setShadeSystem: (v: ShadeGuideSystem) => void;
	colorVita: string;
	setColorVita: (v: string) => void;
	stumpShade: string | null;
	setStumpShade: (v: string | null) => void;
	fittingDate: string;
	setFittingDate: (v: string) => void;
	dueDate: string;
	setDueDate: (v: string) => void;
	clinicalNotes: string;
	setClinicalNotes: (v: string) => void;
	calculatedMaterialCostKopecks: number;
	submitting: boolean;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	onOneClickCreate: () => void;
}
