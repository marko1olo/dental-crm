/**
 * DENTE Dental CRM — Presentation Screen Two-Way BroadcastChannel Sync Hook
 *
 * Mandate Compliance:
 * - Mandate 8e: Doctor Autonomy (Non-blocking real-time two-way synchronization)
 * - Mandate 8k: Rapid Before/After Presentation without frame latency
 */

import { useEffect, useRef, useCallback } from 'react';
import {
	DENTE_PRESENTATION_SYNC_CHANNEL,
	PresentationSyncMessage,
	PresentationSyncPayload,
} from './presentationSyncProtocol';

export interface UsePresentationSyncOptions {
	getState: () => PresentationSyncPayload;
	onRemoteState?: (payload: PresentationSyncPayload) => void;
	isPopout?: boolean;
}

export function usePresentationSync({
	getState,
	onRemoteState,
	isPopout = false,
}: UsePresentationSyncOptions) {
	const channelRef = useRef<BroadcastChannel | null>(null);

	const broadcastSync = useCallback((payload: Partial<PresentationSyncPayload>) => {
		try {
			channelRef.current?.postMessage({
				type: 'UPDATE_STATE',
				payload,
			} satisfies PresentationSyncMessage);
		} catch {
			// ignore channel errors
		}
	}, []);

	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') return;

		const channel = new BroadcastChannel(DENTE_PRESENTATION_SYNC_CHANNEL);
		channelRef.current = channel;

		const handleMessage = (event: MessageEvent<PresentationSyncMessage>) => {
			const msg = event.data;
			if (!msg) return;

			if (msg.type === 'REQUEST_SYNC' && !isPopout) {
				const current = getState();
				channel.postMessage({
					type: 'SYNC_RESPONSE',
					payload: current,
				} satisfies PresentationSyncMessage);
			} else if (
				(msg.type === 'UPDATE_STATE' || msg.type === 'SYNC_RESPONSE') &&
				onRemoteState
			) {
				onRemoteState(msg.payload);
			}
		};

		channel.addEventListener('message', handleMessage);

		if (isPopout) {
			channel.postMessage({ type: 'REQUEST_SYNC' } satisfies PresentationSyncMessage);
		}

		return () => {
			channel.removeEventListener('message', handleMessage);
			channel.close();
			channelRef.current = null;
		};
	}, [getState, onRemoteState, isPopout]);

	return { broadcastSync };
}
