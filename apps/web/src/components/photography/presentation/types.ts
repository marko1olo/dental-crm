/**
 * Patient Presentation Screen Types & Color Palette
 */

import { PresentationComparisonMode, PresentationSplitDirection } from '../presentationSyncProtocol';

export interface PresentationColors {
	bg: string;
	cardBg: string;
	viewportBg: string;
	text: string;
	titleColor: string;
	mutedText: string;
	headerBg: string;
	headerBorder: string;
	subBarBg: string;
	subBarBorder: string;
	controlsBg: string;
	controlsBorder: string;
	ghostBg: string;
	ghostBorder: string;
	ghostColor: string;
	frameBorder: string;
}

export interface PatientPresentationState {
	beforeImageUrl: string;
	afterImageUrl: string;
	beforeLabel: string;
	afterLabel: string;
	beforeShade?: string | undefined;
	afterShade?: string | undefined;
	clinicName: string;
	patientName: string;
	theme: 'dark' | 'light';
	mode: PresentationComparisonMode;
	splitDirection: PresentationSplitDirection;
	splitPercent: number;
	blendOpacity: number;
	isFullscreen: boolean;
	colors: PresentationColors;
}
