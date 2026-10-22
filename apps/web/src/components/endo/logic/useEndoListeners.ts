import { useEffect } from "react";
import type { EndoCanalData } from "@dental/shared";
import { showToast } from "../../GlobalToast";

interface UseEndoListenersProps {
	readonly isOpen: boolean;
	readonly activeTooth: number;
	readonly setCanals: React.Dispatch<React.SetStateAction<EndoCanalData[]>>;
	readonly onClose: () => void;
}

export function useEndoListeners({
	isOpen,
	activeTooth,
	setCanals,
	onClose,
}: UseEndoListenersProps) {
	useEffect(() => {
		if (!isOpen) return;

		const handleMeasuredWl = (e: Event) => {
			const customEvent = e as CustomEvent<{ toothCode?: string; lengthMm: number }>;
			const { toothCode, lengthMm } = customEvent.detail || {};
			if (toothCode && Number(toothCode) !== activeTooth) return;

			setCanals((prev) => {
				if (prev.length === 0) return prev;
				const updated = [...prev];
				const targetIdx = updated.findIndex((c) => !c.workingLengthMm || Number(c.workingLengthMm) === 0);
				const applyIdx = targetIdx >= 0 ? targetIdx : 0;
				if (updated[applyIdx]) {
					updated[applyIdx] = { ...updated[applyIdx], workingLengthMm: Math.round(lengthMm * 2) / 2 };
				}
				return updated;
			});
			showToast(`Длина ${lengthMm.toFixed(1)} мм перенесена с визиографа в канал!`, "success");
		};

		const handleEndoCanalsUpdated = (e: Event) => {
			const customEvent = e as CustomEvent<{ toothFdi?: number; patientId?: string; canals?: EndoCanalData[] }>;
			const { toothFdi, canals: updatedCanals } = customEvent.detail || {};
			if (toothFdi && toothFdi !== activeTooth) return;
			if (updatedCanals && updatedCanals.length > 0) {
				setCanals(updatedCanals.map((c) => ({ ...c })));
				showToast(`Параметры каналов зуба #${activeTooth} синхронизированы с 3D КЛКТ Компасом!`, "success");
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		window.addEventListener("dente-endo-wl-measured", handleMeasuredWl);
		window.addEventListener("dente-endo-canals-updated", handleEndoCanalsUpdated);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("dente-endo-wl-measured", handleMeasuredWl);
			window.removeEventListener("dente-endo-canals-updated", handleEndoCanalsUpdated);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, activeTooth, setCanals, onClose]);
}
