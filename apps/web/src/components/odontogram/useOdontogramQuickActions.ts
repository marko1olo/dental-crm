import { useCallback, useEffect } from "react";
import {
	FRONTAL_HYGIENE_SECTOR_ADULT,
	FRONTAL_HYGIENE_SECTOR_PEDIATRIC,
	resolveSafeSanitationTargets,
} from "@dental/shared";
import {
	ALL_ADULT_TEETH_NUMBERS,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { submitExpressLabOrder } from "../lab/expressLabOrderHelper";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import { generateSoapFromOdontogramStates } from "../../lib/clinicalProtocols";

export interface QuickActionDoctor {
	id?: string | null | undefined;
	userId?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	role?: string | null | undefined;
	specialty?: string | null | undefined;
}

export interface UseOdontogramQuickActionsProps {
	patientId: string;
	activeDoctor?: QuickActionDoctor | null | undefined;
	isPediatricMode: boolean;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
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
	dentitionMode,
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
		const allTeeth =
			dentitionMode === "mixed"
				? [...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH]
				: isPediatricMode
					? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
					: [...ALL_ADULT_TEETH_NUMBERS];

		const currentTeeth =
			teethDataRef.current.length > 0 ? teethDataRef.current : teethData;
		const stateMap = new Map<number, string>();
		for (const t of currentTeeth) {
			stateMap.set(t.toothNumber, t.state);
		}
		const { sanitizedTargets, preservedSurgicalCount } =
			resolveSafeSanitationTargets(allTeeth, stateMap);

		void updateToothState(sanitizedTargets, "Healthy", []);
		SoundFeedbackService.getInstance().playActionSuccess();
		const toastMessage =
			preservedSurgicalCount > 0
				? `Санация: ${sanitizedTargets.length} зубов отмечено нормой (сохранено хирургических/ортопедических статусов: ${preservedSurgicalCount})`
				: dentitionMode === "mixed"
					? "Санация: сменный прикус (24 зуба) отмечен как норма"
					: isPediatricMode
						? "Санация: молочный прикус (20 зубов) отмечен как норма"
						: "Санация: вся зубная формула отмечена как норма";
		showToast(toastMessage, "success", 4000);
	}, [dentitionMode, isPediatricMode, updateToothState, teethData, teethDataRef]);

	const handleFrontalHygiene = useCallback(() => {
		const targets = isPediatricMode
			? [...FRONTAL_HYGIENE_SECTOR_PEDIATRIC]
			: [...FRONTAL_HYGIENE_SECTOR_ADULT];
		void updateToothState(targets, "Healthy", []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			isPediatricMode
				? "Пакетная профгигиена: фронт 53–63 и 83–73 очищен"
				: "Пакетная профгигиена: фронтальный сектор 13–23 и 33–43 очищен (налет и камень сняты)",
			"success",
			4000,
		);
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
			showToast("Выделение зубов снято", "info", 2000);
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

	const handleOneClickLabOrder = useCallback(
		async (targetTeeth: number[]) => {
			await submitExpressLabOrder({
				patientId,
				doctorId: activeDoctor?.id || null,
				targetTeeth,
				sourceContext: "odontogram",
			});
		},
		[patientId, activeDoctor],
	);

	return {
		handleMarkAllHealthy,
		handleFrontalHygiene,
		handleMarkWisdomMissing,
		handleInvertSelection,
		handleClearSelection,
		handleSyncAllToDiary,
		handleOneClickLabOrder,
	};
}

/**
 * Чистая утилита инвертирования выделенных зубов челюсти.
 */
export function invertTeethSelection(
	allTeeth: number[],
	selectedTeeth: number[],
): number[] {
	const selectedSet = new Set(selectedTeeth);
	return allTeeth.filter((t) => !selectedSet.has(t));
}
