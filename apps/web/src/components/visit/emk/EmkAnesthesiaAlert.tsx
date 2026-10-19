import { AlertTriangle } from "lucide-react";

export interface EmkAnesthesiaAlertProps {
	readonly anamnesisText?: string;
	readonly onSelectSafeDrug?: (drugKey: string) => void;
}

export function EmkAnesthesiaAlert({
	anamnesisText,
	onSelectSafeDrug,
}: EmkAnesthesiaAlertProps) {
	if (!anamnesisText) return null;
	const lower = anamnesisText.toLowerCase();

	const hasSulfiteOrAsthma =
		lower.includes("сульфит") ||
		lower.includes("метабисульфит") ||
		lower.includes("астм") ||
		lower.includes("бронх");
	const hasCardio =
		lower.includes("сердц") ||
		lower.includes("давлен") ||
		lower.includes("ибс") ||
		lower.includes("гипертон");
	const hasLidocaine = lower.includes("лидокаин");
	const hasArticaine = lower.includes("артикаин");
	const hasNovocaine = lower.includes("новокаин") || lower.includes("прокаин");

	if (!hasSulfiteOrAsthma && !hasCardio && !hasLidocaine && !hasArticaine && !hasNovocaine) {
		return null;
	}

	const alerts: string[] = [];
	if (hasNovocaine) {
		alerts.push("⚠️ Аллергия на новокаин / прокаин в анамнезе");
	}
	if (hasSulfiteOrAsthma) {
		alerts.push("⚠️ Аллергия на сульфиты / бронхиальная астма (рекомендуется Скандонест 3% без адреналина)");
	}
	if (hasArticaine) {
		alerts.push("⚠️ Аллергия на препараты артикаинового ряда в анамнезе");
	}
	if (hasLidocaine) {
		alerts.push("⚠️ Аллергия на лидокаин в анамнезе");
	}
	if (hasCardio && !hasSulfiteOrAsthma) {
		alerts.push("⚠️ Группа кардиоваскулярного риска (щадящий режим: Скандонест 3% или адреналин <= 0.04 мг)");
	}

	const warningText = alerts.join(". ");

	return (
		<div
			className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200 min-w-0"
			role="status"
			data-testid="emk-passive-anesthesia-alert"
		>
			<div className="flex items-center gap-1.5 min-w-0">
				<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
				<span className="font-medium break-words">{warningText}</span>
			</div>
			{onSelectSafeDrug && (hasSulfiteOrAsthma || hasCardio || hasNovocaine) && (
				<button
					type="button"
					onClick={() => onSelectSafeDrug("scandonest_3")}
					className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 hover:bg-amber-300 shrink-0 cursor-pointer"
				>
					Скандонест 3%
				</button>
			)}
		</div>
	);
}
