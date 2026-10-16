import { useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import {
	calculateMaterialTotalCostKopecks,
	addWorkingDays,
	ONE_CLICK_LAB_DEFAULTS,
	type ExpressLabPreset,
} from "../../lab/labMath";
import type { ShadeGuideSystem } from "../LabOrdersQuickForm";

export function useLabOrdersQuickFormState(
	patientId: string | undefined,
	activeDoctorId: string | undefined,
	onCreated: () => void,
) {
	const [showQuickForm, setShowQuickForm] = useState(false);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [restorationType, setRestorationType] = useState("single_crown");
	const [material, setMaterial] = useState("zirconia_multilayer");
	const [shadeSystem, setShadeSystem] = useState<ShadeGuideSystem>("classical");
	const [colorVita, setColorVita] = useState("A2");
	const [stumpShade, setStumpShade] = useState<string | null>("");
	const [fittingDate, setFittingDate] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const calculatedMaterialCostKopecks = useMemo(
		() => calculateMaterialTotalCostKopecks(material, selectedTeeth.length || 1),
		[material, selectedTeeth.length],
	);

	const handleOneClickCreate = async () => {
		if (!patientId) return;
		setSubmitting(true);
		try {
			const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({
					patientId,
					doctorId: activeDoctorId || null,
					toothFdi: selectedTeeth.length ? selectedTeeth.join(", ") : "21",
					material: "Диоксид циркония Katana ML",
					colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
					dueDate: due.toISOString(),
					priceRub: 7500,
				}),
			});
			if (res.ok) {
				showToast("Наряд ЗТЛ успешно создан в 1 клик", "success");
				onCreated();
				setShowQuickForm(false);
			}
		} catch {
			showToast("Ошибка создания наряда", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleExpressPresetCreate = async (preset: ExpressLabPreset) => {
		if (!patientId) return;
		setSubmitting(true);
		try {
			const due = addWorkingDays(new Date(), preset.workingDays);
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({
					patientId,
					doctorId: activeDoctorId || null,
					toothFdi: selectedTeeth.length ? selectedTeeth.join(", ") : "11",
					material: preset.title,
					colorVita: preset.colorVita,
					dueDate: due.toISOString(),
					priceRub: preset.priceRub,
				}),
			});
			if (res.ok) {
				showToast(`Экспресс-наряд «${preset.title}» оформлен!`, "success");
				onCreated();
			}
		} catch {
			showToast("Ошибка создания экспресс-наряда", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return {
		showQuickForm, setShowQuickForm,
		selectedTeeth, setSelectedTeeth,
		restorationType, setRestorationType,
		material, setMaterial,
		shadeSystem, setShadeSystem,
		colorVita, setColorVita,
		stumpShade, setStumpShade,
		fittingDate, setFittingDate,
		dueDate, setDueDate,
		clinicalNotes, setClinicalNotes,
		submitting,
		calculatedMaterialCostKopecks,
		handleOneClickCreate,
		handleExpressPresetCreate,
		handleQuickSubmit: async (e: React.FormEvent) => { e.preventDefault(); await handleOneClickCreate(); },
	};
}
