import React, { useEffect } from 'react';
import { Camera } from 'lucide-react';
import { PresentationComparisonMode } from './presentationSyncProtocol';
import { usePresentationState } from './presentation/usePresentationState';
import { PresentationHeader } from './presentation/PresentationHeader';
import { PresentationSubBar } from './presentation/PresentationSubBar';
import { PresentationSplitViewport } from './presentation/PresentationSplitViewport';
import { PresentationSideBySideViewport } from './presentation/PresentationSideBySideViewport';
import { PresentationBlendViewport } from './presentation/PresentationBlendViewport';

export interface PatientPresentationStandaloneViewProps {
	initialBeforeImageUrl?: string; initialAfterImageUrl?: string;
	initialBeforeLabel?: string; initialAfterLabel?: string;
	initialBeforeShade?: string; initialAfterShade?: string;
	initialClinicName?: string; initialPatientName?: string;
	initialMode?: PresentationComparisonMode; onClose?: () => void;
}

export const PatientPresentationStandaloneView: React.FC<PatientPresentationStandaloneViewProps> = (props) => {
	const {
		state, setMode, setSplitDirection, setBlendOpacity, setTheme,
		setIsFullscreen, sliderContainerRef, isDraggingRef, broadcastLocalState, updateSplit,
	} = usePresentationState(props);

	useEffect(() => {
		const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener('fullscreenchange', handleFs);
		return () => document.removeEventListener('fullscreenchange', handleFs);
	}, [setIsFullscreen]);

	const effectiveState = state;
	const isEmpty = !state.beforeImageUrl && !state.afterImageUrl;

	const onToggleFs = () => {
		if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setIsFullscreen(true); }
		else { document.exitFullscreen().catch(() => {}); setIsFullscreen(false); }
	};

	return (
		<div
			data-testid="patient-presentation-view"
			className="dente-patient-presentation-root"
			style={{
				position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: state.colors.bg, color: state.colors.text,
				display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none',
				fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
			}}
		>
			<PresentationHeader
				state={effectiveState}
				onModeChange={(m) => { setMode(m); broadcastLocalState({ mode: m }); }}
				onThemeToggle={() => setTheme(state.theme === 'light' ? 'dark' : 'light')}
				onFullscreenToggle={onToggleFs}
				onClose={() => (props.onClose ? props.onClose() : window.close())}
			/>
			<PresentationSubBar
				state={effectiveState}
				onSplitDirectionToggle={() => {
					const next = state.splitDirection === 'vertical' ? 'horizontal' : 'vertical';
					setSplitDirection(next);
					broadcastLocalState({ splitDirection: next });
				}}
				onBlendOpacityChange={(val) => { setBlendOpacity(val); broadcastLocalState({ blendOpacity: val }); }}
			/>
			<main style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: state.colors.viewportBg, padding: '16px' }}>
				{isEmpty ? (
					<div
						data-testid="presentation-empty-state"
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '16px',
							padding: '32px',
							textAlign: 'center',
							borderRadius: '16px',
							border: '2px dashed rgba(255, 255, 255, 0.15)',
							maxWidth: '480px',
						}}
					>
						<div
							style={{
								width: '64px',
								height: '64px',
								borderRadius: '50%',
								backgroundColor: 'rgba(13, 148, 136, 0.15)',
								color: '#0d9488',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<Camera size={32} />
						</div>
						<h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: state.colors.text }}>
							Снимки для презентации пациенту не загружены
						</h3>
						<p style={{ fontSize: '13px', margin: 0, color: state.colors.subText, lineHeight: '1.6' }}>
							Загрузите фотографии в клинический фотопротокол карточки пациента для демонстрации результатов До / После на внешнем экране.
						</p>
					</div>
				) : (
					<>
						{state.mode === 'split' && (
							<PresentationSplitViewport
								state={effectiveState} sliderContainerRef={sliderContainerRef}
								onPointerDown={(e) => { isDraggingRef.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); updateSplit(e); }}
								onPointerMove={(e) => { if (isDraggingRef.current) updateSplit(e); }}
								onPointerUp={(e) => { isDraggingRef.current = false; try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {} }}
							/>
						)}
						{state.mode === 'side_by_side' && <PresentationSideBySideViewport state={effectiveState} />}
						{state.mode === 'blend' && <PresentationBlendViewport state={effectiveState} />}
					</>
				)}
			</main>
		</div>
	);
};

export default PatientPresentationStandaloneView;
