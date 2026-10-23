/**
 * Patient Presentation Header Component
 */

import React from 'react';
import { Sparkles, MoveHorizontal, Columns, Layers, Radio, Moon, Sun, Minimize2, Maximize2, X } from 'lucide-react';
import { PresentationComparisonMode } from '../presentationSyncProtocol';
import { PatientPresentationState } from './types';

interface PresentationHeaderProps {
	state: PatientPresentationState;
	onModeChange: (mode: PresentationComparisonMode) => void;
	onThemeToggle: () => void;
	onFullscreenToggle: () => void;
	onClose: () => void;
}

export const PresentationHeader: React.FC<PresentationHeaderProps> = ({
	state, onModeChange, onThemeToggle, onFullscreenToggle, onClose,
}) => {
	const { clinicName, patientName, mode, isFullscreen, theme, colors } = state;
	const isLight = theme === 'light';

	return (
		<header style={{
			height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center',
			justifyContent: 'space-between', borderBottom: `1px solid ${colors.headerBorder}`,
			backgroundColor: colors.headerBg, backdropFilter: 'blur(16px)', flexShrink: 0,
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
				<div style={{
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					width: '36px', height: '36px', borderRadius: '10px',
					background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
					boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
				}}>
					<Sparkles size={20} color="#ffffff" />
				</div>
				<div>
					<h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '0.02em', color: colors.titleColor }}>
						{clinicName}
					</h1>
					<div style={{ fontSize: '12px', color: colors.mutedText, display: 'flex', alignItems: 'center', gap: '6px' }}>
						<span>Презентация улыбки</span>
						{patientName && (
							<>
								<span>•</span>
								<span style={{ color: colors.text, fontWeight: 600 }}>{patientName}</span>
							</>
						)}
					</div>
				</div>
			</div>

			<div style={{
				display: 'flex', alignItems: 'center', gap: '6px',
				backgroundColor: colors.controlsBg, padding: '4px',
				borderRadius: '12px', border: `1px solid ${colors.controlsBorder}`,
			}}>
				<button type="button" onClick={() => onModeChange('split')} style={{
					minHeight: '38px', padding: '6px 14px', borderRadius: '8px', border: 'none',
					background: mode === 'split' ? '#0ea5e9' : 'transparent',
					color: mode === 'split' ? '#ffffff' : colors.text,
					fontSize: '13px', fontWeight: mode === 'split' ? 600 : 500, cursor: 'pointer',
					display: 'inline-flex', alignItems: 'center', gap: '6px',
				}}>
					<MoveHorizontal size={15} /> Шторка До / После
				</button>
				<button type="button" onClick={() => onModeChange('side_by_side')} style={{
					minHeight: '38px', padding: '6px 14px', borderRadius: '8px', border: 'none',
					background: mode === 'side_by_side' ? '#0ea5e9' : 'transparent',
					color: mode === 'side_by_side' ? '#ffffff' : colors.text,
					fontSize: '13px', fontWeight: mode === 'side_by_side' ? 600 : 500, cursor: 'pointer',
					display: 'inline-flex', alignItems: 'center', gap: '6px',
				}}>
					<Columns size={15} /> Бок о бок
				</button>
				<button type="button" onClick={() => onModeChange('blend')} style={{
					minHeight: '38px', padding: '6px 14px', borderRadius: '8px', border: 'none',
					background: mode === 'blend' ? '#0ea5e9' : 'transparent',
					color: mode === 'blend' ? '#ffffff' : colors.text,
					fontSize: '13px', fontWeight: mode === 'blend' ? 600 : 500, cursor: 'pointer',
					display: 'inline-flex', alignItems: 'center', gap: '6px',
				}}>
					<Layers size={15} /> Наложение
				</button>
			</div>

			<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
				<div style={{
					display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
					borderRadius: '20px', backgroundColor: 'rgba(34, 197, 94, 0.15)',
					border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '12px', color: '#16a34a', fontWeight: 600,
				}}>
					<Radio size={12} /> В эфире
				</div>
				<button type="button" onClick={onThemeToggle} title={isLight ? 'Тёмная тема' : 'Светлая тема'} style={{
					minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center',
					justifyContent: 'center', borderRadius: '10px', border: `1px solid ${colors.ghostBorder}`,
					backgroundColor: colors.ghostBg, color: colors.ghostColor, cursor: 'pointer',
				}}>
					{isLight ? <Moon size={16} /> : <Sun size={16} />}
				</button>
				<button type="button" onClick={onFullscreenToggle} title={isFullscreen ? 'Выйти из полноэкранного' : 'На весь экран'} style={{
					minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center',
					justifyContent: 'center', borderRadius: '10px', border: `1px solid ${colors.ghostBorder}`,
					backgroundColor: colors.ghostBg, color: colors.ghostColor, cursor: 'pointer',
				}}>
					{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
				</button>
				<button type="button" onClick={onClose} title="Закрыть" style={{
					minHeight: '38px', minWidth: '38px', display: 'inline-flex', alignItems: 'center',
					justifyContent: 'center', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)',
					backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', cursor: 'pointer',
				}}>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};
