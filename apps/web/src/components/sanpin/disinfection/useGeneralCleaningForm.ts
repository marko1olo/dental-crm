import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	STATUTORY_DISINFECTANTS_CATALOG,
	calculateDisinfectantForRoom,
	calculateNextGeneralCleaningDate,
	type DisinfectionApplicationMethod,
	type DisinfectionJournalRecord,
	type DisinfectionRoomType,
} from "./disinfectionLogsEngine.js";
import { submitGeneralCleaningRecord } from "./generalCleaningSubmitAction.js";

export function useGeneralCleaningForm(
	onClose: () => void,
	onSuccess?: (rec: DisinfectionJournalRecord) => void,
) {
	const [roomType, setRoomType] = useState<DisinfectionRoomType>("surgical");
	const [roomName, setRoomName] = useState<string>("Хирургический кабинет № 1 (Операционная)");
	const [cleaningType] = useState<"general" | "current_routine">("general");
	const [logDate, setLogDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [treatedAreaM2, setTreatedAreaM2] = useState<number>(32.5);
	const [applicationMethod, setApplicationMethod] = useState<DisinfectionApplicationMethod>("wiping");

	const [selectedBrandId, setSelectedBrandId] = useState<string>("alaminol");
	const [concentrationPercent, setConcentrationPercent] = useState<number>(5.0);
	const [exposureMinutes, setExposureMinutes] = useState<number>(60);
	const [uvMinutes, setUvMinutes] = useState<number>(120);
	const [ventilationMinutes, setVentilationMinutes] = useState<number>(15);

	const [operatorStaffName, setOperatorStaffName] = useState<string>("Медицинская сестра процедурного кабинета");
	const [operatorStaffPosition] = useState<string>("Медицинская сестра");
	const [notes, setNotes] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const selectedBrand = useMemo(() => {
		const found = STATUTORY_DISINFECTANTS_CATALOG.find((b) => b.id === selectedBrandId);
		return found || STATUTORY_DISINFECTANTS_CATALOG[0]!;
	}, [selectedBrandId]);

	const calculation = useMemo(() => {
		return calculateDisinfectantForRoom({ treatedAreaM2, applicationMethod, concentrationPercent, exposureMinutes });
	}, [treatedAreaM2, applicationMethod, concentrationPercent, exposureMinutes]);

	const nextPlannedDate = useMemo(() => calculateNextGeneralCleaningDate(logDate), [logDate]);

	const handleBrandChange = (brandId: string) => {
		setSelectedBrandId(brandId);
		const brand = STATUTORY_DISINFECTANTS_CATALOG.find((b) => b.id === brandId) || STATUTORY_DISINFECTANTS_CATALOG[0]!;
		const defaultConc = brand.availableConcentrations[0];
		if (defaultConc) {
			setConcentrationPercent(defaultConc.percent);
			setExposureMinutes(defaultConc.exposureMinutes);
		}
	};

	const handleRoomChange = (type: DisinfectionRoomType) => {
		setRoomType(type);
		const configs: Record<DisinfectionRoomType, { name: string; area: number; conc: number; exp: number; uv: number }> = {
			surgical: { name: "Хирургический кабинет № 1 (Операционная)", area: 32.5, conc: 5.0, exp: 60, uv: 120 },
			therapeutic: { name: "Терапевтический кабинет № 1", area: 28.0, conc: 3.0, exp: 60, uv: 60 },
			orthopedic: { name: "Ортопедический кабинет", area: 25.0, conc: 2.0, exp: 60, uv: 60 },
			sterilization_cso: { name: "Центральное стерилизационное отделение (ЦСО)", area: 30.0, conc: 5.0, exp: 60, uv: 90 },
			xray: { name: "Рентген-диагностический кабинет", area: 18.0, conc: 2.0, exp: 60, uv: 60 },
		};
		const c = configs[type];
		setRoomName(c.name);
		setTreatedAreaM2(c.area);
		setConcentrationPercent(c.conc);
		setExposureMinutes(c.exp);
		setUvMinutes(c.uv);
	};

	const handleApplyNormPreset = () => {
		handleRoomChange("surgical");
		setSelectedBrandId("alaminol");
		setConcentrationPercent(5.0);
		setExposureMinutes(60);
		setUvMinutes(120);
		setVentilationMinutes(15);
		setNotes("Генеральная уборка: Аламинол 5%, 60 мин, УФ 120 мин, проветривание 15 мин.");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		try {
			setIsSubmitting(true);
			const rec = await submitGeneralCleaningRecord({
				logDate, roomName, roomType, cleaningType, treatedAreaM2: calculation.treatedAreaM2,
				applicationMethod, disinfectantName: selectedBrand.nameRu, activeIngredient: selectedBrand.activeIngredientRu,
				concentrationPercent: calculation.concentrationPercent, solutionVolumeLiters: calculation.totalSolutionVolumeLiters,
				concentrateVolumeMl: calculation.requiredConcentrateVolumeMl, waterVolumeLiters: calculation.requiredWaterVolumeLiters,
				exposureMinutes: calculation.exposureMinutes, uvMinutes, ventilationMinutes, operatorStaffName,
				operatorStaffPosition, notes, nextPlannedDate,
			});
			onSuccess?.(rec);
			onClose();
		} catch {
			showToast("Ошибка при фиксации уборки", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		roomType, setRoomType, roomName, setRoomName, logDate, setLogDate, treatedAreaM2, setTreatedAreaM2,
		applicationMethod, setApplicationMethod, selectedBrandId, setSelectedBrandId, selectedBrand,
		concentrationPercent, setConcentrationPercent, exposureMinutes, setExposureMinutes, uvMinutes, setUvMinutes,
		ventilationMinutes, setVentilationMinutes, operatorStaffName, setOperatorStaffName, notes, setNotes,
		isSubmitting, calculation, nextPlannedDate, handleBrandChange, handleRoomChange, handleApplyNormPreset, handleSubmit,
	};
}
