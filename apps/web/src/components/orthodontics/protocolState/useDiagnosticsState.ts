import { useState } from "react";
import type {
	AnbClass,
	AngleClass,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
} from "@dental/shared";

export function useDiagnosticsState() {
	const [activeAttachmentPreset, setActiveAttachmentPreset] = useState<string | null>(null);
	const [alignerSetIssued, setAlignerSetIssued] = useState<{ count: number; days: number } | null>(null);

	const [angleClass, setAngleClass] = useState<AngleClass>("class_1");
	const [anbClass, setAnbClass] = useState<AnbClass>("class_1");
	const [anbAngle, setAnbAngle] = useState<number>(2.0);
	const [plateActivationTurns, setPlateActivationTurns] = useState<number>(1);

	const [sagittalAnomaly, setSagittalAnomaly] = useState<SagittalAnomaly>("norm");
	const [sagittalGapMm, setSagittalGapMm] = useState<number>(2);
	const [verticalAnomaly, setVerticalAnomaly] = useState<VerticalAnomaly>("norm");
	const [transversalAnomaly, setTransversalAnomaly] = useState<TransversalAnomaly>("norm");
	const [tmjStatus, setTmjStatus] = useState<TmjStatus>("norm");

	const [isPhotoProtocolOpen, setIsPhotoProtocolOpen] = useState<boolean>(false);
	const [isPhotoProtocolCompleted, setIsPhotoProtocolCompleted] = useState<boolean>(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);

	return {
		activeAttachmentPreset,
		setActiveAttachmentPreset,
		alignerSetIssued,
		setAlignerSetIssued,
		angleClass,
		setAngleClass,
		anbClass,
		setAnbClass,
		anbAngle,
		setAnbAngle,
		plateActivationTurns,
		setPlateActivationTurns,
		sagittalAnomaly,
		setSagittalAnomaly,
		sagittalGapMm,
		setSagittalGapMm,
		verticalAnomaly,
		setVerticalAnomaly,
		transversalAnomaly,
		setTransversalAnomaly,
		tmjStatus,
		setTmjStatus,
		isPhotoProtocolOpen,
		setIsPhotoProtocolOpen,
		isPhotoProtocolCompleted,
		setIsPhotoProtocolCompleted,
		isCephModalOpen,
		setIsCephModalOpen,
	};
}
