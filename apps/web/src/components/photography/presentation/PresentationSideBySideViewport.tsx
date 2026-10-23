/**
 * Patient Presentation Side-by-Side Viewport
 */

import React from 'react';
import { PatientPresentationState } from './types';

export const PresentationSideBySideViewport: React.FC<{ state: PatientPresentationState }> = ({ state }) => {
	const { beforeImageUrl, afterImageUrl, beforeLabel, afterLabel, beforeShade, afterShade, colors } = state;

	return (
		<div style={{
			display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
			width: '100%', height: '100%', maxWidth: '1360px', maxHeight: '820px',
		}}>
			<div style={{
				position: 'relative', borderRadius: '16px', overflow: 'hidden', backgroundColor: colors.cardBg,
				border: `1px solid ${colors.frameBorder}`, boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
				display: 'flex', alignItems: 'center', justifyContent: 'center',
			}}>
				<img src={beforeImageUrl} alt={beforeLabel} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
				<div style={{
					position: 'absolute', top: '16px', left: '16px', padding: '6px 14px', borderRadius: '8px',
					backgroundColor: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)',
					fontSize: '13px', fontWeight: 700, color: '#e2e8f0',
				}}>
					{beforeLabel} {beforeShade ? `• ${beforeShade}` : ''}
				</div>
			</div>

			<div style={{
				position: 'relative', borderRadius: '16px', overflow: 'hidden', backgroundColor: colors.cardBg,
				border: '1px solid rgba(14, 165, 233, 0.3)', boxShadow: '0 12px 36px rgba(14, 165, 233, 0.15)',
				display: 'flex', alignItems: 'center', justifyContent: 'center',
			}}>
				<img src={afterImageUrl} alt={afterLabel} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
				<div style={{
					position: 'absolute', top: '16px', left: '16px', padding: '6px 14px', borderRadius: '8px',
					backgroundColor: 'rgba(14, 165, 233, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)',
					fontSize: '13px', fontWeight: 700, color: '#ffffff',
				}}>
					{afterLabel} {afterShade ? `• ${afterShade}` : ''}
				</div>
			</div>
		</div>
	);
};
