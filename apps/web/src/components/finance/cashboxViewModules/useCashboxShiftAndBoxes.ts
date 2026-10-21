import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { CashBoxSummary } from "./types.js";
import { useCashboxCashMovement } from "./useCashboxCashMovement.js";

/**
 * Hook for cashbox shift operations and box balances.
 * Mandate 8b: <= 120 lines.
 */
export function useCashboxShiftAndBoxes(initialShiftOpen: boolean, cashierName: string) {
	const [cashBoxes, setCashBoxes] = useState<readonly CashBoxSummary[]>([]);
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialShiftOpen);
	const [mainCashBoxId, setMainCashBoxId] = useState<string | null>(null);
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);

	const loadCashBoxes = useCallback(async () => {
		try {
			const res = await fetch("/api/cash/cash-box", { headers: denteAdminSecretRequestHeaders() });
			if (res.ok) {
				const json = await res.json();
				if (Array.isArray(json.data)) {
					setCashBoxes(json.data);
					const main = json.data.find((b: { type: string }) => b.type === "main");
					if (main) {
						setMainCashBoxId(main.id);
						if (typeof main.isShiftOpen === "boolean") setIsShiftOpen(main.isShiftOpen);
					}
				}
			}
		} catch {
			// Soft fallback if network unreachable
		}
	}, []);

	useEffect(() => {
		void loadCashBoxes();
	}, [loadCashBoxes]);

	const handleOpenShift = async () => {
		const now = Date.now();
		if (inFlightRef.current || now - lastClickTimeRef.current < 600) return;
		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		try {
			const res = await fetch("/api/cash/cash-box-all-open", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ cashierFullName: cashierName }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка открытия смены");
			}
			setIsShiftOpen(true);
			void loadCashBoxes();
		} finally {
			inFlightRef.current = false;
		}
	};

	const handleCloseShift = async () => {
		const now = Date.now();
		if (inFlightRef.current || now - lastClickTimeRef.current < 600) return;
		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		try {
			const res = await fetch("/api/cash/cash-box-all-closing", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ zReportNumber: `Z-DAILY-${Date.now()}` }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка закрытия смены");
			}
			setIsShiftOpen(false);
			void loadCashBoxes();
		} finally {
			inFlightRef.current = false;
		}
	};

	const handlePrintXReport = async () => {
		const now = Date.now();
		if (inFlightRef.current || now - lastClickTimeRef.current < 600) return;
		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		try {
			const res = await fetch("/api/cash/x-report", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка печати X-отчета");
			}
		} finally {
			inFlightRef.current = false;
		}
	};

	const { handleCashIn, handleCashOut } = useCashboxCashMovement(mainCashBoxId, () => void loadCashBoxes());

	return {
		cashBoxes,
		isShiftOpen,
		mainCashBoxId,
		loadCashBoxes,
		handleOpenShift,
		handleCloseShift,
		handlePrintXReport,
		handleCashIn,
		handleCashOut,
	};
}