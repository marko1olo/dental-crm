import { useRef, useState } from "react";
import type { TouchGestureState } from "./gestureTypes.js";

export function useMobileRadiologyState() {
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [rotationDeg, setRotationDeg] = useState<number>(0);
	const [inverted, setInverted] = useState<boolean>(false);
	const [contrast, setContrast] = useState<number>(1.0);
	const [brightness, setBrightness] = useState<number>(1.0);
	const [enhancementClahe, setEnhancementClahe] = useState<boolean>(false);

	const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
	const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [rulerCurrent, setRulerCurrent] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [savedRulerDistanceMm, setSavedRulerDistanceMm] = useState<
		number | null
	>(null);

	const [isStudiesSheetOpen, setIsStudiesSheetOpen] = useState<boolean>(false);
	const [isFilterPopoverOpen, setIsFilterPopoverOpen] =
		useState<boolean>(false);
	const [isShowcaseOpen, setIsShowcaseOpen] = useState<boolean>(false);
	const [isProtocol043Attached, setIsProtocol043Attached] =
		useState<boolean>(false);

	const viewportRef = useRef<HTMLDivElement | null>(null);
	const touchStartRef = useRef<TouchGestureState>({
		x: 0,
		y: 0,
		panX: 0,
		panY: 0,
		dist: 0,
		initialZoom: 1.0,
		lastTapTime: 0,
	});

	return {
		zoom,
		setZoom,
		pan,
		setPan,
		rotationDeg,
		setRotationDeg,
		inverted,
		setInverted,
		contrast,
		setContrast,
		brightness,
		setBrightness,
		enhancementClahe,
		setEnhancementClahe,
		isRulerActive,
		setIsRulerActive,
		rulerStart,
		setRulerStart,
		rulerCurrent,
		setRulerCurrent,
		savedRulerDistanceMm,
		setSavedRulerDistanceMm,
		isStudiesSheetOpen,
		setIsStudiesSheetOpen,
		isFilterPopoverOpen,
		setIsFilterPopoverOpen,
		isShowcaseOpen,
		setIsShowcaseOpen,
		isProtocol043Attached,
		setIsProtocol043Attached,
		viewportRef,
		touchStartRef,
	};
}
