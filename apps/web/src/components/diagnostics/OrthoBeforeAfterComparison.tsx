import React, { useState } from "react";
import {
	ORTHODONTIC_8_ANGLES,
	type OrthodonticAngleId,
	type OrthodonticPhotoSession,
} from "@dental/shared";
import { OrthoSideBySideView } from "./orthoModal/OrthoSideBySideView";
import { OrthoSliderSplitView } from "./orthoModal/OrthoSliderSplitView";
import { OrthoCompareHeader } from "./orthoModal/OrthoCompareHeader";
import { OrthoCompareAnglePills } from "./orthoModal/OrthoCompareAnglePills";

export interface OrthoBeforeAfterComparisonProps {
	session: OrthodonticPhotoSession;
	previousSession?: OrthodonticPhotoSession | null | undefined;
	onUploadAngle: (angleId: OrthodonticAngleId) => void;
	onCloseCompare: () => void;
}

export const OrthoBeforeAfterComparison: React.FC<OrthoBeforeAfterComparisonProps> = ({
	session,
	previousSession,
	onUploadAngle,
	onCloseCompare,
}) => {
	const [selectedAngleId, setSelectedAngleId] = useState<OrthodonticAngleId>("extraoral_face_smile");
	const [compareViewMode, setCompareViewMode] = useState<"side_by_side" | "slider">("side_by_side");
	const [sliderPosition, setSliderPosition] = useState<number>(50);

	const comparisonAngles = ORTHODONTIC_8_ANGLES.filter((a) =>
		[
			"extraoral_face_smile",
			"intraoral_frontal_occlusion",
			"extraoral_profile",
			"intraoral_right_lateral",
			"intraoral_left_lateral",
		].includes(a.id),
	);

	const activeAngle = ORTHODONTIC_8_ANGLES.find((a) => a.id === selectedAngleId) || ORTHODONTIC_8_ANGLES[1]!;
	const currentImageUrl = session.slots[selectedAngleId]?.imageUrl || null;
	const beforeImageUrl = previousSession?.slots?.[selectedAngleId]?.imageUrl || null;

	return (
		<div
			data-testid="ortho-before-after-comparison-panel"
			className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3 my-2"
		>
			<OrthoCompareHeader
				activeAngle={activeAngle}
				compareViewMode={compareViewMode}
				setCompareViewMode={setCompareViewMode}
				onCloseCompare={onCloseCompare}
			/>

			<OrthoCompareAnglePills
				comparisonAngles={comparisonAngles}
				selectedAngleId={selectedAngleId}
				session={session}
				onSelectAngle={setSelectedAngleId}
			/>

			{compareViewMode === "side_by_side" ? (
				<OrthoSideBySideView
					selectedAngleId={selectedAngleId}
					beforeImageUrl={beforeImageUrl}
					currentImageUrl={currentImageUrl}
					onUploadAngle={onUploadAngle}
				/>
			) : (
				<OrthoSliderSplitView
					beforeImageUrl={beforeImageUrl}
					currentImageUrl={currentImageUrl}
					sliderPosition={sliderPosition}
					setSliderPosition={setSliderPosition}
				/>
			)}
		</div>
	);
};

export default OrthoBeforeAfterComparison;
