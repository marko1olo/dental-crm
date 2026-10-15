/**
 * DENTE Dental CRM — Patient Presentation Screen & Multi-Display Sync Protocol
 *
 * Mandate Compliance:
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons, non-blocking flow)
 * - Mandate 8k: Anti-Simulator Law (Rapid Before/After Comparison & Presentation)
 * - Clinical Isolation: 0 prices, 0 clinical notes, 0 CRM toolbars on patient display
 * - Real-time synchronization via BroadcastChannel across browser tabs and secondary monitors
 */

export const DENTE_PRESENTATION_SYNC_CHANNEL = 'dente_presentation_sync';
export const DENTE_PRESENTATION_STORAGE_KEY = 'dente_presentation_cached_state';

export type PresentationComparisonMode = 'split' | 'side_by_side' | 'blend';
export type PresentationSplitDirection = 'vertical' | 'horizontal';

export interface PresentationSyncPayload {
	beforeImageUrl?: string | undefined;
	afterImageUrl?: string | undefined;
	beforeLabel?: string | undefined;
	afterLabel?: string | undefined;
	beforeShade?: string | undefined;
	afterShade?: string | undefined;
	splitPercent?: number | undefined;
	blendOpacity?: number | undefined;
	mode?: PresentationComparisonMode | undefined;
	splitDirection?: PresentationSplitDirection | undefined;
	clinicName?: string | undefined;
	patientName?: string | undefined;
	zoomScale?: number | undefined;
	timestamp?: number | undefined;
}

export type PresentationSyncMessage =
	| { type: 'UPDATE_STATE'; payload: PresentationSyncPayload }
	| { type: 'REQUEST_SYNC' }
	| { type: 'SYNC_RESPONSE'; payload: PresentationSyncPayload };

/**
 * Checks whether current URL is requesting the patient presentation screen.
 */
export function isPatientPresentationRoute(): boolean {
	if (typeof window === 'undefined') return false;
	const search = window.location.search || '';
	const hash = window.location.hash || '';
	const pathname = window.location.pathname || '';

	return (
		pathname === '/chairside/patient-presentation' ||
		pathname === '/patient-presentation' ||
		search.includes('view=patient-presentation') ||
		search.includes('presentation=1') ||
		search.includes('presentation=patient') ||
		hash.includes('patient-presentation') ||
		hash.includes('presentation')
	);
}

/**
 * Opens the standalone patient presentation window on a secondary monitor or TV.
 */
export function openPatientPresentationWindow(
	initialState?: Partial<PresentationSyncPayload>,
): Window | null {
	if (typeof window === 'undefined') return null;

	if (initialState) {
		try {
			sessionStorage.setItem(
				DENTE_PRESENTATION_STORAGE_KEY,
				JSON.stringify(initialState),
			);
		} catch {
			// ignore storage quota errors
		}
	}

	const url = `${window.location.origin}${window.location.pathname}?view=patient-presentation#presentation`;
	const win = window.open(
		url,
		'dente_patient_display',
		'width=1440,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes',
	);

	// Also immediately broadcast via channel if channel is available
	if (initialState && typeof BroadcastChannel !== 'undefined') {
		try {
			const channel = new BroadcastChannel(DENTE_PRESENTATION_SYNC_CHANNEL);
			channel.postMessage({
				type: 'UPDATE_STATE',
				payload: initialState,
			} satisfies PresentationSyncMessage);
			setTimeout(() => {
				channel.close();
			}, 500);
		} catch {
			// ignore broadcast fallback
		}
	}

	return win;
}
