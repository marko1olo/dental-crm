/**
 * Patient Presentation BroadcastChannel & Interactive State Hook
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
	DENTE_PRESENTATION_SYNC_CHANNEL,
	DENTE_PRESENTATION_STORAGE_KEY,
	PresentationComparisonMode,
	PresentationSplitDirection,
	PresentationSyncMessage,
	PresentationSyncPayload,
} from '../presentationSyncProtocol';
import { clamp } from '../photoProtocolMath';
import { PatientPresentationStandaloneViewProps } from '../PatientPresentationStandaloneView';
import { PatientPresentationState, PresentationColors } from './types';

export function usePresentationState(props: PatientPresentationStandaloneViewProps) {
	const [beforeImageUrl, setBeforeImageUrl] = useState(props.initialBeforeImageUrl || '');
	const [afterImageUrl, setAfterImageUrl] = useState(props.initialAfterImageUrl || '');
	const [beforeLabel, setBeforeLabel] = useState(props.initialBeforeLabel || 'До лечения');
	const [afterLabel, setAfterLabel] = useState(props.initialAfterLabel || 'После лечения');
	const [beforeShade, setBeforeShade] = useState(props.initialBeforeShade);
	const [afterShade, setAfterShade] = useState(props.initialAfterShade);
	const [clinicName, setClinicName] = useState(props.initialClinicName || 'DENTE CLINIC');
	const [patientName, setPatientName] = useState(props.initialPatientName || '');
	const [mode, setMode] = useState<PresentationComparisonMode>(props.initialMode || 'split');
	const [splitDirection, setSplitDirection] = useState<PresentationSplitDirection>('vertical');
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [blendOpacity, setBlendOpacity] = useState<number>(0.5);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [theme, setTheme] = useState<'dark' | 'light'>(() => {
		if (typeof window === 'undefined') return 'dark';
		const q = new URLSearchParams(window.location.search).get('theme');
		return q === 'light' || q === 'dark' ? q : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	});

	const channelRef = useRef<BroadcastChannel | null>(null);
	const sliderContainerRef = useRef<HTMLDivElement | null>(null);
	const isDraggingRef = useRef(false);

	const broadcastLocalState = useCallback((updates: Partial<PresentationSyncPayload>) => {
		channelRef.current?.postMessage({ type: 'UPDATE_STATE', payload: updates } satisfies PresentationSyncMessage);
	}, []);

	useEffect(() => {
		try {
			const saved = sessionStorage.getItem(DENTE_PRESENTATION_STORAGE_KEY);
			if (saved) {
				const p = JSON.parse(saved) as Partial<PresentationSyncPayload>;
				if (p.beforeImageUrl) setBeforeImageUrl(p.beforeImageUrl);
				if (p.afterImageUrl) setAfterImageUrl(p.afterImageUrl);
				if (p.beforeLabel) setBeforeLabel(p.beforeLabel);
				if (p.afterLabel) setAfterLabel(p.afterLabel);
				if (p.beforeShade) setBeforeShade(p.beforeShade);
				if (p.afterShade) setAfterShade(p.afterShade);
				if (p.clinicName) setClinicName(p.clinicName);
				if (p.patientName) setPatientName(p.patientName);
				if (p.mode) setMode(p.mode);
				if (p.splitDirection) setSplitDirection(p.splitDirection);
				if (typeof p.splitPercent === 'number') setSplitPercent(p.splitPercent);
				if (typeof p.blendOpacity === 'number') setBlendOpacity(p.blendOpacity);
			}
		} catch {}
	}, []);

	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') return;
		const channel = new BroadcastChannel(DENTE_PRESENTATION_SYNC_CHANNEL);
		channelRef.current = channel;
		channel.addEventListener('message', (e: MessageEvent<PresentationSyncMessage>) => {
			const msg = e.data;
			if (!msg || (msg.type !== 'UPDATE_STATE' && msg.type !== 'SYNC_RESPONSE')) return;
			const p = msg.payload;
			if (p.beforeImageUrl !== undefined) setBeforeImageUrl(p.beforeImageUrl);
			if (p.afterImageUrl !== undefined) setAfterImageUrl(p.afterImageUrl);
			if (p.beforeLabel !== undefined) setBeforeLabel(p.beforeLabel);
			if (p.afterLabel !== undefined) setAfterLabel(p.afterLabel);
			if (p.beforeShade !== undefined) setBeforeShade(p.beforeShade);
			if (p.afterShade !== undefined) setAfterShade(p.afterShade);
			if (p.clinicName !== undefined) setClinicName(p.clinicName);
			if (p.patientName !== undefined) setPatientName(p.patientName);
			if (p.mode !== undefined) setMode(p.mode);
			if (p.splitDirection !== undefined) setSplitDirection(p.splitDirection);
			if (typeof p.splitPercent === 'number') setSplitPercent(p.splitPercent);
			if (typeof p.blendOpacity === 'number') setBlendOpacity(p.blendOpacity);
		});
		channel.postMessage({ type: 'REQUEST_SYNC' } satisfies PresentationSyncMessage);
		return () => { channel.close(); channelRef.current = null; };
	}, []);

	const updateSplit = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!sliderContainerRef.current) return;
		const r = sliderContainerRef.current.getBoundingClientRect();
		const pct = splitDirection === 'vertical' ? ((e.clientX - r.left) / r.width) * 100 : ((e.clientY - r.top) / r.height) * 100;
		const clamped = clamp(Math.round(pct), 1, 99);
		setSplitPercent(clamped);
		broadcastLocalState({ splitPercent: clamped });
	}, [splitDirection, broadcastLocalState]);

	const isLight = theme === 'light';
	const colors: PresentationColors = {
		bg: isLight ? '#f1f5f9' : '#090d16', cardBg: isLight ? '#ffffff' : '#090d16',
		viewportBg: isLight ? '#e2e8f0' : '#020617', text: isLight ? '#0f172a' : '#f8fafc',
		titleColor: isLight ? '#0f172a' : '#ffffff', mutedText: isLight ? '#64748b' : '#94a3b8',
		headerBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
		headerBorder: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
		subBarBg: isLight ? 'rgba(248, 250, 252, 0.9)' : 'rgba(15, 23, 42, 0.5)',
		subBarBorder: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)',
		controlsBg: isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.7)',
		controlsBorder: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
		ghostBg: isLight ? 'rgba(241, 245, 249, 0.8)' : 'rgba(30, 41, 59, 0.6)',
		ghostBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)',
		ghostColor: isLight ? '#334155' : '#cbd5e1', frameBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
	};

	const state: PatientPresentationState = {
		beforeImageUrl, afterImageUrl, beforeLabel, afterLabel, beforeShade, afterShade,
		clinicName, patientName, theme, mode, splitDirection, splitPercent, blendOpacity, isFullscreen, colors,
	};

	return {
		state, setMode, setSplitDirection, setSplitPercent, setBlendOpacity, setTheme,
		setIsFullscreen, sliderContainerRef, isDraggingRef, broadcastLocalState, updateSplit,
	};
}
