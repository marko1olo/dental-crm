import { useState, useCallback } from "react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";
import type { MobileShiftConsumableItem } from "./types";

const DEFAULT_CONSUMABLES: readonly MobileShiftConsumableItem[] = [
	{ id: "mat-ultracain", name: "Ультракаин Д-С форте", category: "Анестезия", unitName: "карпул", deductedCount: 4, stockRemaining: 46 },
	{ id: "mat-filtek", name: "Filtek Ultimate Body A2", category: "Композит", unitName: "доз", deductedCount: 2, stockRemaining: 6 },
	{ id: "mat-kraft-pack", name: "Крафт-пакет базовый терапевтический", category: "Стерилизация", unitName: "наборов", deductedCount: 5, stockRemaining: 25 },
	{ id: "mat-gloves", name: "Перчатки смотровые нитриловые M", category: "Расходные материалы", unitName: "пар", deductedCount: 6, stockRemaining: 94 },
];

export function useMobileShiftConsumables() {
	const [consumables, setConsumables] = useState<MobileShiftConsumableItem[]>(() => {
		try {
			const saved = safeLocalStorageGetItem("dente_mobile_shift_consumables");
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch {}
		return [...DEFAULT_CONSUMABLES];
	});

	const handleAdjustConsumable = useCallback((id: string, delta: number) => {
		setConsumables((prev) => {
			const updated = prev.map((item) => {
				if (item.id === id) {
					return {
						...item,
						deductedCount: Math.max(0, item.deductedCount + delta),
						stockRemaining: Math.max(0, item.stockRemaining - delta),
					};
				}
				return item;
			});
			try {
				safeLocalStorageSetItem("dente_mobile_shift_consumables", JSON.stringify(updated));
			} catch {}
			return updated;
		});
		showToast(delta > 0 ? "Списание увеличено" : "Списание скорректировано", "info", 1500);
	}, []);

	return { consumables, handleAdjustConsumable };
}
