import { useMemo, useState, useCallback } from "react";
import { type Kopecks, classifyProcedureStage, parseKopecks, percentageOfKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { calculateLiveInvoiceItems, type LiveInvoiceItem } from "../../odontogram/OdontogramLiveInvoice";
import type { TreatmentPlanWizardProps, WizardStageGroup } from "./wizardTypes";

export function useTreatmentPlanWizard(props: TreatmentPlanWizardProps) {
	const { teethData, patientId, onPlanCreated, initialDiscountPercent = 0, onClose } = props;
	const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [planTitle, setPlanTitle] = useState("План лечения (из одонтограммы)");
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(initialDiscountPercent);

	const rawItems = useMemo(() => calculateLiveInvoiceItems(teethData), [teethData]);
	const activeItems = useMemo(() => rawItems.filter((it) => !excludedKeys.has(`${it.toothNumber}-${it.code}`)), [rawItems, excludedKeys]);

	const stageGroups: WizardStageGroup[] = useMemo(() => {
		const therapy: LiveInvoiceItem[] = [];
		const surgery: LiveInvoiceItem[] = [];
		const ortho: LiveInvoiceItem[] = [];

		for (const it of activeItems) {
			const kind = classifyProcedureStage(it.code, it.category);
			if (kind === "stage_3_orthopedics") ortho.push(it);
			else if (kind === "stage_2_surgery") surgery.push(it);
			else therapy.push(it);
		}

		const calcKop = (items: LiveInvoiceItem[]): Kopecks =>
			items.reduce((acc, it) => {
				const gross = (parseKopecks(it.price) * (it.quantity || 1)) as Kopecks;
				const disc = doctorDiscountPercent > 0 ? percentageOfKopecks(gross, doctorDiscountPercent * 100) : (0 as Kopecks);
				return (acc + Math.max(0, gross - disc)) as Kopecks;
			}, 0 as Kopecks);

		const g1 = calcKop(therapy);
		const g2 = calcKop(surgery);
		const g3 = calcKop(ortho);

		return [
			{ stageNumber: 1, stageTitle: "Этап I: Терапия и санация", stageKind: "therapy", items: therapy, totalKopecks: g1, totalRub: Math.round(g1 / 100) },
			{ stageNumber: 2, stageTitle: "Этап II: Хирургия и имплантация", stageKind: "surgery", items: surgery, totalKopecks: g2, totalRub: Math.round(g2 / 100) },
			{ stageNumber: 3, stageTitle: "Этап III: Ортопедия и протезирование", stageKind: "orthopedics", items: ortho, totalKopecks: g3, totalRub: Math.round(g3 / 100) },
		];
	}, [activeItems, doctorDiscountPercent]);

	const totalKopecks = useMemo(() => stageGroups.reduce((acc, g) => acc + g.totalKopecks, 0), [stageGroups]);
	const totalRub = Math.round(totalKopecks / 100);

	const toggleExclude = (itemKey: string) => {
		setExcludedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(itemKey)) next.delete(itemKey);
			else next.add(itemKey);
			return next;
		});
	};

	const createPlan = useCallback(async () => {
		setIsSubmitting(true);
		try {
			const effectiveItems = activeItems.length > 0 ? activeItems : [{ toothNumber: 0, code: "B01.065.001", title: "Консультация врача-стоматолога", category: "Консультация", price: 0, quantity: 1 }];
			const planItems = effectiveItems.map((item, idx) => {
				const gross = (parseKopecks(item.price) * (item.quantity || 1)) as Kopecks;
				const disc = doctorDiscountPercent > 0 ? percentageOfKopecks(gross, doctorDiscountPercent * 100) : (0 as Kopecks);
				const kind = classifyProcedureStage(item.code, item.category);
				const phase = kind === "stage_3_orthopedics" ? 3 : (kind === "stage_2_surgery" ? 2 : 1);
				return { id: `auto_${item.toothNumber}_${item.code}_${idx}`, toothNumber: item.toothNumber, priceId: item.code, name: item.title, quantity: item.quantity, price: item.price, discount: Math.round(disc / 100), phase, isAuto: true };
			});

			if (patientId) {
				const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
					method: "POST", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ name: planTitle, patientSignature: null, items: planItems }),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка сохранения плана");
				}
				const result = await res.json().catch(() => null);
				onPlanCreated?.(result?.planId || result?.plan?.id || `plan_${Date.now()}`, totalRub);
			}
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast("План лечения успешно составлен", "success");
			onClose();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка создания плана", "error");
		} finally {
			setIsSubmitting(false);
		}
	}, [activeItems, doctorDiscountPercent, patientId, planTitle, onPlanCreated, totalRub, onClose]);

	return { rawItems, activeItems, stageGroups, totalRub, doctorDiscountPercent, setDoctorDiscountPercent, planTitle, setPlanTitle, isSubmitting, toggleExclude, createPlan };
}
