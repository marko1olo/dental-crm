/**
 * apps/web/src/components/odontogram/navigation/toothKeyboardNavigation.ts
 *
 * DENTE Dental CRM — Keyboard Traversal and Spatial Navigation for Teeth.
 * Complies with Mandates 8e (Doctor Autonomy) & 8b (Clean Modular Architecture).
 */

import {
	LOWER_TEETH_ADULT,
	LOWER_TEETH_PEDIATRIC,
	UPPER_TEETH_ADULT,
	UPPER_TEETH_PEDIATRIC,
} from "@dental/shared";

export type ToothNavigationDirection =
	| "left"
	| "right"
	| "up"
	| "down"
	| "home"
	| "end"
	| "tab"
	| "shift-tab";

export function getNextFocusedTooth(
	currentTooth: number,
	direction: ToothNavigationDirection,
	isPediatric = false,
): number {
	const topRow: readonly number[] = isPediatric ? UPPER_TEETH_PEDIATRIC : UPPER_TEETH_ADULT;
	const bottomRow: readonly number[] = isPediatric ? LOWER_TEETH_PEDIATRIC : LOWER_TEETH_ADULT;
	const allTeeth: readonly number[] = [...topRow, ...bottomRow];

	const isTop = topRow.includes(currentTooth);
	const currentRow: readonly number[] = isTop ? topRow : bottomRow;
	const indexInRow = currentRow.indexOf(currentTooth);

	if (direction === "left") {
		if (indexInRow <= 0) return currentTooth;
		return currentRow[indexInRow - 1] ?? currentTooth;
	}

	if (direction === "right") {
		if (indexInRow >= currentRow.length - 1) return currentTooth;
		return currentRow[indexInRow + 1] ?? currentTooth;
	}

	if (direction === "home") {
		return currentRow[0] ?? currentTooth;
	}

	if (direction === "end") {
		return currentRow[currentRow.length - 1] ?? currentTooth;
	}

	if (direction === "up") {
		if (isTop) return currentTooth;
		return topRow[indexInRow] ?? currentTooth;
	}

	if (direction === "down") {
		if (!isTop) return currentTooth;
		return bottomRow[indexInRow] ?? currentTooth;
	}

	if (direction === "tab") {
		const totalIdx = allTeeth.indexOf(currentTooth);
		if (totalIdx === -1) return allTeeth[0] ?? currentTooth;
		const nextIdx = (totalIdx + 1) % allTeeth.length;
		return allTeeth[nextIdx] ?? currentTooth;
	}

	if (direction === "shift-tab") {
		const totalIdx = allTeeth.indexOf(currentTooth);
		if (totalIdx === -1)
			return allTeeth[allTeeth.length - 1] ?? currentTooth;
		const prevIdx = (totalIdx - 1 + allTeeth.length) % allTeeth.length;
		return allTeeth[prevIdx] ?? currentTooth;
	}

	return currentTooth;
}
