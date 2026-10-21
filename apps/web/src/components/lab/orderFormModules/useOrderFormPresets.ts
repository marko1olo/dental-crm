import { showToast } from "../../GlobalToast";
import {
	type ExpressLabPreset,
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
} from "../labMath";

export interface OrderFormPresetsSetters {
	setConstructionType: (v: string) => void;
	setMaterial: (v: string) => void;
	setShadeSystem: (v: "classical" | "3d_master" | "bleach") => void;
	setShadeClassical: (v: string) => void;
	setShadeBody: (v: string) => void;
	setSurfaceTexture: (v: string) => void;
	setCementGapMicrons: (v: number) => void;
	setTranslucency: (v: string) => void;
	setDueDate: (v: string) => void;
	setCeramicTrialDate: (v: string) => void;
	setScheduledVisitDate: (v: string) => void;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	setJawScope: (v: any) => void;
	setOcclusalScheme: (v: string) => void;
	setContactTightness: (v: string) => void;
	setImpressionType: (v: string) => void;
	setPriceRubInput: (v: string) => void;
	selectedTeeth: number[];
	jawScope: any;
	scheduledVisitDate: string;
}

export function useOrderFormPresets(setters: OrderFormPresetsSetters) {
	const handleApplyOneClickDefaults = () => {
		setters.setConstructionType(ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle);
		setters.setMaterial(ONE_CLICK_LAB_DEFAULTS.materialId);
		setters.setShadeSystem(ONE_CLICK_LAB_DEFAULTS.shadeSystem);
		setters.setShadeClassical(ONE_CLICK_LAB_DEFAULTS.colorVita);
		setters.setShadeBody(ONE_CLICK_LAB_DEFAULTS.colorVita);
		setters.setSurfaceTexture(ONE_CLICK_LAB_DEFAULTS.surfaceTexture);
		setters.setCementGapMicrons(ONE_CLICK_LAB_DEFAULTS.cementGapMicrons);
		setters.setTranslucency(ONE_CLICK_LAB_DEFAULTS.translucency);
		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		setters.setDueDate(due.toISOString().slice(0, 10));
		const fitDate = addWorkingDays(due, 1);
		const fitDateIso = fitDate.toISOString().slice(0, 10);
		setters.setCeramicTrialDate(fitDateIso);
		if (!setters.scheduledVisitDate) {
			setters.setScheduledVisitDate(fitDateIso);
		}
		if (setters.selectedTeeth.length === 0 && !setters.jawScope) {
			setters.setSelectedTeeth([16]);
		}
		showToast(
			`Применен шаблон: «Коронка ZrO2, цвет А2, зуб 16, 5 раб. дней» (до ${due.toLocaleDateString("ru-RU")})`,
			"success",
			4000,
		);
	};

	const handleApplyExpressPreset = (preset: ExpressLabPreset) => {
		setters.setConstructionType(preset.constructionType);
		setters.setMaterial(preset.materialId);
		setters.setShadeSystem("classical");
		setters.setShadeClassical(preset.colorVita);
		setters.setShadeBody(preset.colorVita);
		setters.setOcclusalScheme(preset.occlusalScheme);
		setters.setContactTightness(preset.contactTightness);
		setters.setSurfaceTexture(preset.surfaceTexture);
		setters.setCementGapMicrons(preset.cementGapMicrons);
		if (preset.impressionType) {
			setters.setImpressionType(preset.impressionType);
		}
		if (preset.isFullArchOrJaw && preset.toothFdi) {
			setters.setJawScope("both");
		}
		const due = addWorkingDays(new Date(), preset.workingDays);
		setters.setDueDate(due.toISOString().slice(0, 10));
		const fitDate = addWorkingDays(due, 1);
		const fitDateIso = fitDate.toISOString().slice(0, 10);
		setters.setCeramicTrialDate(fitDateIso);
		if (!setters.scheduledVisitDate) {
			setters.setScheduledVisitDate(fitDateIso);
		}
		setters.setPriceRubInput(String(preset.priceRub));
		showToast(`Пресет применен: ${preset.title} (${preset.shortDesc})`, "success", 4000);
	};

	return {
		handleApplyOneClickDefaults,
		handleApplyExpressPreset,
	};
}
