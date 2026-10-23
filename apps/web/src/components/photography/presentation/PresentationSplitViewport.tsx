/**
 * Patient Presentation Split Wiper Slider Viewport
 */

import React from 'react';
import { MoveHorizontal, MoveVertical } from 'lucide-react';
import { calculateSplitClipPath } from '../photoProtocolMath';
import { PatientPresentationState } from './types';

interface PresentationSplitViewportProps {
	state: PatientPresentationState;
	sliderContainerRef: React.RefObject<HTMLDivElement | null>;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const PresentationSplitViewport: React.FC<PresentationSplitViewportProps> = ({
	state, sliderContainerRef, onPointerDown, onPointerMove, onPointerUp,
}) => {
	const { beforeImageUrl, afterImageUrl, beforeLabel, afterLabel, beforeShade, afterShade, splitDirection, splitPercent, colors } = state;

	return (
		<div
			ref={sliderContainerRef}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			style={{
				position: 'relative', width: '100%', height: '100%', maxWidth: '1360px', maxHeight: '820px',
				borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
				border: `1px solid ${colors.frameBorder}`, cursor: splitDirection === 'vertical' ? 'col-resize' : 'row-resize',
				backgroundColor: colors.cardBg,
			}}
		>
			<img
				src={beforeImageUrl} alt={beforeLabel} decoding="async"
				style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
			/>
			<div style={{
				position: 'absolute', inset: 0, width: '100%', height: '100%',
				clipPath: calculateSplitClipPath(splitPercent, splitDirection), pointerEvents: 'none',
			}}>
				<img
					src={afterImageUrl} alt={afterLabel} decoding="async"
					style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
				/>
			</div>

			<div style={{
				position: 'absolute', pointerEvents: 'none',
				...(splitDirection === 'vertical'
					? { left: `${splitPercent}%`, top: 0, bottom: 0, width: '2px', backgroundColor: '#ffffff', boxShadow: '0 0 16px rgba(14, 165, 233, 0.8)' }
					: { top: `${splitPercent}%`, left: 0, right: 0, height: '2px', backgroundColor: '#ffffff', boxShadow: '0 0 16px rgba(14, 165, 233, 0.8)' }),
			}}>
				<div style={{
					position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
					width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0ea5e9',
					border: '3px solid #ffffff', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px rgba(14, 165, 233, 0.6)',
					display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
				}}>
					{splitDirection === 'vertical' ? <MoveHorizontal size={18} /> : <MoveVertical size={18} />}
				</div>
			</div>

			<div style={{
				position: 'absolute', bottom: '20px', left: '20px', pointerEvents: 'none',
				padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)',
				backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)',
				fontSize: '13px', fontWeight: 700, color: '#f8fafc',
			}}>
				{beforeLabel} {beforeShade ? `(${beforeShade})` : ''}
			</div>

			<div style={{
				position: 'absolute', bottom: '20px', right: '20px', pointerEvents: 'none',
				padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(14, 165, 233, 0.9)',
				backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)',
				fontSize: '13px', fontWeight: 700, color: '#ffffff', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
			}}>
				{afterLabel} {afterShade ? `(${afterShade})` : ''}
			</div>
		</div>
	);
};
