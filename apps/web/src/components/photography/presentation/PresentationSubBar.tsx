/**
 * Patient Presentation Sub-bar Component (VITA Shades, Direction, Blend Range)
 */

import React from 'react';
import { MoveHorizontal, MoveVertical } from 'lucide-react';
import { PatientPresentationState } from './types';

interface PresentationSubBarProps {
	state: PatientPresentationState;
	onSplitDirectionToggle: () => void;
	onBlendOpacityChange: (val: number) => void;
}

export const PresentationSubBar: React.FC<PresentationSubBarProps> = ({
	state, onSplitDirectionToggle, onBlendOpacityChange,
}) => {
	const { beforeShade, afterShade, mode, splitDirection, splitPercent, blendOpacity, colors } = state;

	return (
		<div style={{
			height: '48px', padding: '0 24px', display: 'flex', alignItems: 'center',
			justifyContent: 'space-between', backgroundColor: colors.subBarBg,
			borderBottom: `1px solid ${colors.subBarBorder}`, flexShrink: 0, fontSize: '13px',
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
				{beforeShade && afterShade ? (
					<div style={{
						display: 'inline-flex', alignItems: 'center', gap: '8px',
						backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '4px 12px',
						borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)',
					}}>
						<span style={{ color: '#94a3b8' }}>Цвет эмали:</span>
						<span style={{ color: '#f59e0b', fontWeight: 700 }}>{beforeShade}</span>
						<span style={{ color: '#64748b' }}>→</span>
						<span style={{ color: '#38bdf8', fontWeight: 700 }}>{afterShade}</span>
					</div>
				) : (
					<span style={{ color: '#64748b' }}>Интерактивное сопоставление клинических результатов</span>
				)}
			</div>

			<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
				{mode === 'split' && (
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ color: '#94a3b8', fontSize: '12px' }}>Направление шторки:</span>
						<button type="button" onClick={onSplitDirectionToggle} style={{
							minHeight: '32px', padding: '2px 10px', borderRadius: '6px',
							border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(30, 41, 59, 0.8)',
							color: '#e2e8f0', fontSize: '12px', cursor: 'pointer', display: 'inline-flex',
							alignItems: 'center', gap: '5px',
						}}>
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
							onChange={(e) => onBlendOpacityChange(parseFloat(e.target.value))}
							style={{ flex: 1, accentColor: '#0ea5e9' }}
						/>
						<span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '12px', minWidth: '36px' }}>
							{Math.round(blendOpacity * 100)}%
						</span>
					</div>
				)}
			</div>
		</div>
	);
};
