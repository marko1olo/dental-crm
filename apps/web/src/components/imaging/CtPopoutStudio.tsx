/**
 * CtPopoutStudio.tsx — Всплывающее независимое окно 3D КЛКТ Студии (Мандат 8b <= 120 строк).
 */

import React, { useState } from "react";
import { CtPopoutHeader } from "./ctPopout/CtPopoutHeader";
import { CtPopoutQuadrants } from "./ctPopout/CtPopoutQuadrants";
import { CtPopoutFooter } from "./ctPopout/CtPopoutFooter";

export interface CtPopoutStudioProps {
	patientName?: string;
	patientCardNumber?: string;
	deviceName?: string;
	studyDate?: string;
	onClose?: () => void;
	onReturnToCrm?: () => void;
}

export function CtPopoutStudio({
	patientName = "Воронова Екатерина Сергеевна",
	patientCardNumber = "МК-2026/891",
	deviceName = "Vatech Pax-i 3D Smart (FOV 12×9 см)",
	studyDate = "08.10.2026, 14:30",
	onClose,
	onReturnToCrm,
}: CtPopoutStudioProps) {
	const [activeProjection, setActiveProjection] = useState<string>("iso");
	const [activeWlPreset, setActiveWlPreset] = useState<string>("bone");
	const [sliceIndex, setSliceIndex] = useState<number>(225);
	const [slabThicknessMm, setSlabThicknessMm] = useState<number>(1.0);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isNerveVisible, setIsNerveVisible] = useState<boolean>(true);

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen?.().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen?.().catch(() => {});
			setIsFullscreen(false);
		}
	};

	return (
		<div className="w-full h-full flex flex-col font-sans select-none overflow-hidden bg-zinc-950 text-zinc-100" data-testid="ct-popout-studio">
			<CtPopoutHeader
				patientName={patientName}
				patientCardNumber={patientCardNumber}
				deviceName={deviceName}
				studyDate={studyDate}
				activeProjection={activeProjection}
				setActiveProjection={setActiveProjection}
				isNerveVisible={isNerveVisible}
				setIsNerveVisible={setIsNerveVisible}
				isFullscreen={isFullscreen}
				toggleFullscreen={toggleFullscreen}
				onReturnToCrm={onReturnToCrm}
				onClose={onClose}
			/>
			<CtPopoutQuadrants
				activeProjection={activeProjection}
				sliceIndex={sliceIndex}
				slabThicknessMm={slabThicknessMm}
				activeWlPreset={activeWlPreset}
				isNerveVisible={isNerveVisible}
			/>
			<CtPopoutFooter
				activeWlPreset={activeWlPreset}
				setActiveWlPreset={setActiveWlPreset}
				sliceIndex={sliceIndex}
				setSliceIndex={setSliceIndex}
				slabThicknessMm={slabThicknessMm}
				setSlabThicknessMm={setSlabThicknessMm}
			/>
		</div>
	);
}
