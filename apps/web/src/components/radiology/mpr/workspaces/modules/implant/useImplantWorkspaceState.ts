import React, { useState, useMemo, useEffect } from "react";
import type { ImplantWorkspaceProps } from "./implantWorkspaceTypes";
import {
	getZakharovRidgeMeasurement,
	buildZakharov043SoapProtocol,
	type ZakharovEdentulousToothFdi,
} from "../../../../zakharovRidgeAutomation";
import {
	type ClinicalImplantBrandKey,
	type ClinicalImplantSpec,
	type ClinicalImplantPose,
	findClinicalImplant,
} from "../../implant/implantCatalog";
import { measureCrossSectionRidgeWidths2_4_6 } from "../../../../cbctRidgeCaliperMath";

export function useImplantWorkspaceState(props: ImplantWorkspaceProps) {
	const {
		volume, archCurve, patientDisplayName, activeCrossSection,
		jawType = "mandible", selectedBrand = "osstem",
		selectedDiameterMm = 4.0, selectedLengthMm = 10.0,
		implantEntryXOffsetMm, onChangeImplantEntryXOffsetMm,
		implantEntryDepthMm, onChangeImplantEntryDepthMm,
		implantAngulationDeg, onChangeImplantAngulationDeg,
	} = props;

	const [viewMode, setViewMode] = useState<"mpr_mode" | "pano_cross_mode" | "pano_grid_mode">("pano_grid_mode");
	const [localXOffsetMm, setLocalXOffsetMm] = useState<number>(0.0);
	const [localDepthMm, setLocalDepthMm] = useState<number>(0.5);
	const [localAngulationDeg, setLocalAngulationDeg] = useState<number>(0.0);

	const currentXOffsetMm = implantEntryXOffsetMm !== undefined ? implantEntryXOffsetMm : localXOffsetMm;
	const currentDepthMm = implantEntryDepthMm !== undefined ? implantEntryDepthMm : localDepthMm;
	const currentAngulationDeg = implantAngulationDeg !== undefined ? implantAngulationDeg : localAngulationDeg;

	const handleUpdateXOffset = (val: number) => {
		const clamped = Math.max(-4.0, Math.min(4.0, Number(val.toFixed(1))));
		if (onChangeImplantEntryXOffsetMm) onChangeImplantEntryXOffsetMm(clamped);
		else setLocalXOffsetMm(clamped);
	};

	const handleUpdateDepth = (val: number) => {
		const clamped = Math.max(-2.0, Math.min(6.0, Number(val.toFixed(1))));
		if (onChangeImplantEntryDepthMm) onChangeImplantEntryDepthMm(clamped);
		else setLocalDepthMm(clamped);
	};

	const handleUpdateAngulation = (val: number) => {
		const clamped = Math.max(-25.0, Math.min(25.0, Math.round(val)));
		if (onChangeImplantAngulationDeg) onChangeImplantAngulationDeg(clamped);
		else setLocalAngulationDeg(clamped);
	};

	const handleResetPose = () => {
		handleUpdateXOffset(0.0);
		handleUpdateDepth(0.5);
		handleUpdateAngulation(0.0);
	};

	const clinicalImplant: ClinicalImplantSpec = useMemo(() => {
		return findClinicalImplant((selectedBrand as ClinicalImplantBrandKey) || "osstem", selectedDiameterMm, selectedLengthMm);
	}, [selectedBrand, selectedDiameterMm, selectedLengthMm]);

	const clinicalPose: ClinicalImplantPose = useMemo(() => ({
		depthMm: currentDepthMm, xOffsetMm: currentXOffsetMm, angulationDeg: currentAngulationDeg,
	}), [currentDepthMm, currentXOffsetMm, currentAngulationDeg]);

	const [edentulousTooth, setEdentulousTooth] = useState<ZakharovEdentulousToothFdi>(26);
	const edentulousData = useMemo(() => getZakharovRidgeMeasurement(edentulousTooth, volume ?? undefined, archCurve), [edentulousTooth, volume, archCurve]);
	const resolvedPatient = patientDisplayName || "Пациент КЛКТ";

	const [isEditing043, setIsEditing043] = useState<boolean>(false);
	const [edited043Text, setEdited043Text] = useState<string>(() => {
		const soap = buildZakharov043SoapProtocol(edentulousData, resolvedPatient);
		return `${soap.statusLocalis}\n\n${soap.treatmentDescription}`;
	});

	useEffect(() => {
		const soap = buildZakharov043SoapProtocol(edentulousData, resolvedPatient);
		setEdited043Text(`${soap.statusLocalis}\n\n${soap.treatmentDescription}`);
	}, [edentulousData, resolvedPatient]);

	const ridgeWidths = useMemo(() => {
		if (activeCrossSection?.pixelData && activeCrossSection.widthPx && activeCrossSection.heightPx) {
			const res = measureCrossSectionRidgeWidths2_4_6(
				activeCrossSection.pixelData, activeCrossSection.widthPx, activeCrossSection.heightPx,
				activeCrossSection.pixelSpacingMm || 0.25, jawType || "mandible", activeCrossSection.rawHuData,
			);
			if (res.isDetected && res.w2Valid && res.widthW2Mm >= 3.0 && res.widthW2Mm <= 11.5) {
				return {
					w2: res.widthW2Mm, w4: res.w4Valid && res.widthW4Mm >= 3.0 ? res.widthW4Mm : res.widthW2Mm,
					w6: res.w6Valid && res.widthW6Mm >= 3.0 ? res.widthW6Mm : res.widthW2Mm,
					h: res.heightValid ? res.availableHeightMm : edentulousData.crestHeightH_Mm,
					isAdequate: res.isAdequate, isDetected: true,
				};
			}
		}
		const w2 = Math.min(11.5, Math.max(3.0, edentulousData.crestWidthW2_Mm));
		const w6 = Math.min(12.0, Math.max(3.5, edentulousData.basalWidthW6_Mm));
		const w4 = Number(((w2 + w6) / 2).toFixed(1));
		return { w2, w4, w6, h: edentulousData.crestHeightH_Mm, isAdequate: w2 >= selectedDiameterMm + 3.0 && edentulousData.crestHeightH_Mm >= selectedLengthMm + 2.0, isDetected: false };
	}, [activeCrossSection, jawType, edentulousData, selectedDiameterMm, selectedLengthMm]);

	return {
		viewMode, setViewMode, currentXOffsetMm, currentDepthMm, currentAngulationDeg,
		handleUpdateXOffset, handleUpdateDepth, handleUpdateAngulation, handleResetPose,
		clinicalImplant, clinicalPose, edentulousTooth, setEdentulousTooth, edentulousData,
		resolvedPatient, isEditing043, setIsEditing043, edited043Text, setEdited043Text, ridgeWidths,
	};
}
