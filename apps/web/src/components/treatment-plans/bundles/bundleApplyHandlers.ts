import type React from "react";
import { showToast } from "../../GlobalToast";
import {
	type ClinicalBundleDefinition,
	createBundleInvoiceItems,
	createBundlePlanItems,
} from "../treatmentPlanBundlesEngine";
import type { ClinicalServiceBundlesModalProps } from "./bundlesModalTypes";

export interface BundleApplyContext {
	readonly inFlightRef: React.MutableRefObject<boolean>;
	readonly selectedTooth: number;
	readonly selectedItemsMap: Record<string, string[]>;
	readonly setJustAddedBundleId: (id: string | null) => void;
	readonly onApplyToPlan?: ClinicalServiceBundlesModalProps["onApplyToPlan"];
	readonly onApplyToInvoice?: ClinicalServiceBundlesModalProps["onApplyToInvoice"];
}

export function executeApplyPlan(
	b: ClinicalBundleDefinition,
	ctx: BundleApplyContext,
) {
	if (ctx.inFlightRef.current) return;
	ctx.inFlightRef.current = true;
	try {
		const items = createBundlePlanItems(b.id, {
			toothNumber: b.requiresTooth ? ctx.selectedTooth : undefined,
			selectedItemIds: ctx.selectedItemsMap[b.id] ?? b.items.map((it) => it.id),
		});
		if (!items.length) {
			showToast("Выберите хотя бы одну позицию из пакета", "warning");
			return;
		}
		ctx.onApplyToPlan?.(items, b, b.requiresTooth ? ctx.selectedTooth : undefined);
		ctx.setJustAddedBundleId(b.id);
		setTimeout(() => ctx.setJustAddedBundleId(null), 2500);
		showToast(
			`Пакет «${b.shortTitle}» добавлен в план: ${items.reduce((s, it) => s + it.priceRub, 0).toLocaleString("ru-RU")} ₽!`,
			"success",
		);
	} finally {
		setTimeout(() => {
			ctx.inFlightRef.current = false;
		}, 350);
	}
}

export function executeApplyInvoice(
	b: ClinicalBundleDefinition,
	ctx: BundleApplyContext,
) {
	if (ctx.inFlightRef.current) return;
	ctx.inFlightRef.current = true;
	try {
		const items = createBundleInvoiceItems(b.id, {
			toothNumber: b.requiresTooth ? ctx.selectedTooth : undefined,
			selectedItemIds: ctx.selectedItemsMap[b.id] ?? b.items.map((it) => it.id),
		});
		if (!items.length) {
			showToast("Выберите хотя бы одну позицию из пакета", "warning");
			return;
		}
		ctx.onApplyToInvoice?.(items, b, b.requiresTooth ? ctx.selectedTooth : undefined);
		ctx.setJustAddedBundleId(b.id);
		setTimeout(() => ctx.setJustAddedBundleId(null), 2500);
		showToast(
			`Пакет «${b.shortTitle}» добавлен в счет: ${items.reduce((s, it) => s + it.priceRub, 0).toLocaleString("ru-RU")} ₽!`,
			"success",
		);
	} finally {
		setTimeout(() => {
			ctx.inFlightRef.current = false;
		}, 350);
	}
}
