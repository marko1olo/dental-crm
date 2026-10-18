import { useState, useEffect, useMemo } from "react";
import type { MobileShiftCockpitProps } from "./types";
import { useMobileShiftConsumables } from "./useMobileShiftConsumables";
import { useMobileShiftCashOperations } from "./useMobileShiftCashOperations";

export function useMobileShiftCockpit(props: MobileShiftCockpitProps) {
	const {
		isShiftOpen,
		shiftOpenedAtIso,
		appointments = [],
		shiftNumber = 1,
		cashInDrawerRub = 15000,
	} = props;

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
			setElapsedTimeDisplay(`${String(hours).padStart(2, "0")}ч ${String(minutes).padStart(2, "0")}м`);
		};

		calculateElapsed();
		const interval = setInterval(calculateElapsed, 15000);
		return () => clearInterval(interval);
	}, [isShiftOpen, shiftOpenedAtIso]);

	const { consumables, handleAdjustConsumable } = useMobileShiftConsumables();

	const [isCashInSheetOpen, setIsCashInSheetOpen] = useState(false);
	const [isCashOutSheetOpen, setIsCashOutSheetOpen] = useState(false);
	const [isConsumablesSheetOpen, setIsConsumablesSheetOpen] = useState(false);

	const cashOps = useMobileShiftCashOperations({
		cashInDrawerRub,
		shiftNumber,
		setIsCashInSheetOpen,
		setIsCashOutSheetOpen,
	});

	const [activePatientFilter, setActivePatientFilter] = useState<"all" | "in_chair" | "waiting" | "payment">("all");

	const filteredAppointments = useMemo(() => {
		if (activePatientFilter === "all") return appointments;
		return appointments.filter((apt) => apt.statusKey === activePatientFilter);
	}, [appointments, activePatientFilter]);

	return {
		elapsedTimeDisplay,
		consumables,
		handleAdjustConsumable,
		isCashInSheetOpen,
		setIsCashInSheetOpen,
		isCashOutSheetOpen,
		setIsCashOutSheetOpen,
		isConsumablesSheetOpen,
		setIsConsumablesSheetOpen,
		cashInAmount: cashOps.cashInAmount,
		setCashInAmount: cashOps.setCashInAmount,
		cashInReason: cashOps.cashInReason,
		setCashInReason: cashOps.setCashInReason,
		isSubmittingCashIn: cashOps.isSubmittingCashIn,
		cashOutMode: cashOps.cashOutMode,
		setCashOutMode: cashOps.setCashOutMode,
		isSubmittingCashOut: cashOps.isSubmittingCashOut,
		activePatientFilter,
		setActivePatientFilter,
		filteredAppointments,
		handleConfirmCashIn: cashOps.handleConfirmCashIn,
		handleConfirmCashOutAndZReport: cashOps.handleConfirmCashOutAndZReport,
	};
}
