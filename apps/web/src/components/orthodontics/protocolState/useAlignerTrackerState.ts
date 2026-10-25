import { useEffect, useState } from "react";
import type { OrthodonticVisitProtocolWidgetProps } from "../orthoProtocolTypes";

export function useAlignerTrackerState(props: OrthodonticVisitProtocolWidgetProps) {
	const {
		currentAligner,
		totalAligners,
		currentAlignerUpper,
		currentAlignerLower,
		totalAlignersUpper,
		totalAlignersLower,
	} = props;

	const [isSplitArchAligners, setIsSplitArchAligners] = useState<boolean>(
		Boolean(
			(currentAlignerUpper !== undefined && currentAlignerLower !== undefined) ||
				(totalAlignersUpper !== undefined && totalAlignersLower !== undefined),
		),
	);
	const [alignerStep, setAlignerStep] = useState<number>(currentAligner || 1);
	const [alignerTotal, setAlignerTotal] = useState<number>(totalAligners || 36);
	const [alignerStepUpper, setAlignerStepUpper] = useState<number>(
		currentAlignerUpper || currentAligner || 1,
	);
	const [alignerTotalUpper, setAlignerTotalUpper] = useState<number>(
		totalAlignersUpper || totalAligners || 36,
	);
	const [alignerStepLower, setAlignerStepLower] = useState<number>(
		currentAlignerLower || currentAligner || 1,
	);
	const [alignerTotalLower, setAlignerTotalLower] = useState<number>(
		totalAlignersLower || totalAligners || 36,
	);
	const [alignerDaysPerStep, setAlignerDaysPerStep] = useState<number>(14);

	useEffect(() => {
		if (currentAligner !== undefined && currentAligner > 0) {
			setAlignerStep(currentAligner);
			if (!isSplitArchAligners) {
				setAlignerStepUpper(currentAligner);
				setAlignerStepLower(currentAligner);
			}
		}
	}, [currentAligner, isSplitArchAligners]);

	useEffect(() => {
		if (totalAligners !== undefined && totalAligners > 0) {
			setAlignerTotal(totalAligners);
			if (!isSplitArchAligners) {
				setAlignerTotalUpper(totalAligners);
				setAlignerTotalLower(totalAligners);
			}
		}
	}, [totalAligners, isSplitArchAligners]);

	useEffect(() => {
		if (currentAlignerUpper !== undefined && currentAlignerUpper > 0) {
			setAlignerStepUpper(currentAlignerUpper);
			setIsSplitArchAligners(true);
		}
	}, [currentAlignerUpper]);

	useEffect(() => {
		if (currentAlignerLower !== undefined && currentAlignerLower > 0) {
			setAlignerStepLower(currentAlignerLower);
			setIsSplitArchAligners(true);
		}
	}, [currentAlignerLower]);

	useEffect(() => {
		if (totalAlignersUpper !== undefined && totalAlignersUpper > 0) {
			setAlignerTotalUpper(totalAlignersUpper);
		}
	}, [totalAlignersUpper]);

	useEffect(() => {
		if (totalAlignersLower !== undefined && totalAlignersLower > 0) {
			setAlignerTotalLower(totalAlignersLower);
		}
	}, [totalAlignersLower]);

	return {
		isSplitArchAligners,
		setIsSplitArchAligners,
		alignerStep,
		setAlignerStep,
		alignerTotal,
		setAlignerTotal,
		alignerStepUpper,
		setAlignerStepUpper,
		alignerTotalUpper,
		setAlignerTotalUpper,
		alignerStepLower,
		setAlignerStepLower,
		alignerTotalLower,
		setAlignerTotalLower,
		alignerDaysPerStep,
		setAlignerDaysPerStep,
	};
}
