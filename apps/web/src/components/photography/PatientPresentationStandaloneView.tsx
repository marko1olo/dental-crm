import React, { useEffect } from 'react';
import { PresentationComparisonMode } from './presentationSyncProtocol';
import { DEMO_BEFORE_SMILE_SVG, DEMO_AFTER_SMILE_SVG } from './patientPresentationDemoData';
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

	const effectiveState = {
		...state,
		beforeImageUrl: state.beforeImageUrl || DEMO_BEFORE_SMILE_SVG,
		afterImageUrl: state.afterImageUrl || DEMO_AFTER_SMILE_SVG,
	};

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
			</main>
		</div>
	);
};

export default PatientPresentationStandaloneView;
