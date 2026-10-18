import { useState } from "react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../lib/safeLocalStorage";
import type { ShiftFinancialMode } from "./shiftViewTypes";

export function useShiftFinancialModeState() {
	const [shiftFinancialMode, setShiftFinancialMode] = useState<ShiftFinancialMode>(() => {
		try {
			const s = safeLocalStorageGetItem("dente_shift_financial_mode");
			if (s === "piece_rate" || s === "standard") return "piece_rate";
			if (s === "chair_rental") return "chair_rental";
		} catch {}
		return "piece_rate";
	});
	const [chairRentalNetIncomeRub, setChairRentalNetIncomeRub] = useState<number>(0);
	const [chairRentalRentExpenseRub, setChairRentalRentExpenseRub] = useState<number>(0);
	const [chairRentalActTrigger, setChairRentalActTrigger] = useState<number>(0);

	const handleChangeFinancialMode = (mode: ShiftFinancialMode) => {
		const targetMode = mode === "standard" ? "piece_rate" : mode;
		setShiftFinancialMode(targetMode);
		try {
			safeLocalStorageSetItem("dente_shift_financial_mode", targetMode);
		} catch {}
	};

	return {
		shiftFinancialMode,
		setShiftFinancialMode,
		chairRentalNetIncomeRub,
		setChairRentalNetIncomeRub,
		chairRentalRentExpenseRub,
		setChairRentalRentExpenseRub,
		chairRentalActTrigger,
		setChairRentalActTrigger,
		handleChangeFinancialMode,
	};
}
