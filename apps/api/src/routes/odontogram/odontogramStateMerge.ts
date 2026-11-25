import {
	mergeToothSurfaceStates,
	type ToothSurfaceKey,
	type ToothSurfaceStateMap,
} from "@dental/shared";
import {
	areToothStatesSurfaceMergeable,
	isCariesState,
	isFillingState,
	normalizeSurfaces,
} from "../../services/sync/syncGateway/syncConflictResolver.js";
import type { EndoToothClinicalData } from "./types.js";

export interface PreviousToothStateRecord {
	toothNumber: number;
	state: string;
	surfaces: unknown;
	notes: string | null;
	clinicalData: unknown | null;
	canalMeasurements: unknown | null;
	updatedAt: Date | null;
	version: number | null;
}

export interface ToothStateTransitionInput {
	toothNumbers: number[];
	state: string;
	surfaces?: string[] | null | undefined;
	notes?: string | null | undefined;
	canalMeasurements?: unknown[] | null | undefined;
	clinicalData?: EndoToothClinicalData | null | undefined;
	mobility?: number | null | undefined;
	mobilityDegree?: number | null | undefined;
	isPrimaryPediatric?: boolean | null | undefined;
	resorptionStage?: number | null | undefined;
	pediatricCrownPresent?: boolean | null | undefined;
	secondaryCariesUnderFilling?: boolean | null | undefined;
	visitId?: string | null | undefined;
	updatedAt?: string | null | undefined;
	version?: number | null | undefined;
	reason?: string | null | undefined;
}

export interface MergedToothTransition {
	effectiveState: string;
	effectiveSurfaces: string[] | null;
	effectiveClinicalData: Record<string, unknown> | null;
	effectiveNotes: string | null;
	historyNewState: string;
	historyReason: string | null;
}

export function resolveMergedToothState(params: {
	toothNumber: number;
	prev: PreviousToothStateRecord | undefined;
	prevClinical: Record<string, unknown> | null;
	incomingClinicalData: Record<string, unknown> | null;
	incomingDoctorNotes: string | null | undefined;
	incomingUpdatedAt: Date;
	data: ToothStateTransitionInput;
}): MergedToothTransition {
	const {
		toothNumber,
		prev,
		prevClinical,
		incomingClinicalData,
		incomingDoctorNotes,
		incomingUpdatedAt,
		data,
	} = params;

	const prevStateRaw = prev?.state ?? null;
	const prevStateLower = (prevStateRaw ?? "").toLowerCase();

	const isCompositeBase =
		prevStateLower === "filled" ||
		prevStateLower === "filling" ||
		Boolean(prevClinical?.hasFilling) ||
		Boolean(prevClinical?.fillingSurfaces);

	const isOrthopedicBase =
		prevStateLower === "crown" ||
		prevStateLower === "temporary_crown" ||
		prevStateLower === "planned_crown" ||
		prevStateLower === "bridge" ||
		prevStateLower === "bridge_abutment" ||
		prevStateLower === "implant" ||
		prevStateLower === "planned_implant" ||
		prevStateLower === "veneer" ||
		prevStateLower === "inlay" ||
		prevStateLower === "onlay" ||
		prevStateLower === "pin" ||
		prevStateLower === "root_canal_treated" ||
		Boolean(prevClinical?.hasCrown) ||
		Boolean(prevClinical?.hasImplant) ||
		(Boolean(prevClinical?.baseState) &&
			prevClinical?.baseState !== "Filled" &&
			prevClinical?.baseState !== "filling");

	const incomingLower = data.state.toLowerCase();
	const isPathologyDefect =
		incomingLower === "caries" ||
		incomingLower === "pulpitis" ||
		incomingLower === "periodontitis" ||
		incomingLower === "wedge" ||
		incomingLower === "attrition" ||
		incomingLower === "calculus" ||
		incomingLower === "crack" ||
		incomingLower === "fracture" ||
		incomingLower === "resorption" ||
		incomingLower.startsWith("mobility") ||
		incomingLower.startsWith("furcation");

	let effectiveState = data.state;
	let effectiveSurfaces = data.surfaces ? normalizeSurfaces(data.surfaces) : null;
	let effectiveClinicalData: Record<string, unknown> | null =
		incomingClinicalData ?? prevClinical ?? null;
	const effectiveNotes: string | null =
		incomingDoctorNotes !== undefined
			? incomingDoctorNotes
			: prev?.notes && !prev.notes.trim().startsWith("{")
				? prev.notes
				: null;

	let historyNewState = data.state;
	let historyReason = data.clinicalData
		? "Эндодонтический протокол / обработка каналов"
		: data.reason || null;

	const rawPrevSurfaces = prev?.surfaces ? normalizeSurfaces(prev.surfaces) : [];
	const clinicalFillingSurfaces = Array.isArray(prevClinical?.fillingSurfaces)
		? normalizeSurfaces(prevClinical.fillingSurfaces as string[])
		: [];
	const prevSurfaces =
		rawPrevSurfaces.length > 0
			? rawPrevSurfaces
			: clinicalFillingSurfaces.length > 0
				? clinicalFillingSurfaces
				: isFillingState(prevStateLower)
					? ["occlusal"]
					: [];
	const incomingSurfaces = data.surfaces ? normalizeSurfaces(data.surfaces) : [];
	const isSurfaceMergeable =
		Boolean(prev) &&
		!isOrthopedicBase &&
		areToothStatesSurfaceMergeable(data.state, prevStateLower) &&
		(incomingSurfaces.length > 0 || isCariesState(incomingLower)) &&
		prevSurfaces.length > 0;

	if (isOrthopedicBase && isPathologyDefect) {
		const existingBaseState =
			typeof prevClinical?.baseState === "string" &&
			prevClinical.baseState.trim().length > 0
				? prevClinical.baseState
				: null;
		const baseStateName =
			existingBaseState ||
			(prevStateLower === "crown" || prevClinical?.hasCrown
				? "Crown"
				: prevStateLower === "implant" || prevClinical?.hasImplant
					? "Implant"
					: prevStateLower === "bridge" || prevStateLower === "bridge_abutment"
						? "Bridge"
						: prevStateLower === "veneer"
							? "Veneer"
							: prevStateLower === "inlay" || prevStateLower === "onlay"
								? "Inlay"
								: prevStateLower === "root_canal_treated"
									? "Root_Canal_Treated"
									: prevStateRaw || "Crown");

		const existingConditions: string[] = Array.isArray(prevClinical?.conditions)
			? prevClinical.conditions.filter((c): c is string => typeof c === "string")
			: [];
		if (!existingConditions.includes(data.state)) {
			existingConditions.push(data.state);
		}

		effectiveClinicalData = {
			...(prevClinical || {}),
			...(data.clinicalData || {}),
			baseState: baseStateName,
			hasCrown:
				prevStateLower === "crown" ||
				Boolean(prevClinical?.hasCrown) ||
				baseStateName === "Crown",
			hasImplant:
				prevStateLower === "implant" ||
				Boolean(prevClinical?.hasImplant) ||
				baseStateName === "Implant",
			hasTreatedCanals:
				prevStateLower === "root_canal_treated" ||
				Boolean(prevClinical?.hasTreatedCanals),
			hasSecondaryCaries:
				incomingLower === "caries"
					? true
					: Boolean(prevClinical?.hasSecondaryCaries),
			condition:
				incomingLower === "caries"
					? "defective"
					: prevClinical?.condition || "adequate",
			conditions: existingConditions,
			defectSurfaces: data.surfaces || prevClinical?.defectSurfaces || null,
			lastPathology: data.state,
			lastPathologyAt: incomingUpdatedAt.toISOString(),
		};
		effectiveState = baseStateName;
		historyNewState = `${baseStateName} + ${data.state}`;
		historyReason =
			data.reason ||
			`Выявлена сопутствующая патология: ${data.state} на конструкции ${baseStateName} (базис сохранен)`;
	} else if (isSurfaceMergeable) {
		const intersection = incomingSurfaces.filter((s) =>
			prevSurfaces.includes(s),
		);
		const mergedSurfaces = normalizeSurfaces([
			...prevSurfaces,
			...incomingSurfaces,
		]);
		effectiveSurfaces = mergedSurfaces;

		const prevFillingSurfaces: string[] = Array.isArray(
			prevClinical?.fillingSurfaces,
		)
			? normalizeSurfaces(prevClinical.fillingSurfaces)
			: isFillingState(prevStateLower)
				? prevSurfaces
				: [];
		const incomingFillingSurfaces: string[] = isFillingState(incomingLower)
			? incomingSurfaces
			: [];
		const combinedFillingSurfaces = normalizeSurfaces([
			...(isCariesState(incomingLower)
				? prevFillingSurfaces.filter((s) => !intersection.includes(s))
				: prevFillingSurfaces),
			...incomingFillingSurfaces,
		]);

		const prevDefectSurfaces: string[] = Array.isArray(
			prevClinical?.defectSurfaces,
		)
			? normalizeSurfaces(prevClinical.defectSurfaces)
			: isCariesState(prevStateLower)
				? prevSurfaces
				: [];
		const incomingDefectSurfaces: string[] = isCariesState(incomingLower)
			? incomingSurfaces
			: [];
		const curedSurfaceSet = isFillingState(incomingLower)
			? new Set(incomingSurfaces)
			: new Set<string>();
		const combinedDefectSurfaces = normalizeSurfaces([
			...prevDefectSurfaces.filter((s) => !curedSurfaceSet.has(s)),
			...incomingDefectSurfaces,
		]);

		const hasFilling =
			combinedFillingSurfaces.length > 0 ||
			isFillingState(incomingLower) ||
			(isFillingState(prevStateLower) && !isCariesState(incomingLower));
		const hasCaries =
			combinedDefectSurfaces.length > 0 ||
			(isCariesState(incomingLower) && incomingDefectSurfaces.length === 0);
		const newSecondaryCariesDetected =
			intersection.length > 0 &&
			isCariesState(incomingLower) &&
			(isFillingState(prevStateLower) || prevFillingSurfaces.length > 0);
		const hasSecondaryCaries = isFillingState(incomingLower)
			? combinedDefectSurfaces.length > 0 &&
				(Boolean(prevClinical?.hasSecondaryCaries) ||
					combinedDefectSurfaces.some((s) => prevFillingSurfaces.includes(s)))
			: newSecondaryCariesDetected || Boolean(prevClinical?.hasSecondaryCaries);

		const prevSurfaceMap: ToothSurfaceStateMap = {};
		for (const s of prevFillingSurfaces) {
			const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
			if (key) prevSurfaceMap[key] = "filling";
		}
		for (const s of prevDefectSurfaces) {
			const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
			if (key) prevSurfaceMap[key] = "caries";
		}
		const incomingSurfaceMap: ToothSurfaceStateMap = {};
		if (isFillingState(incomingLower)) {
			for (const s of incomingSurfaces) {
				const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
				if (key) incomingSurfaceMap[key] = "filling";
			}
		} else if (isCariesState(incomingLower)) {
			for (const s of incomingSurfaces) {
				const key = s.trim().toUpperCase()[0] as ToothSurfaceKey | undefined;
				if (key) {
					incomingSurfaceMap[key] = intersection.includes(s)
						? "secondary_caries"
						: "caries";
				}
			}
		}
		const surfaceStateMap = mergeToothSurfaceStates(
			prevSurfaceMap,
			incomingSurfaceMap,
		);

		if (
			combinedFillingSurfaces.length > 0 &&
			combinedDefectSurfaces.length > 0
		) {
			effectiveState = "Filled + Caries";
		} else if (isCariesState(incomingLower)) {
			effectiveState = data.state;
		} else if (isFillingState(incomingLower)) {
			effectiveState =
				combinedDefectSurfaces.length > 0 ? "Filled + Caries" : data.state;
		}

		const resolvedBaseState =
			isCompositeBase ||
			isFillingState(incomingLower) ||
			combinedFillingSurfaces.length > 0
				? "Filled"
				: typeof prevClinical?.baseState === "string"
					? prevClinical.baseState
					: undefined;

		effectiveClinicalData = {
			...(prevClinical || {}),
			...(data.clinicalData || {}),
			baseState: resolvedBaseState,
			fillingSurfaces:
				combinedFillingSurfaces.length > 0
					? combinedFillingSurfaces
					: undefined,
			defectSurfaces:
				combinedDefectSurfaces.length > 0 ? combinedDefectSurfaces : undefined,
			surfaceStateMap,
			hasFilling,
			hasCaries,
			hasSecondaryCaries,
			compositeCondition: hasSecondaryCaries ? "defective" : "adequate",
			lastPathology: isCariesState(incomingLower)
				? data.state
				: prevClinical?.lastPathology,
			lastPathologyAt: incomingUpdatedAt.toISOString(),
		};

		historyNewState =
			effectiveState === "Filled + Caries"
				? `Filled [${combinedFillingSurfaces.join(",")}] + Caries [${combinedDefectSurfaces.join(",")}]`
				: `${prevStateRaw} [${prevSurfaces.join(",")}] + ${data.state} [${incomingSurfaces.join(",")}]`;
		historyReason =
			data.reason ||
			`Surface Union Merge (MODBL): сохранена пломба на [${combinedFillingSurfaces.join(",")}], кариес на [${combinedDefectSurfaces.join(",")}] (состояние: ${effectiveState})`;
	} else if (
		!isPathologyDefect &&
		(incomingLower === "crown" ||
			incomingLower === "implant" ||
			incomingLower === "filled" ||
			incomingLower === "veneer" ||
			incomingLower === "inlay")
	) {
		const prevConditions = Array.isArray(prevClinical?.conditions)
			? prevClinical.conditions.filter((c): c is string => typeof c === "string")
			: [];
		const cured = [...prevConditions];
		if (prevStateRaw && isPathologyDefect && !cured.includes(prevStateRaw)) {
			cured.push(prevStateRaw);
		}

		effectiveClinicalData = {
			...(prevClinical || {}),
			...(data.clinicalData || {}),
			baseState: data.state,
			hasCrown: incomingLower === "crown",
			hasImplant: incomingLower === "implant",
			hasFilling: incomingLower === "filled",
			hasCaries: false,
			hasSecondaryCaries: false,
			defectSurfaces: undefined,
			condition: "adequate",
			compositeCondition: "adequate",
			conditions: [],
			curedConditions: cured,
			restoredAt: incomingUpdatedAt.toISOString(),
			fillingSurfaces:
				incomingLower === "filled" ? incomingSurfaces : undefined,
		};
		historyReason =
			data.reason || `Восстановление / ортопедическое лечение (${data.state})`;
	}

	const isPrimaryTooth =
		(toothNumber >= 51 && toothNumber <= 85) ||
		Boolean(data.isPrimaryPediatric) ||
		Boolean(prevClinical?.isPrimaryPediatric);
	const effectiveMobility =
		data.mobility ??
		data.mobilityDegree ??
		data.clinicalData?.mobility ??
		data.clinicalData?.mobilityDegree ??
		prevClinical?.mobility ??
		prevClinical?.mobilityDegree;
	const effectiveResorption =
		data.resorptionStage ??
		data.clinicalData?.resorptionStage ??
		prevClinical?.resorptionStage;
	const effectivePediatricCrown =
		data.pediatricCrownPresent ??
		data.clinicalData?.pediatricCrownPresent ??
		prevClinical?.pediatricCrownPresent;
	const effectiveSecondaryCaries =
		data.secondaryCariesUnderFilling ??
		data.clinicalData?.secondaryCariesUnderFilling ??
		prevClinical?.secondaryCariesUnderFilling;

	if (
		isPrimaryTooth ||
		effectiveMobility !== undefined ||
		effectiveResorption !== undefined ||
		effectivePediatricCrown !== undefined ||
		effectiveSecondaryCaries !== undefined
	) {
		const existingObj = effectiveClinicalData || prevClinical || {};
		effectiveClinicalData = {
			...existingObj,
			...(isPrimaryTooth ? { isPrimaryPediatric: true } : {}),
			...(effectiveMobility !== undefined
				? { mobility: effectiveMobility, mobilityDegree: effectiveMobility }
				: {}),
			...(effectiveResorption !== undefined
				? { resorptionStage: effectiveResorption }
				: {}),
			...(effectivePediatricCrown !== undefined
				? { pediatricCrownPresent: effectivePediatricCrown }
				: {}),
			...(effectiveSecondaryCaries !== undefined
				? { secondaryCariesUnderFilling: effectiveSecondaryCaries }
				: {}),
		};
	}

	return {
		effectiveState,
		effectiveSurfaces,
		effectiveClinicalData,
		effectiveNotes,
		historyNewState,
		historyReason,
	};
}
