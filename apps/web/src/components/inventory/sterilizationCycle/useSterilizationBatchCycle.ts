/**
 * useSterilizationBatchCycle.ts — Хук управления состоянием и списанием цикла стерилизации.
 * Мандаты 8e, 8n (Soft Negative Stock), 8b (<=120 строк).
 */

import { useMemo, useState } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";
import { showToast } from "../../GlobalToast.js";
import { executeSterilizationBatchCycle } from "./sterilizationBatchCycleEngine.js";
import {
	DEFAULT_STERILIZATION_PACKAGES,
	type SterilizationBatchCycleResult,
	type SterilizationBatchPackageItem,
} from "./types.js";

export interface UseSterilizationBatchCycleOptions {
	readonly organizationId: string;
	readonly operatorName?: string | undefined;
	readonly onCycleCompleted?:
		| ((result: SterilizationBatchCycleResult) => void)
		| undefined;
	readonly onClose: () => void;
}

export function useSterilizationBatchCycle({
	organizationId,
	operatorName = "Медсестра ЦСО",
	onCycleCompleted,
	onClose,
}: UseSterilizationBatchCycleOptions) {
	const [packages, setPackages] = useState<SterilizationBatchPackageItem[]>([
		...DEFAULT_STERILIZATION_PACKAGES,
	]);
	const [indicatorPassed, setIndicatorPassed] = useState<boolean>(true);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const warehouseItems = useInventoryStore((state) => state.items);
	const deductStock = useInventoryStore((state) => state.deductStock);

	const totalPackages = useMemo(
		() => packages.reduce((sum, p) => sum + p.count, 0),
		[packages],
	);

	const updateCount = (pkgId: string, delta: number) => {
		setPackages((prev) =>
			prev.map((p) =>
				p.id === pkgId ? { ...p, count: Math.max(0, p.count + delta) } : p,
			),
		);
	};

	const previewResult = useMemo(
		() =>
			executeSterilizationBatchCycle({
				organizationId,
				packages,
				indicatorPassed,
				warehouseItems,
				operatorName,
			}),
		[organizationId, packages, indicatorPassed, warehouseItems, operatorName],
	);

	const handleConfirm = async () => {
		if (submitting || totalPackages <= 0) return;
		try {
			setSubmitting(true);
			const result = executeSterilizationBatchCycle({
				organizationId,
				packages,
				indicatorPassed,
				warehouseItems,
				operatorName,
			});
			const stockDeductions = result.deductions.map((d) => ({
				inventoryItemId: d.id,
				itemName: d.name,
				quantity: d.quantity,
				reason: "Автоклавирование (стерилизация смены)",
			}));
			await deductStock(organizationId, stockDeductions, {
				allowOverdraft: true,
			});

			try {
				const activeDesc = packages
					.filter((p) => p.count > 0)
					.map((p) => `${p.name} x${p.count}`)
					.join(", ");
				const res = await fetch("/api/sanpin/sterilization/quick-norm", {
					method: "POST",
					headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						batchSize: totalPackages,
						regime: "standard_134",
						packagingType: "kraft_self_adhesive",
						operatorName,
						itemsDescription: `Партия автоклавирования (${totalPackages} шт.): ${activeDesc}`,
					}),
				});
				if (res.ok) {
					const data = (await res.json().catch(() => null)) as { log?: { id?: string } } | null;
					if (data?.log?.id) {
						(result.cycleRecord as { id: string }).id = data.log.id;
						if (result.cycleLog) {
							(result.cycleLog as { id: string }).id = data.log.id;
						}
					}
				}
			} catch {
				// Фоновое сохранение не должно прерывать интерфейс медсестры
			}

			void useInventoryStore.getState().fetchItems(organizationId).catch(() => {});

			const hasOverdraft = result.deductions.some((d) => d.isOverdraft);
			if (hasOverdraft) {
				showToast(
					`Цикл зафиксирован: ${totalPackages} лотков/пакетов обработано. Внимание: расходники списаны в дефицит (требуется оприходование).`,
					"info",
				);
			} else {
				showToast(
					`Цикл зафиксирован: ${totalPackages} лотков/пакетов обработано. Расходники списаны со склада!`,
					"success",
				);
			}

			if (onCycleCompleted) onCycleCompleted(result);
			onClose();
		} catch (err) {
			console.error("Sterilization batch cycle failed", err);
			showToast("Ошибка сохранения цикла автоклавирования", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return {
		packages,
		indicatorPassed,
		setIndicatorPassed,
		submitting,
		totalPackages,
		updateCount,
		previewResult,
		handleConfirm,
	};
}
