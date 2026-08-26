import React from 'react';

export type GuideOverlayType = 'bipupillary' | 'incisal' | 'midline' | 'golden_ratio' | 'thirds';

export interface IncisalAlignmentGuideOverlayProps {
	activeGuides: Record<GuideOverlayType, boolean>;
	bipupillaryTiltDegrees?: number;
	incisalCantingDegrees?: number;
}

export const IncisalAlignmentGuideOverlay: React.FC<IncisalAlignmentGuideOverlayProps> = ({
	activeGuides,
	bipupillaryTiltDegrees = 0,
	incisalCantingDegrees = 0,
}) => {
	const hasAnyGuide = Object.values(activeGuides).some(Boolean);
	if (!hasAnyGuide) return null;

	return (
		<svg
			viewBox="0 0 1000 1000"
			preserveAspectRatio="none"
			style={{
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none',
				zIndex: 20,
			}}
		>
			{/* 1. Rule of Thirds Grid */}
			{activeGuides.thirds && (
				<g opacity="0.45">
					<line x1="333.3" y1="0" x2="333.3" y2="1000" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="666.6" y1="0" x2="666.6" y2="1000" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="0" y1="333.3" x2="1000" y2="333.3" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="0" y1="666.6" x2="1000" y2="666.6" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
				</g>
			)}

			{/* 2. Facial Midline (Срединно-лицевая линия) */}
			{activeGuides.midline && (
				<g>
					<line
						x1="500"
						y1="0"
						x2="500"
						y2="1000"
						stroke="#38bdf8"
						strokeWidth="2.5"
						strokeDasharray="8 6"
					/>
					{/* Millimeter ticks along midline */}
					{[200, 300, 400, 500, 600, 700, 800].map((y) => (
						<line key={y} x1="490" y1={y} x2="510" y2={y} stroke="#38bdf8" strokeWidth="1.5" />
					))}
					<rect x="420" y="20" width="160" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" />
					<text
						x="500"
						y="36"
						textAnchor="middle"
						fill="#38bdf8"
						fontSize="12"
						fontWeight="700"
						fontFamily="sans-serif"
					>
						Срединная линия
					</text>
				</g>
			)}

			{/* 3. Bipupillary Guide Line (Межзрачковая линия) */}
			{activeGuides.bipupillary && (
				<g transform={`rotate(${bipupillaryTiltDegrees}, 500, 380)`}>
					<line
						x1="50"
						y1="380"
						x2="950"
						y2="380"
						stroke="#06b6d4"
						strokeWidth="3"
					/>
					{/* Eye pupil crosshairs */}
					<circle cx="320" cy="380" r="16" stroke="#06b6d4" strokeWidth="2" fill="none" />
					<circle cx="320" cy="380" r="3" fill="#06b6d4" />
					<circle cx="680" cy="380" r="16" stroke="#06b6d4" strokeWidth="2" fill="none" />
					<circle cx="680" cy="380" r="3" fill="#06b6d4" />

					<rect x="360" y="340" width="280" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" />
					<text
						x="500"
						y="356"
						textAnchor="middle"
						fill="#06b6d4"
						fontSize="12"
						fontWeight="700"
						fontFamily="sans-serif"
					>
						Межзрачковая линия ({bipupillaryTiltDegrees !== 0 ? `${bipupillaryTiltDegrees > 0 ? '+' : ''}${bipupillaryTiltDegrees.toFixed(1)}°` : '0.0° Норма'})
					</text>
				</g>
			)}

			{/* 4. Incisal Edge Guide (Резцовая линия и край) */}
			{activeGuides.incisal && (
				<g transform={`rotate(${incisalCantingDegrees}, 500, 640)`}>
					<line
						x1="100"
						y1="640"
						x2="900"
						y2="640"
						stroke="#10b981"
						strokeWidth="3"
					/>
					{/* Central incisors contact point marker */}
					<polygon points="500,626 492,640 508,640" fill="#10b981" />
					<polygon points="500,654 492,640 508,640" fill="#10b981" />

					{/* Lateral canting indicators */}
					<line x1="250" y1="625" x2="250" y2="655" stroke="#10b981" strokeWidth="2" />
					<line x1="750" y1="625" x2="750" y2="655" stroke="#10b981" strokeWidth="2" />

					<rect x="350" y="660" width="300" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" />
					<text
						x="500"
						y="676"
						textAnchor="middle"
						fill="#10b981"
						fontSize="12"
						fontWeight="700"
						fontFamily="sans-serif"
					>
						Резцовый край ({incisalCantingDegrees !== 0 ? `Крен: ${incisalCantingDegrees > 0 ? '+' : ''}${incisalCantingDegrees.toFixed(1)}°` : '0.0° Горизонт'})
					</text>
				</g>
			)}

			{/* 5. Golden Ratio Smile Curvature (Золотое сечение дуги улыбки) */}
			{activeGuides.golden_ratio && (
				<g>
					<path
						d="M 220 590 Q 500 750 780 590"
						fill="none"
						stroke="#eab308"
						strokeWidth="3"
						strokeDasharray="10 6"
					/>
					<rect x="360" y="760" width="280" height="24" rx="4" fill="rgba(15, 23, 42, 0.85)" />
					<text
						x="500"
						y="776"
						textAnchor="middle"
						fill="#eab308"
						fontSize="12"
						fontWeight="700"
						fontFamily="sans-serif"
					>
						Золотая кривая улыбки (1 : 0.618)
					</text>
				</g>
			)}
		</svg>
	);
};
