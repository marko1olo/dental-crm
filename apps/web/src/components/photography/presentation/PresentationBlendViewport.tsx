/**
 * Patient Presentation Blend Opacity Viewport
 */

import React from 'react';
import { PatientPresentationState } from './types';

export const PresentationBlendViewport: React.FC<{ state: PatientPresentationState }> = ({ state }) => {
	const { beforeImageUrl, afterImageUrl, beforeLabel, afterLabel, blendOpacity, colors } = state;

	return (
		<div style={{
			position: 'relative', width: '100%', height: '100%', maxWidth: '1360px', maxHeight: '820px',
			borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
			border: `1px solid ${colors.frameBorder}`, backgroundColor: colors.cardBg,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
		}}>
			<img src={beforeImageUrl} alt={beforeLabel} decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
			<img
				src={afterImageUrl} alt={afterLabel} decoding="async"
				style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: blendOpacity, transition: 'opacity 0.05s ease-out' }}
			/>
			<div style={{
				position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
				padding: '8px 18px', borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.85)',
				backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)',
				fontSize: '13px', color: '#e2e8f0',
			}}>
				Наложение: <strong style={{ color: '#38bdf8' }}>{Math.round(blendOpacity * 100)}%</strong> ({afterLabel})
			</div>
		</div>
	);
};
