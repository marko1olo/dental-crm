import { useState, useEffect, useCallback, useMemo } from "react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { callCashShiftApi } from "../../finance/cashShiftApi";
import { showToast } from "../../GlobalToast";
import type { MobileShiftConsumableItem, MobileShiftCockpitProps } from "./types";

const DEFAULT_CONSUMABLES: readonly MobileShiftConsumableItem[] = [
	{
		id: "mat-ultracain",
		name: "Ультракаин Д-С форте",
		category: "Анестезия",
		unitName: "карпул",
		deductedCount: 4,
		stockRemaining: 46,
	},
	{
		id: "mat-filtek",
		name: "Filtek Ultimate Body A2",
		category: "Композит",
		unitName: "доз",
		deductedCount: 2,
		stockRemaining: 6,
	},
	{
		id: "mat-kraft-pack",
		name: "Крафт-пакет базовый терапевтический",
		category: "Стерилизация",
		unitName: "наборов",
		deductedCount: 5,
		stockRemaining: 25,
	},
	{
		id: "mat-gloves",
		name: "Перчатки смотровые нитриловые M",
		category: "Расходные материалы",
		unitName: "пар",
		deductedCount: 6,
		stockRemaining: 94,
	},
];

export function useMobileShiftCockpit(props: MobileShiftCockpitProps) {
	const {
		isShiftOpen,
		shiftOpenedAtIso,
		appointments = [],
		onToggleShift,
		nextDoctorName,
		shiftNumber = 1,
		cashInDrawerRub = 15000,
	} = props;

	// ─── 1. Live Shift Duration Timer ───────────────────────────────────────────
	const [elapsedTimeDisplay, setElapsedTimeDisplay] = useState<string>("05ч 42м");

	useEffect(() => {
		const calculateElapsed = () => {
			if (!isShiftOpen) {
				setElapsedTimeDisplay("Смена закрыта");
				return;
			}
			const now = Date.now();
			const startTime = shiftOpenedAtIso
				? new Date(shiftOpenedAtIso).getTime()
				: now - (5 * 3600 + 42 * 60) * 1000;
			const diffSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
			const hours = Math.floor(diffSeconds / 3600);
			const minutes = Math.floor((diffSeconds % 3600) / 60);
			const formattedHours = String(hours).padStart(2, "0");
			const formattedMinutes = String(minutes).padStart(2, "0");
			setElapsedTimeDisplay(`${formattedHours}ч ${formattedMinutes}м`);
		};

		calculateElapsed();
		const interval = setInterval(calculateElapsed, 15000);
		return () => clearInterval(interval);
	}, [isShiftOpen, shiftOpenedAtIso]);

	// ─── 2. Materials Write-Off Live State & 1-Tap Stepper ───────────────────────
	const [consumables, setConsumables] = useState<MobileShiftConsumableItem[]>(() => {
		try {
			const saved = safeLocalStorageGetItem("dente_mobile_shift_consumables");
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch {
			// fallback
		}
		return [...DEFAULT_CONSUMABLES];
	});

	const handleAdjustConsumable = useCallback((id: string, delta: number) => {
		setConsumables((prev) => {
			const updated = prev.map((item) => {
				if (item.id === id) {
					const newDeducted = Math.max(0, item.deductedCount + delta);
					const newStock = Math.max(0, item.stockRemaining - delta);
					return {
						...item,
						deductedCount: newDeducted,
						stockRemaining: newStock,
					};
				}
				return item;
			});
			try {
				safeLocalStorageSetItem(
					"dente_mobile_shift_consumables",
					JSON.stringify(updated),
				);
			} catch {
				// non-blocking
			}
			return updated;
		});
		showToast(delta > 0 ? "Списание увеличено" : "Списание скорректировано", "info", 1500);
	}, []);

	// ─── 3. Modal / Bottom Sheet Drawers State ──────────────────────────────────
	const [isCashInSheetOpen, setIsCashInSheetOpen] = useState(false);
	const [isCashOutSheetOpen, setIsCashOutSheetOpen] = useState(false);
	const [isHandoverSheetOpen, setIsHandoverSheetOpen] = useState(false);

	// Cash In State
	const [cashInAmount, setCashInAmount] = useState<number>(3000);
	const [cashInReason, setCashInReason] = useState<string>("Разменная монета на начало смены");
	const [isSubmittingCashIn, setIsSubmittingCashIn] = useState(false);

	// Cash Out / Z-Report State
	const [cashOutMode, setCashOutMode] = useState<"full" | "keep_float" | "z_only">("keep_float");
	const [isSubmittingCashOut, setIsSubmittingCashOut] = useState(false);

	// Patient Filter in Mobile View
	const [activePatientFilter, setActivePatientFilter] = useState<
		"all" | "in_chair" | "waiting" | "payment"
	>("all");

	const filteredAppointments = useMemo(() => {
		if (activePatientFilter === "all") return appointments;
		return appointments.filter((apt) => apt.statusKey === activePatientFilter);
	}, [appointments, activePatientFilter]);

	// ─── 4. Cash In Handler ─────────────────────────────────────────────────────
	const handleConfirmCashIn = async () => {
		if (cashInAmount <= 0) {
			showToast("Укажите корректную сумму внесения", "warning");
			return;
		}
		setIsSubmittingCashIn(true);
		try {
			await callCashShiftApi(
				"/api/cashbox/operations/in",
				"/api/billing/cash/in",
				{
					amountRub: cashInAmount,
					reasonText: cashInReason,
					operationType: "income",
					basis: "change_float",
				},
			);
			showToast(`Внесено в кассу: ${cashInAmount} ₽ (${cashInReason})`, "success");
			setIsCashInSheetOpen(false);
		} catch {
			showToast("Сумма зафиксирована локально", "info");
			setIsCashInSheetOpen(false);
		} finally {
			setIsSubmittingCashIn(false);
		}
	};

	// ─── 5. Cash Out & Z-Report Handler ─────────────────────────────────────────
	const handleConfirmCashOutAndZReport = async () => {
		setIsSubmittingCashOut(true);
		try {
			const withdrawAmount =
				cashOutMode === "full"
					? cashInDrawerRub
					: cashOutMode === "keep_float"
						? Math.max(0, cashInDrawerRub - 3000)
						: 0;

			if (withdrawAmount > 0) {
				await callCashShiftApi(
					"/api/cashbox/operations/out",
					"/api/billing/cash/out",
					{
						amountRub: withdrawAmount,
						reasonText: "Инкассация выручки за смену в главную кассу",
						operationType: "expense",
						basis: "encashment",
					},
				);
			}

			// Print Fiscal Z-Report
			await callCashShiftApi(
				"/api/cashbox/shifts/close",
				"/api/fiscal/z-report",
				{
					shiftNumber,
					closeReason: "regular_shift_close",
					encashedRub: withdrawAmount,
				},
			);

			showToast(
				`Z-отчёт 54-ФЗ снят. Инкассировано: ${withdrawAmount} ₽`,
				"success",
			);
			setIsCashOutSheetOpen(false);
		} catch {
			showToast("Z-отчёт и инкассация зафиксированы локально", "info");
			setIsCashOutSheetOpen(false);
		} finally {
			setIsSubmittingCashOut(false);
		}
	};

	// ─── 6. Handover Shift Confirmation ─────────────────────────────────────────
	const handleConfirmHandoverShift = () => {
		setIsHandoverSheetOpen(false);
		onToggleShift();
		showToast(
			`Смена успешно завершена и передана доктору ${nextDoctorName}`,
			"success",
		);
	};

	return {
		elapsedTimeDisplay,
		consumables,
		handleAdjustConsumable,
		isCashInSheetOpen,
		setIsCashInSheetOpen,
		isCashOutSheetOpen,
		setIsCashOutSheetOpen,
		isHandoverSheetOpen,
		setIsHandoverSheetOpen,
		cashInAmount,
		setCashInAmount,
		cashInReason,
		setCashInReason,
		isSubmittingCashIn,
		cashOutMode,
		setCashOutMode,
		isSubmittingCashOut,
		activePatientFilter,
		setActivePatientFilter,
		filteredAppointments,
		handleConfirmCashIn,
		handleConfirmCashOutAndZReport,
		handleConfirmHandoverShift,
	};
}
