/**
 * useHygieneHomeCare.ts — Управление состоянием и действиями памятки домашнего ухода (Мандат 8e).
 * (Layer 3 Hook).
 */

import { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	type HygieneHomeCareRecommendations,
	DEFAULT_STANDARD_HOME_CARE,
	CROWDING_ORTHO_HOME_CARE,
	PERIODONTITIS_HOME_CARE,
} from "./homeCarePresets";
import { printHomeCareMemo } from "./homeCarePrintHelper";

export function useHygieneHomeCare(
	patientName: string = "Пациент",
	doctorName: string = "Врач-стоматолог",
	onInsertToProtocol?: (text: string) => void,
) {
	const [care, setCare] = useState<HygieneHomeCareRecommendations>(
		DEFAULT_STANDARD_HOME_CARE,
	);
	const [activePreset, setActivePreset] = useState<
		"standard" | "ortho" | "perio"
	>("standard");
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	const handleSelectPreset = useCallback(
		(preset: "standard" | "ortho" | "perio") => {
			setActivePreset(preset);
			if (preset === "standard") setCare(DEFAULT_STANDARD_HOME_CARE);
			else if (preset === "ortho") setCare(CROWDING_ORTHO_HOME_CARE);
			else if (preset === "perio") setCare(PERIODONTITIS_HOME_CARE);
			showToast("Рекомендации домашнего ухода обновлены", "info", 2500);
		},
		[],
	);

	const formattedText = useMemo(() => {
		const lines = [
			`📋 ИНДИВИДУАЛЬНАЯ КАРТА ДОМАШНЕГО УХОДА И ГИГИЕНЫ ПОЛОСТИ РТА`,
			`Пациент: ${patientName}`,
			`Лечащий врач: ${doctorName}`,
			`Дата составления: ${new Date().toLocaleDateString("ru-RU")}`,
			"",
			"1. ОСНОВНАЯ ЗУБНАЯ ЩЕТКА:",
			`   ${care.toothbrush}`,
			"",
			"2. МОНОПУЧКОВАЯ ЩЕТКА:",
			`   ${care.monotufts}`,
			"",
			"3. МЕЖЗУБНЫЕ ЕРШИКИ (ИНТЕРДЕНТАЛЬНЫЙ УХОД):",
			`   ${care.interdentalBrushes}`,
			"",
			"4. ИРРИГАТОР И ОПОЛАСКИВАТЕЛЬ:",
			`   ${care.irrigator}`,
			"",
			"5. ЗУБНАЯ ПАСТА И РЕМИНЕРАЛИЗАЦИЯ:",
			`   ${care.toothpaste}`,
			"",
			"6. ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ И ОГРАНИЧЕНИЯ:",
			`   ${care.customNotes || "Соблюдать атравматичную технику чистки"}`,
			"",
			"Рекомендован контрольный осмотр и профессиональная гигиена через 6 месяцев.",
		];
		return lines.join("\n");
	}, [patientName, doctorName, care]);

	const handleCopy = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(formattedText);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Памятка домашнего ухода скопирована в буфер", "success", 2500);
		}
	}, [formattedText]);

	const handleInsertTo043 = useCallback(() => {
		const diaryEntry = `Рекомендован домашний уход:\n${care.toothbrush}; ${care.monotufts}; ${care.interdentalBrushes}; ${care.toothpaste}. Контрольный осмотр через 6 месяцев.`;

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			treatmentPlan: prev.treatmentPlan
				? `${prev.treatmentPlan}\n\n${diaryEntry}`
				: diaryEntry,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: diaryEntry,
					mode: "smart_append",
				},
			}),
		);

		onInsertToProtocol?.(diaryEntry);
		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2000);
		showToast("Назначения домашнего ухода внесены в дневник приёма", "success", 2500);
	}, [care, onInsertToProtocol]);

	const handleWhatsApp = useCallback(() => {
		const encoded = encodeURIComponent(formattedText);
		const url = `https://wa.me/?text=${encoded}`;
		if (typeof window !== "undefined") {
			window.open(url, "_blank", "noopener,noreferrer");
		}
		showToast("Открываем отправку рекомендаций в WhatsApp...", "info", 2500);
	}, [formattedText]);

	const handlePrint = useCallback(() => {
		printHomeCareMemo(care, patientName, doctorName);
	}, [patientName, doctorName, care]);

	return {
		care,
		setCare,
		activePreset,
		copyStatus,
		insertStatus,
		handleSelectPreset,
		handleCopy,
		handleInsertTo043,
		handleWhatsApp,
		handlePrint,
	};
}
