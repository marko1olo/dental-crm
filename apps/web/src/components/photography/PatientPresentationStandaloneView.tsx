import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	Maximize2,
	Minimize2,
	X,
	Columns,
	Layers,
	MoveHorizontal,
	MoveVertical,
	Sparkles,
	Radio,
	Sun,
	Moon,
} from 'lucide-react';
import {
	DENTE_PRESENTATION_SYNC_CHANNEL,
	DENTE_PRESENTATION_STORAGE_KEY,
	PresentationComparisonMode,
	PresentationSplitDirection,
	PresentationSyncMessage,
	PresentationSyncPayload,
} from './presentationSyncProtocol';
import { calculateSplitClipPath, clamp } from './photoProtocolMath';
import { DEMO_BEFORE_SMILE_SVG, DEMO_AFTER_SMILE_SVG } from './patientPresentationDemoData';

export interface PatientPresentationStandaloneViewProps {
	initialBeforeImageUrl?: string;
	initialAfterImageUrl?: string;
	initialBeforeLabel?: string;
	initialAfterLabel?: string;
	initialBeforeShade?: string;
	initialAfterShade?: string;
	initialClinicName?: string;
	initialPatientName?: string;
	initialMode?: PresentationComparisonMode;
	onClose?: () => void;
}

export const PatientPresentationStandaloneView: React.FC<
	PatientPresentationStandaloneViewProps
> = ({
	initialBeforeImageUrl,
	initialAfterImageUrl,
	initialBeforeLabel = 'До лечения',
	initialAfterLabel = 'После лечения',
	initialBeforeShade,
	initialAfterShade,
	initialClinicName = 'DENTE CLINIC',
	initialPatientName = '',
	initialMode = 'split',
	onClose,
}) => {
	// Sync State
	const [beforeImageUrl, setBeforeImageUrl] = useState<string>(initialBeforeImageUrl || '');
	const [afterImageUrl, setAfterImageUrl] = useState<string>(initialAfterImageUrl || '');
	const [beforeLabel, setBeforeLabel] = useState<string>(initialBeforeLabel);
	const [afterLabel, setAfterLabel] = useState<string>(initialAfterLabel);
	const [beforeShade, setBeforeShade] = useState<string | undefined>(initialBeforeShade);
	const [afterShade, setAfterShade] = useState<string | undefined>(initialAfterShade);
	const [clinicName, setClinicName] = useState<string>(initialClinicName);
	const [patientName, setPatientName] = useState<string>(initialPatientName);

	// Display & Interaction State
	const [theme, setTheme] = useState<'dark' | 'light'>(() => {
		if (typeof window !== 'undefined') {
			const q = new URLSearchParams(window.location.search).get('theme');
			if (q === 'light' || q === 'dark') return q;
			return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
		}
		return 'dark';
	});
	const [mode, setMode] = useState<PresentationComparisonMode>(initialMode);
	const [splitDirection, setSplitDirection] = useState<PresentationSplitDirection>('vertical');
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [blendOpacity, setBlendOpacity] = useState<number>(0.5);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	const channelRef = useRef<BroadcastChannel | null>(null);
	const sliderContainerRef = useRef<HTMLDivElement | null>(null);
	const isDraggingRef = useRef<boolean>(false);

	// Load initial state from sessionStorage if available
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
		} catch {
			// ignore json parse error
		}
	}, []);

	// Two-way BroadcastChannel synchronization
	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') return;

		const channel = new BroadcastChannel(DENTE_PRESENTATION_SYNC_CHANNEL);
		channelRef.current = channel;

		const handleMessage = (event: MessageEvent<PresentationSyncMessage>) => {
			const msg = event.data;
			if (!msg) return;

			if (msg.type === 'UPDATE_STATE' || msg.type === 'SYNC_RESPONSE') {
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
			}
		};

		channel.addEventListener('message', handleMessage);
		channel.postMessage({ type: 'REQUEST_SYNC' } satisfies PresentationSyncMessage);

		return () => {
			channel.removeEventListener('message', handleMessage);
			channel.close();
			channelRef.current = null;
		};
	}, []);

	// Broadcast local user interaction back to parent window
	const broadcastLocalState = useCallback((updates: Partial<PresentationSyncPayload>) => {
		if (channelRef.current) {
			channelRef.current.postMessage({
				type: 'UPDATE_STATE',
				payload: updates,
			} satisfies PresentationSyncMessage);
		}
	}, []);

	const toggleFullscreen = async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
				setIsFullscreen(true);
			} else {
				await document.exitFullscreen();
				setIsFullscreen(false);
			}
		} catch {
			setIsFullscreen(prev => !prev);
		}
	};

	useEffect(() => {
		const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener('fullscreenchange', handleFsChange);
		return () => document.removeEventListener('fullscreenchange', handleFsChange);
	}, []);

	const updateSplitFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!sliderContainerRef.current) return;
		const rect = sliderContainerRef.current.getBoundingClientRect();
		const pct = splitDirection === 'vertical'
			? ((e.clientX - rect.left) / rect.width) * 100
			: ((e.clientY - rect.top) / rect.height) * 100;

		const clamped = clamp(Math.round(pct), 1, 99);
		setSplitPercent(clamped);
		broadcastLocalState({ splitPercent: clamped });
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingRef.current = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		updateSplitFromPointer(e);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingRef.current) return;
		updateSplitFromPointer(e);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingRef.current = false;
		try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
	};

	const handleModeChange = (newMode: PresentationComparisonMode) => {
		setMode(newMode);
		broadcastLocalState({ mode: newMode });
	};

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			try { window.close(); } catch { window.location.search = ''; }
		}
	};

	const activeBefore = beforeImageUrl || DEMO_BEFORE_SMILE_SVG;
	const activeAfter = afterImageUrl || DEMO_AFTER_SMILE_SVG;

	const isLight = theme === 'light';
	const colors = {
		bg: isLight ? '#f1f5f9' : '#090d16',
		cardBg: isLight ? '#ffffff' : '#090d16',
		viewportBg: isLight ? '#e2e8f0' : '#020617',
		text: isLight ? '#0f172a' : '#f8fafc',
		titleColor: isLight ? '#0f172a' : '#ffffff',
		mutedText: isLight ? '#64748b' : '#94a3b8',
		headerBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
		headerBorder: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
		subBarBg: isLight ? 'rgba(248, 250, 252, 0.9)' : 'rgba(15, 23, 42, 0.5)',
		subBarBorder: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)',
		controlsBg: isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.7)',
		controlsBorder: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
		ghostBg: isLight ? 'rgba(241, 245, 249, 0.8)' : 'rgba(30, 41, 59, 0.6)',
		ghostBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)',
		ghostColor: isLight ? '#334155' : '#cbd5e1',
		frameBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
	};

	return (
		<div
			data-testid="patient-presentation-view"
			className="dente-patient-presentation-root"
			style={{
				position: 'fixed', inset: 0, zIndex: 99999,
				backgroundColor: colors.bg, color: colors.text,
				display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none',
				fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
			}}
		>
			{/* Clinical Header Bar (Zero CRM Nav, Zero Prices, Zero Notes) */}
			<header
				style={{
					height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center',
					justifyContent: 'space-between', borderBottom: `1px solid ${colors.headerBorder}`,
					backgroundColor: colors.headerBg, backdropFilter: 'blur(16px)', flexShrink: 0,
				}}
			>
				{/* Clinic Branding */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
					<div
						style={{
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							width: '36px', height: '36px', borderRadius: '10px',
							background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
							boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
						}}
					>
						<Sparkles size={20} color="#ffffff" />
					</div>
					<div>
						<h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '0.02em', color: colors.titleColor }}>
							{clinicName}
						</h1>
						<div style={{ fontSize: '12px', color: colors.mutedText, display: 'flex', alignItems: 'center', gap: '6px' }}>
							<span>Презентация улыбки</span>
							{patientName ? (
								<>
									<span>•</span>
									<span style={{ color: colors.text, fontWeight: 600 }}>{patientName}</span>
								</>
							) : null}
						</div>
					</div>
				</div>

				{/* Presentation Mode Switcher */}
				<div
					style={{
						display: 'flex', alignItems: 'center', gap: '6px',
						backgroundColor: colors.controlsBg, padding: '4px',
						borderRadius: '12px', border: `1px solid ${colors.controlsBorder}`,
					}}
				>
					<button
						type="button"
						onClick={() => handleModeChange('split')}
						style={{
							minHeight: '38px', padding: '6px 14px', borderRadius: '8px', border: 'none',
							background: mode === 'split' ? '#0ea5e9' : 'transparent',
							color: mode === 'split' ? '#ffffff' : colors.text,
							fontSize: '13px', fontWeight: mode === 'split' ? 600 : 500, cursor: 'pointer',
							display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
						}}
					>
						<MoveHorizontal size={15} /> Шторка До / После
					</button>

					<button
						type="button"
						onClick={() => handleModeChange('side_by_side')}
						style={{
							minHeight: '38px', padding: '6px 14px', borderRadius: '8px', border: 'none',
							background: mode === 'side_by_side' ? '#0ea5e9' : 'transparent',
							color: mode === 'side_by_side' ? '#ffffff' : colors.text,
							fontSize: '13px', fontWeight: mode === 'side_by_side' ? 600 : 500, cursor: 'pointer',
							display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
						}}
					>
						<Columns size={15} /> Бок о бок
					</button>

					<button
						type="button"
						onClick={() => handleModeChange('blend')}
						style={{
							minHeight: '38px', padding: '6px 14px', borderRadius: '8px', border: 'none',
							background: mode === 'blend' ? '#0ea5e9' : 'transparent',
							color: mode === 'blend' ? '#ffffff' : colors.text,
							fontSize: '13px', fontWeight: mode === 'blend' ? 600 : 500, cursor: 'pointer',
							display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
						}}
					>
						<Layers size={15} /> Наложение
					</button>
				</div>

				{/* Right Utilities: Status indicator, Theme, Fullscreen & Close */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<div
						style={{
							display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
							borderRadius: '20px', backgroundColor: 'rgba(34, 197, 94, 0.15)',
							border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '12px', color: '#16a34a', fontWeight: 600,
						}}
					>
						<Radio size={12} /> В эфире
					</div>

					<button
						type="button"
						onClick={() => setTheme(isLight ? 'dark' : 'light')}
						title={isLight ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
						style={{
							minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center',
							justifyContent: 'center', borderRadius: '10px', border: `1px solid ${colors.ghostBorder}`,
							backgroundColor: colors.ghostBg, color: colors.ghostColor, cursor: 'pointer',
						}}
					>
						{isLight ? <Moon size={16} /> : <Sun size={16} />}
					</button>

					<button
						type="button"
						onClick={toggleFullscreen}
						title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
						style={{
							minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center',
							justifyContent: 'center', borderRadius: '10px', border: `1px solid ${colors.ghostBorder}`,
							backgroundColor: colors.ghostBg, color: colors.ghostColor, cursor: 'pointer',
						}}
					>
						{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
					</button>

					<button
						type="button"
						onClick={handleClose}
						title="Закрыть окно презентации"
						style={{
							minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center',
							justifyContent: 'center', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)',
							backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', cursor: 'pointer',
						}}
					>
						<X size={18} />
					</button>
				</div>
			</header>

			{/* Secondary Controls Bar */}
			<div
				style={{
					height: '48px', padding: '0 24px', display: 'flex', alignItems: 'center',
					justifyContent: 'space-between', backgroundColor: colors.subBarBg,
					borderBottom: `1px solid ${colors.subBarBorder}`, flexShrink: 0, fontSize: '13px',
				}}
			>
				{/* Left: VITA Shades indication if present */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
					{beforeShade && afterShade ? (
						<div
							style={{
								display: 'inline-flex', alignItems: 'center', gap: '8px',
								backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '4px 12px',
								borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)',
							}}
						>
							<span style={{ color: '#94a3b8' }}>Цвет эмали:</span>
							<span style={{ color: '#f59e0b', fontWeight: 700 }}>{beforeShade}</span>
							<span style={{ color: '#64748b' }}>→</span>
							<span style={{ color: '#38bdf8', fontWeight: 700 }}>{afterShade}</span>
						</div>
					) : (
						<span style={{ color: '#64748b' }}>Интерактивное сопоставление клинических результатов</span>
					)}
				</div>

				{/* Right: Sub-controls */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
					{mode === 'split' && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<span style={{ color: '#94a3b8', fontSize: '12px' }}>Направление шторки:</span>
							<button
								type="button"
								onClick={() => {
									const next = splitDirection === 'vertical' ? 'horizontal' : 'vertical';
									setSplitDirection(next);
									broadcastLocalState({ splitDirection: next });
								}}
								style={{
									minHeight: '32px', padding: '2px 10px', borderRadius: '6px',
									border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(30, 41, 59, 0.8)',
									color: '#e2e8f0', fontSize: '12px', cursor: 'pointer', display: 'inline-flex',
									alignItems: 'center', gap: '5px',
								}}
							>
								{splitDirection === 'vertical' ? (
									<><MoveHorizontal size={14} /> По вертикали</>
								) : (
									<><MoveVertical size={14} /> По горизонтали</>
								)}
							</button>
							<span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '12px', marginLeft: '8px' }}>
								{splitPercent}%
							</span>
						</div>
					)}

					{mode === 'blend' && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '280px' }}>
							<span style={{ color: '#94a3b8', fontSize: '12px' }}>Прозрачность:</span>
							<input
								type="range" min="0" max="1" step="0.02" value={blendOpacity}
								onChange={(e) => {
									const val = parseFloat(e.target.value);
									setBlendOpacity(val);
									broadcastLocalState({ blendOpacity: val });
								}}
								style={{ flex: 1, accentColor: '#0ea5e9' }}
							/>
							<span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '12px', minWidth: '36px' }}>
								{Math.round(blendOpacity * 100)}%
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Main High-Res Clinical Viewport */}
			<main
				style={{
					flex: 1, position: 'relative', display: 'flex', alignItems: 'center',
					justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.viewportBg, padding: '16px',
				}}
			>
				{/* 1. SPLIT WIPER SLIDER MODE */}
				{mode === 'split' && (
					<div
						ref={sliderContainerRef}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						style={{
							position: 'relative', width: '100%', height: '100%', maxWidth: '1360px', maxHeight: '820px',
							borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
							border: `1px solid ${colors.frameBorder}`, cursor: splitDirection === 'vertical' ? 'col-resize' : 'row-resize',
							backgroundColor: colors.cardBg,
						}}
					>
						{/* Before Image (Layer 0) */}
						<img
							src={activeBefore}
							alt={beforeLabel}
							decoding="async"
							style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
						/>

						{/* After Image (Clipped Layer 1) */}
						<div
							style={{
								position: 'absolute', inset: 0, width: '100%', height: '100%',
								clipPath: calculateSplitClipPath(splitPercent, splitDirection),
								pointerEvents: 'none',
							}}
						>
							<img
								src={activeAfter}
								alt={afterLabel}
								decoding="async"
								style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
							/>
						</div>

						{/* Divider Line & Handle */}
						<div
							style={{
								position: 'absolute', pointerEvents: 'none',
								...(splitDirection === 'vertical'
									? { left: `${splitPercent}%`, top: 0, bottom: 0, width: '2px', backgroundColor: '#ffffff', boxShadow: '0 0 16px rgba(14, 165, 233, 0.8)' }
									: { top: `${splitPercent}%`, left: 0, right: 0, height: '2px', backgroundColor: '#ffffff', boxShadow: '0 0 16px rgba(14, 165, 233, 0.8)' }),
							}}
						>
							{/* Drag Pill Handle */}
							<div
								style={{
									position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
									width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0ea5e9',
									border: '3px solid #ffffff', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px rgba(14, 165, 233, 0.6)',
									display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
								}}
							>
								{splitDirection === 'vertical' ? <MoveHorizontal size={18} /> : <MoveVertical size={18} />}
							</div>
						</div>

						{/* Clinical Floating Stage Badges */}
						<div
							style={{
								position: 'absolute', bottom: '20px', left: '20px', pointerEvents: 'none',
								padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)',
								backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)',
								fontSize: '13px', fontWeight: 700, color: '#f8fafc',
							}}
						>
							{beforeLabel} {beforeShade ? `(${beforeShade})` : ''}
						</div>

						<div
							style={{
								position: 'absolute', bottom: '20px', right: '20px', pointerEvents: 'none',
								padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(14, 165, 233, 0.9)',
								backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)',
								fontSize: '13px', fontWeight: 700, color: '#ffffff', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
							}}
						>
							{afterLabel} {afterShade ? `(${afterShade})` : ''}
						</div>
					</div>
				)}

				{/* 2. SIDE BY SIDE MODE */}
				{mode === 'side_by_side' && (
					<div
						style={{
							display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
							width: '100%', height: '100%', maxWidth: '1360px', maxHeight: '820px',
						}}
					>
						{/* Before Card */}
						<div
							style={{
								position: 'relative', borderRadius: '16px', overflow: 'hidden', backgroundColor: colors.cardBg,
								border: `1px solid ${colors.frameBorder}`, boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
							}}
						>
							<img src={activeBefore} alt={beforeLabel} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
							<div
								style={{
									position: 'absolute', top: '16px', left: '16px', padding: '6px 14px', borderRadius: '8px',
									backgroundColor: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)',
									fontSize: '13px', fontWeight: 700, color: '#e2e8f0',
								}}
							>
								{beforeLabel} {beforeShade ? `• ${beforeShade}` : ''}
							</div>
						</div>

						{/* After Card */}
						<div
							style={{
								position: 'relative', borderRadius: '16px', overflow: 'hidden', backgroundColor: colors.cardBg,
								border: '1px solid rgba(14, 165, 233, 0.3)', boxShadow: '0 12px 36px rgba(14, 165, 233, 0.15)',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
							}}
						>
							<img src={activeAfter} alt={afterLabel} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
							<div
								style={{
									position: 'absolute', top: '16px', left: '16px', padding: '6px 14px', borderRadius: '8px',
									backgroundColor: 'rgba(14, 165, 233, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)',
									fontSize: '13px', fontWeight: 700, color: '#ffffff',
								}}
							>
								{afterLabel} {afterShade ? `• ${afterShade}` : ''}
							</div>
						</div>
					</div>
				)}

				{/* 3. BLEND OPACITY MODE */}
				{mode === 'blend' && (
					<div
						style={{
							position: 'relative', width: '100%', height: '100%', maxWidth: '1360px', maxHeight: '820px',
							borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
							border: `1px solid ${colors.frameBorder}`, backgroundColor: colors.cardBg,
							display: 'flex', alignItems: 'center', justifyContent: 'center',
						}}
					>
						<img src={activeBefore} alt={beforeLabel} decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
						<img
							src={activeAfter} alt={afterLabel} decoding="async"
							style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: blendOpacity, transition: 'opacity 0.05s ease-out' }}
						/>

						{/* Overlay indicator */}
						<div
							style={{
								position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
								padding: '8px 18px', borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)',
								backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)',
								fontSize: '13px', color: '#e2e8f0',
							}}
						>
							Наложение: <strong style={{ color: '#38bdf8' }}>{Math.round(blendOpacity * 100)}%</strong> ({afterLabel})
						</div>
					</div>
				)}
			</main>
		</div>
	);
};

export default PatientPresentationStandaloneView;
