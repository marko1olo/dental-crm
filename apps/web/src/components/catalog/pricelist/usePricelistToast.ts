/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Pricelist Toast State & Timer Hook
 */

import { useRef, useState } from "react";

export function usePricelistToast() {
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = (msg: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		setToastMessage(msg);
		toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
	};

	return { toastMessage, showToast };
}
