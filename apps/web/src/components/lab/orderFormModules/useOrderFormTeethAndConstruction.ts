import { useState } from "react";
import type { JawScope } from "../labMath";

export interface UseTeethParams {
	initialJawScope?: JawScope | null;
	initialTeeth?: (number | string)[];
	initialToothFdi?: string | number;
	initialOrder?: {
		selectedTeeth?: number[];
		toothFdi?: string;
		jawScope?: JawScope | null;
	} | null;
}

function getInitialSelectedTeeth(params?: UseTeethParams): number[] {
	if (params?.initialOrder?.selectedTeeth && params.initialOrder.selectedTeeth.length > 0) {
		return params.initialOrder.selectedTeeth;
	}
	if (params?.initialTeeth && params.initialTeeth.length > 0) {
		return params.initialTeeth
			.map((t) => (typeof t === "number" ? t : Number.parseInt(String(t), 10)))
			.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
	}
	if (params?.initialOrder?.toothFdi) {
		return params.initialOrder.toothFdi
			.split(/[\s,;-]+/)
			.map((t) => Number.parseInt(t, 10))
			.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
	}
	if (params?.initialToothFdi) {
		const toothNum =
			typeof params.initialToothFdi === "number"
				? params.initialToothFdi
				: Number.parseInt(String(params.initialToothFdi), 10);
		if (!Number.isNaN(toothNum) && toothNum >= 11 && toothNum <= 85) {
			return [toothNum];
		}
	}
	return [];
}

export function useOrderFormTeethAndConstruction(params?: UseTeethParams) {
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(() => getInitialSelectedTeeth(params));
	const [jawScope, setJawScope] = useState<JawScope | null>(
		params?.initialOrder?.jawScope || params?.initialJawScope || null,
	);
	const [constructionType, setConstructionType] = useState<string>("single_crown");
	const [material, setMaterial] = useState<string>("zirconia_multilayer");
	const [impressionType, setImpressionType] = useState<string>("a_silicone");

	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	return {
		selectedTeeth,
		setSelectedTeeth,
		jawScope,
		setJawScope,
		constructionType,
		setConstructionType,
		material,
		setMaterial,
		impressionType,
		setImpressionType,
		toggleTooth,
		selectQuadrant,
	};
}
