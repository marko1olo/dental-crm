import { useState } from "react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../lib/safeLocalStorage";
import type { ShiftFinancialMode } from "./shiftViewTypes";

export function useShiftFinancialModeState() {
	const [shiftFinancialMode, setShiftFinancialMode] = useState<ShiftFinancialMode>(() => {
		try {
			const s = safeLocalStorageGetItem("dente_shift_financial_mode");
			if (s === "piece_rate" || s === "chair_rental") return s;
		} catch {}
		return "chair_rental";
	});
	const [chairRentalNetIncomeRub, setChairRentalNetIncomeRub] = useState<number>(0);
	const [chairRentalRentExpenseRub, setChairRentalRentExpenseRub] = useState<number>(0);
	const [chairRentalActTrigger, setChairRentalActTrigger] = useState<number>(0);

	const handleChangeFinancialMode = (mode: ShiftFinancialMode) => {
		setShiftFinancialMode(mode);
		try {
			safeLocalStorageSetItem("dente_shift_financial_mode", mode);
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
