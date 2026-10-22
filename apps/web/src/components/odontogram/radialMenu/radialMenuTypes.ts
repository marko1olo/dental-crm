import type React from "react";
import type { ToothState } from "../ToothChart";

export interface RadialMenuItem {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly state?: ToothState | undefined;
	readonly icon: React.ReactNode;
	readonly color: string;
	readonly bgGradient: string;
	readonly hotkey: string;
	readonly action?: () => void;
}

export interface ToothRadialMenuProps {
	readonly toothNumber: number;
	readonly anchorRect: { x: number; y: number; width: number; height: number };
	readonly currentState?: ToothState | undefined;
	readonly iropz?: number | undefined;
	readonly surfaces?: readonly string[] | undefined;
	readonly onSelectState: (state: ToothState, surfaces?: readonly string[], subType?: string) => void;
	readonly onSelectSurfaces?: (surfaces: readonly string[]) => void;
	readonly onOpenEndo?: () => void;
	readonly onOpenTherapy?: () => void;
	readonly onAddToInvoice?: () => void;
	readonly onClose: () => void;
}

export interface ToothRadialMobileSheetProps {
	readonly menuRef: React.RefObject<HTMLDivElement | null>;
	readonly dragOffsetY: number;
	readonly isDraggingSheet: boolean;
	readonly handleSheetTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
	readonly handleSheetTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
	readonly handleSheetTouchEnd: () => void;
	readonly toothNumber: number;
	readonly currentState: ToothState;
	readonly items: readonly RadialMenuItem[];
	readonly selectedSurfaces: readonly string[];
	readonly surfaces?: readonly string[] | undefined;
	readonly setSelectedSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	readonly onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	readonly toggleSurface: (surf: string) => void;
	readonly handleSelectStateWithHaptic: (state: ToothState, surfs?: readonly string[], subType?: string) => void;
	readonly onSelectState: (state: ToothState, surfaces?: readonly string[], subType?: string) => void;
	readonly iropz?: number | undefined;
	readonly onOpenTherapy?: (() => void) | undefined;
	readonly onAddToInvoice?: (() => void) | undefined;
	readonly onOpenEndo?: (() => void) | undefined;
	readonly toothScanThumbnail?: { id: string; url: string; title: string } | null | undefined;
	readonly onOpenRvg?: (() => void) | undefined;
	readonly onClose: () => void;
}
