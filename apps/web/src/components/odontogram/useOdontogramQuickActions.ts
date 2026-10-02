import { useCallback, useEffect } from "react";
import {
	ALL_ADULT_TEETH_NUMBERS,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import {
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
	calculateMaterialTotalCostKopecks,
} from "../lab/labMath";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import { generateSoapFromOdontogramStates } from "../../lib/clinicalProtocols043";

export interface UseOdontogramQuickActionsProps {
	patientId: string;
	activeDoctor?: any;
	isPediatricMode: boolean;
	teethData: ToothData[];
	teethDataRef: React.MutableRefObject<ToothData[]>;
	updateToothState: (
		toothNumbers: number[],
		state: ToothState,
		surfacesOverride?: readonly string[] | undefined,
	) => Promise<void>;
}

export function useOdontogramQuickActions({
	patientId,
	activeDoctor,
	isPediatricMode,
	teethData,
	teethDataRef,
	updateToothState,
}: UseOdontogramQuickActionsProps) {
	useEffect(() => {
		const handleQuickApply = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { toothNumber?: number; state?: ToothState; surfaces?: string[]; patientId?: string }
				| undefined;
			if (!detail?.toothNumber || !detail.state) return;
			if (detail.patientId && patientId && detail.patientId !== patientId) return;
			void updateToothState([detail.toothNumber], detail.state, detail.surfaces);
		};
		window.addEventListener("dente-quick-tooth-apply", handleQuickApply);
		return () => {
			window.removeEventListener("dente-quick-tooth-apply", handleQuickApply);
		};
	}, [updateToothState, patientId]);

	const handleMarkAllHealthy = useCallback(() => {
		const allTeeth = isPediatricMode
			? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
			: [...ALL_ADULT_TEETH_NUMBERS];
		void updateToothState(allTeeth, "Healthy", []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Санация: вся зубная формула отмечена здоровой в 1 клик", "success", 4000);
	}, [isPediatricMode, updateToothState]);

	const handleMarkWisdomMissing = useCallback(() => {
		const wisdomTeeth = [18, 28, 38, 48];
		void updateToothState(wisdomTeeth, "Missing", []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Адентия 8-ок: зубы 18, 28, 38, 48 отмечены отсутствующими", "info", 4000);
	}, [updateToothState]);

	const handleInvertSelection = useCallback(
		(
			allTeeth: number[],
			selectedTeeth: number[],
			setSelectedTeeth: (t: number[]) => void,
		) => {
			const selectedSet = new Set(selectedTeeth);
			const inverted = allTeeth.filter((t) => !selectedSet.has(t));
			setSelectedTeeth(inverted);
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast(
				`Инвертировано: выделено ${inverted.length} из ${allTeeth.length} зубов`,
				"info",
				3000,
			);
		},
		[],
	);

	const handleClearSelection = useCallback(
		(setSelectedTeeth: (t: number[]) => void) => {
			setSelectedTeeth([]);
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Выделение зубов снято в 1 клик", "info", 2000);
		},
		[],
	);

	const handleSyncAllToDiary = useCallback(() => {
		const currentTeeth = teethDataRef.current.length > 0 ? teethDataRef.current : teethData;
		const pathological = currentTeeth.filter(
			(t) => t.state !== "Healthy" && t.state !== "Missing",
		);
		const targetList = pathological.length > 0 ? pathological : currentTeeth;
		const findings = targetList.map((t) => {
			return t.surfaces && t.surfaces.length > 0
				? { toothNumber: t.toothNumber, state: t.state, surfaces: t.surfaces }
				: { toothNumber: t.toothNumber, state: t.state };
		});
		const soap = generateSoapFromOdontogramStates(findings);

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(
				`[Зубная формула: дневник приёма]\nАнамнез: ${soap.anamnesis || "Без особенностей"}\nОбъективно: ${soap.statusLocalis || "Полость рта санирована"}\nДиагноз: ${soap.diagnosisIcd10 || "K02"}\nЛечение: ${soap.treatmentDescription || "Санация"}`,
			).catch(() => {
				// Clipboard safe fallback
			});
		}

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap,
					mode: "smart_append",
					immediate: true,
				},
			}),
		);

		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Клинический статус зубной формулы внесен в дневник приёма", "success", 4000);
	}, [teethData, teethDataRef]);

	const handleOneClickLabOrder = useCallback(async (targetTeeth: number[]) => {
		if (targetTeeth.length === 0) {
			showToast("Выберите зубы для наряда ЗТЛ", "warning");
			return;
		}
		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		const dueDateIso = due.toISOString();
		const dueDateFormatted = due.toLocaleDateString("ru-RU");
		const isBridge = targetTeeth.length > 1;
		const construction = isBridge
			? ONE_CLICK_LAB_DEFAULTS.restorationTypeBridge
			: ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle;
		const priceRub =
			(calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) ||
				650000 * targetTeeth.length) / 100;
		const toothFdiStr = targetTeeth.join(", ");

		try {
			showToast(`Создаём 1-клик наряд ЗТЛ для зубов ${toothFdiStr}...`, "info", 2000);
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					doctorId: activeDoctor?.id || null,
					toothFdi: toothFdiStr,
					material: ONE_CLICK_LAB_DEFAULTS.materialName,
					colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
					dueDate: dueDateIso,
					clinicalNotes: `• Экспресс 1-клик наряд ЗТЛ из одонтограммы\n• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: 7 рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
					priceRub,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка создания наряда ЗТЛ");
			}

			const savedOrder = await res.json();

			if (savedOrder?.id) {
				for (const tooth of targetTeeth) {
					try {
						await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothFdi: tooth,
								restorationType: construction,
								material: ONE_CLICK_LAB_DEFAULTS.materialId,
								shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
								translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
								cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
								priceRub: priceRub / targetTeeth.length,
							}),
						});
					} catch {
						// Non-blocking item fallback
					}
				}
			}

			showToast(
				`Наряд ЗТЛ успешно оформлен в 1 клик для зубов ${toothFdiStr} (Цирконий A2, сдача: ${dueDateFormatted})!`,
				"success",
				6000,
			);
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: { order: savedOrder } }),
			);
		} catch (err: any) {
			showToast(err.message || "Не удалось оформить наряд в ЗТЛ", "error");
		}
	}, [patientId, activeDoctor]);

	return {
		handleMarkAllHealthy,
		handleMarkWisdomMissing,
		handleInvertSelection,
		handleClearSelection,
		handleSyncAllToDiary,
		handleOneClickLabOrder,
	};
}

/**
 * Чистая утилита инвертирования выделенных зубов челюсти (1 клик).
 */
export function invertTeethSelection(
	allTeeth: number[],
	selectedTeeth: number[],
): number[] {
	const selectedSet = new Set(selectedTeeth);
	return allTeeth.filter((t) => !selectedSet.has(t));
}
