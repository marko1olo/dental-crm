import { showToast } from "../GlobalToast";
import type { RadialMenuAnchorData } from "./OdontogramViewModals";
import type { ToothState } from "./ToothChart";

export function applyOpgOdontogramAction(
	teethMap: Record<
		number,
		import("../orthodontics/opgTopologicalEngine").OpgToothSlot
	>,
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
) {
	if (!onQuickStateChange) {
		showToast("Ошибка: нет доступа к сохранению формулы", "error");
		return;
	}
	const grouped: Partial<Record<ToothState, number[]>> = {};
	for (const [fdiStr, slot] of Object.entries(teethMap)) {
		const fdi = Number(fdiStr);
		if (Number.isNaN(fdi)) continue;
		if (!grouped[slot.status]) grouped[slot.status] = [];
		grouped[slot.status]?.push(fdi);
	}
	for (const [state, targets] of Object.entries(grouped) as [
		ToothState,
		number[],
	][]) {
		if (targets?.length) onQuickStateChange(targets, state, []);
	}
	showToast("Зубная формула обновлена по результатам анализа ОПТГ", "success");
}

export function radialSelectStateAction(
	radialMenuData: RadialMenuAnchorData | null,
	setRadialMenuData: (data: RadialMenuAnchorData | null) => void,
	state: ToothState,
	surfaces?: readonly string[] | undefined,
	onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined,
) {
	if (!radialMenuData) return;
	const finalSurfaces =
		surfaces !== undefined
			? surfaces
			: state !== "Healthy" && state !== "Missing"
				? radialMenuData.surfaces
				: undefined;
	onQuickStateChange?.(
		[radialMenuData.toothNumber],
		state,
		finalSurfaces ? [...finalSurfaces] : undefined,
	);
	setRadialMenuData(null);
}
