import { useState, useMemo, useCallback } from "react";
import type { TreatmentPlanTier } from "../../types";
import { formatWarrantyYearsText } from "../../types";
import { showToast } from "../../../GlobalToast";
import type { PresenterTabId } from "../../TreatmentPlanPresenterHeader";
import { getTierLetter } from "./presenterStateConstants";

export interface PresenterNavigationParams {
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly selectedTier: TreatmentPlanTier;
	readonly patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorFullName?: string | undefined;
}

export function usePresenterNavigationState({
	allTiers,
	selectedTier,
	patientName = "",
	clinicName = "DENTE Стоматология",
	clinicPhone = "",
	doctorFullName = "",
}: PresenterNavigationParams) {
	const [activeTab, setActiveTab] = useState<PresenterTabId>("comparison");
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({ 1: true });
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12 | 24>(12);
	const [printDocFormat, setPrintDocFormat] = useState<"patient_friendly" | "official_appendix">("patient_friendly");
	const [showMicroConsumables, setShowMicroConsumables] = useState<boolean>(false);

	const handleCopyTiersSummary = useCallback(async () => {
		const linesSummary = [
			`Варианты плана лечения для пациента: ${patientName}`,
			`Клиника: ${clinicName} · Врач: ${doctorFullName}`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}`,
			"----------------------------------------",
		];
		allTiers.forEach((tier) => {
			const letter = getTierLetter(tier.tierId);
			const isRec = tier.tierId === "standard" ? " [РЕКОМЕНДАЦИЯ ВРАЧА]" : "";
			linesSummary.push(`${letter}: ${tier.title}${isRec}`);
			linesSummary.push(`  Итого: ${tier.totalRub.toLocaleString("ru-RU")} ₽`);
			linesSummary.push(`  Срок: ~ ${tier.durationWeeks} нед. (${tier.durationVisits} визитов)`);
			linesSummary.push(`  Гарантия: ${formatWarrantyYearsText(tier.warrantyYears)}`);
			if (tier.monthlyInstallment12Rub > 0) {
				linesSummary.push(`  Рассрочка 0%: от ${tier.monthlyInstallment12Rub.toLocaleString("ru-RU")} ₽/мес на 12 мес.`);
			}
			if (tier.ndflRefundRub > 0) {
				linesSummary.push(`  Возврат 13% НДФЛ: -${tier.ndflRefundRub.toLocaleString("ru-RU")} ₽ (к оплате с вычетом: ${tier.priceWithNdflRefundRub.toLocaleString("ru-RU")} ₽)`);
			}
			linesSummary.push("");
		});
		linesSummary.push("----------------------------------------");
		linesSummary.push("Запись на консультацию и утверждение плана: " + clinicPhone);

		try {
			await navigator.clipboard.writeText(linesSummary.join("\n"));
			showToast("Смета всех 3 вариантов скопирована в буфер обмена!", "success");
		} catch {
			showToast("Не удалось скопировать смету", "error");
		}
	}, [patientName, clinicName, doctorFullName, allTiers, clinicPhone]);

	const handlePrintAppendix = useCallback(() => {
		setActiveTab("print_appendix");
		setTimeout(() => {
			window.print();
		}, 300);
	}, []);

	const toggleStage = useCallback((stageNum: number) => {
		setExpandedStages((prev) => ({
			...prev,
			[stageNum]: !prev[stageNum],
		}));
	}, []);

	const toggleAllStages = useCallback((expand: boolean) => {
		const next: Record<number, boolean> = {};
		selectedTier.stages.forEach((s) => {
			next[s.stageNumber] = expand;
		});
		setExpandedStages(next);
	}, [selectedTier.stages]);

	const todayRu = useMemo(() => new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}), []);

	return {
		activeTab,
		setActiveTab,
		isFullscreen,
		setIsFullscreen,
		expandedStages,
		toggleStage,
		toggleAllStages,
		installmentMonths,
		setInstallmentMonths,
		printDocFormat,
		setPrintDocFormat,
		showMicroConsumables,
		setShowMicroConsumables,
		todayRu,
		handleCopyTiersSummary,
		handlePrintAppendix,
	};
}
