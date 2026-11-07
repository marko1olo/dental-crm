import React from 'react';

export type GuideOverlayType = 'bipupillary' | 'incisal' | 'midline' | 'thirds' | 'goldenRatio';

export interface IncisalAlignmentGuideOverlayProps {
	activeGuides: Partial<Record<GuideOverlayType, boolean>>;
	bipupillaryTiltDegrees?: number;
	incisalCantingDegrees?: number;
	midlineOffsetPx?: number;
	goldenRatioWidth?: number;
}

export const IncisalAlignmentGuideOverlay: React.FC<IncisalAlignmentGuideOverlayProps> = ({
	activeGuides,
	bipupillaryTiltDegrees = 0,
	incisalCantingDegrees = 0,
	midlineOffsetPx = 0,
	goldenRatioWidth = 380,
}) => {
	const hasAnyGuide = Object.values(activeGuides).some(Boolean);
	if (!hasAnyGuide) return null;

	const cW = (1.618 / 3.236) * (goldenRatioWidth / 2);
	const lW = (1.0 / 3.236) * (goldenRatioWidth / 2);
	const kW = (0.618 / 3.236) * (goldenRatioWidth / 2);

	return (
		<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
			{/* 1. Rule of Thirds Grid */}
			{activeGuides.thirds && (
				<g opacity="0.45">
					<line x1="333.3" y1="0" x2="333.3" y2="1000" stroke="var(--paper, #ffffff)" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="666.6" y1="0" x2="666.6" y2="1000" stroke="var(--paper, #ffffff)" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="0" y1="333.3" x2="1000" y2="333.3" stroke="var(--paper, #ffffff)" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="0" y1="666.6" x2="1000" y2="666.6" stroke="var(--paper, #ffffff)" strokeWidth="1.5" strokeDasharray="4 4" />
				</g>
			)}

			{/* 2. Facial Midline */}
			{activeGuides.midline && (
				<g>
					<line x1={500 + midlineOffsetPx} y1="0" x2={500 + midlineOffsetPx} y2="1000" stroke="var(--teal-light, #38bdf8)" strokeWidth="2.5" strokeDasharray="8 6" />
					<rect x={420 + midlineOffsetPx} y="20" width="160" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" />
					<text x={500 + midlineOffsetPx} y="36" textAnchor="middle" fill="var(--teal-light, #38bdf8)" fontSize="12" fontWeight="700">Срединная линия</text>
				</g>
			)}

			{/* 3. Bipupillary Guide Line */}
			{activeGuides.bipupillary && (
				<g transform={`rotate(${bipupillaryTiltDegrees}, 500, 380)`}>
					<line x1="50" y1="380" x2="950" y2="380" stroke="var(--teal, #06b6d4)" strokeWidth="3" />
					<circle cx="320" cy="380" r="16" stroke="var(--teal, #06b6d4)" strokeWidth="2" fill="none" />
					<circle cx="680" cy="380" r="16" stroke="var(--teal, #06b6d4)" strokeWidth="2" fill="none" />
					<rect x="360" y="340" width="280" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" />
					<text x="500" y="356" textAnchor="middle" fill="var(--teal, #06b6d4)" fontSize="12" fontWeight="700">
						Межзрачковая линия ({bipupillaryTiltDegrees !== 0 ? `${bipupillaryTiltDegrees > 0 ? '+' : ''}${bipupillaryTiltDegrees.toFixed(1)}°` : '0.0°'})
					</text>
				</g>
			)}

			{/* 4. Incisal Edge Guide */}
			{activeGuides.incisal && (
				<g transform={`rotate(${incisalCantingDegrees}, 500, 640)`}>
					<line x1="100" y1="640" x2="900" y2="640" stroke="var(--green, #10b981)" strokeWidth="3" />
					<rect x="350" y="660" width="300" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" />
					<text x="500" y="676" textAnchor="middle" fill="var(--green, #10b981)" fontSize="12" fontWeight="700">
						Резцовый край ({incisalCantingDegrees !== 0 ? `${incisalCantingDegrees > 0 ? '+' : ''}${incisalCantingDegrees.toFixed(1)}°` : '0.0°'})
					</text>
				</g>
			)}

			{/* 5. Golden Proportion Wheeler 2.5D */}
			{activeGuides.goldenRatio && (
				<g opacity="0.8">
					<rect x={500 - cW} y="580" width={cW} height="100" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="3 2" />
					<rect x="500" y="580" width={cW} height="100" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="3 2" />
					<rect x={500 - cW - lW} y="585" width={lW} height="88" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="3 2" />
					<rect x={500 + cW} y="585" width={lW} height="88" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="3 2" />
					<rect x={500 - cW - lW - kW} y="590" width={kW} height="95" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="3 2" />
					<rect x={500 + cW + lW} y="590" width={kW} height="95" fill="none" stroke="#eab308" strokeWidth="1.8" strokeDasharray="3 2" />
				</g>
			)}
		</svg>
	);
};

export default IncisalAlignmentGuideOverlay;
