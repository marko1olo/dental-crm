import React, { useRef, useState, useCallback, useMemo } from 'react';
import type { DsdPoint2D } from '@dental/shared';

export interface DsdCanvasGuideFlags {
	bipupillary: boolean;
	midline: boolean;
	smileArc: boolean;
	goldenRatio: boolean;
	calibration: boolean;
}

export interface DsdCalibrationState {
	p1: DsdPoint2D;
	p2: DsdPoint2D;
	knownMm: number;
}

export interface DsdFacialLandmarks {
	leftPupil: DsdPoint2D;
	rightPupil: DsdPoint2D;
	midlineTop: DsdPoint2D;
	midlineBottom: DsdPoint2D;
	commissureLeft: DsdPoint2D;
	commissureRight: DsdPoint2D;
	smileArcCenter: DsdPoint2D;
	incisalCenter: DsdPoint2D;
	teethArchOrigin: DsdPoint2D;
	teethArchWidth: number;
	teethArchHeight: number;
}

export interface DsdCanvasOverlayProps {
	imageUrl: string;
	guides: DsdCanvasGuideFlags;
	landmarks: DsdFacialLandmarks;
	calibration: DsdCalibrationState;
	rotationDegrees: number;
	onLandmarksChange: (landmarks: DsdFacialLandmarks) => void;
	onCalibrationChange: (calibration: DsdCalibrationState) => void;
	onAutoLevelClick?: () => void;
}

export const DsdCanvasOverlay: React.FC<DsdCanvasOverlayProps> = ({
	imageUrl,
	guides,
	landmarks,
	calibration,
	rotationDegrees,
	onLandmarksChange,
	onCalibrationChange,
}) => {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [activeDragId, setActiveDragId] = useState<string | null>(null);

	// Преобразование координат курсора/тача в локальные координаты SVG (0..1000)
	const getSvgCoords = useCallback(
		(clientX: number, clientY: number): DsdPoint2D | null => {
			if (!svgRef.current) return null;
			const rect = svgRef.current.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return null;
			const x = Math.max(0, Math.min(1000, ((clientX - rect.left) / rect.width) * 1000));
			const y = Math.max(0, Math.min(1000, ((clientY - rect.top) / rect.height) * 1000));
			return { x, y };
		},
		[],
	);

	const handlePointerDown = (dragId: string) => (e: React.PointerEvent) => {
		e.stopPropagation();
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		setActiveDragId(dragId);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!activeDragId) return;
		const pt = getSvgCoords(e.clientX, e.clientY);
		if (!pt) return;

		switch (activeDragId) {
			case 'leftPupil':
				onLandmarksChange({ ...landmarks, leftPupil: pt });
				break;
			case 'rightPupil':
				onLandmarksChange({ ...landmarks, rightPupil: pt });
				break;
			case 'midlineTop':
				onLandmarksChange({ ...landmarks, midlineTop: { x: pt.x, y: landmarks.midlineTop.y } });
				break;
			case 'midlineBottom':
				onLandmarksChange({ ...landmarks, midlineBottom: { x: pt.x, y: landmarks.midlineBottom.y } });
				break;
			case 'commissureLeft':
				onLandmarksChange({ ...landmarks, commissureLeft: pt });
				break;
			case 'commissureRight':
				onLandmarksChange({ ...landmarks, commissureRight: pt });
				break;
			case 'smileArcCenter':
				onLandmarksChange({ ...landmarks, smileArcCenter: pt });
				break;
			case 'teethArchOrigin':
				onLandmarksChange({ ...landmarks, teethArchOrigin: pt });
				break;
			case 'calib_p1':
				onCalibrationChange({ ...calibration, p1: pt });
				break;
			case 'calib_p2':
				onCalibrationChange({ ...calibration, p2: pt });
				break;
			default:
				break;
		}
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (activeDragId) {
			try {
				(e.target as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {}
			setActiveDragId(null);
		}
	};

	// Вычисление угла межзрачковой линии
	const bipupillaryAngle = useMemo(() => {
		const dx = landmarks.rightPupil.x - landmarks.leftPupil.x;
		const dy = landmarks.rightPupil.y - landmarks.leftPupil.y;
		return (Math.atan2(dy, dx) * 180) / Math.PI;
	}, [landmarks.leftPupil, landmarks.rightPupil]);

	// Золотая пропорция Wheeler: 1.618 : 1.0 : 0.618
	// Полная полудуга для 3 зубов (клык, боковой, центральный) = 0.618 + 1.0 + 1.618 = 3.236
	const toothWidthFactors = useMemo(() => {
		// Относительные ширины: 13, 12, 11 | 21, 22, 23
		const c = 1.618;
		const l = 1.0;
		const k = 0.618;
		const halfTotal = c + l + k; // 3.236
		return { c, l, k, halfTotal };
	}, []);

	// Построение сегментов зубной дуги
	const archSegments = useMemo(() => {
		const origin = landmarks.teethArchOrigin;
		const totalWidth = landmarks.teethArchWidth;
		const height = landmarks.teethArchHeight;
		const halfW = totalWidth / 2;

		const cW = (toothWidthFactors.c / toothWidthFactors.halfTotal) * halfW;
		const lW = (toothWidthFactors.l / toothWidthFactors.halfTotal) * halfW;
		const kW = (toothWidthFactors.k / toothWidthFactors.halfTotal) * halfW;

		return [
			{ id: 13, label: '13 (Клык)', x: origin.x - halfW, width: kW, height: height * 0.95 },
			{ id: 12, label: '12 (Боковой)', x: origin.x - halfW + kW, width: lW, height: height * 0.88 },
			{ id: 11, label: '11 (Центр)', x: origin.x - halfW + kW + lW, width: cW, height: height },
			{ id: 21, label: '21 (Центр)', x: origin.x, width: cW, height: height },
			{ id: 22, label: '22 (Боковой)', x: origin.x + cW, width: lW, height: height * 0.88 },
			{ id: 23, label: '23 (Клык)', x: origin.x + cW + lW, width: kW, height: height * 0.95 },
		];
	}, [landmarks.teethArchOrigin, landmarks.teethArchWidth, landmarks.teethArchHeight, toothWidthFactors]);

	// Дуга улыбки (Smile Arc) через комиссуры и центр резцового края
	const smileArcPath = useMemo(() => {
		const left = landmarks.commissureLeft;
		const right = landmarks.commissureRight;
		const center = landmarks.smileArcCenter;
		// Квадратичная кривая Безье: от левого уголка через контрольную точку ниже к правому уголку
		const ctrlX = center.x;
		const ctrlY = 2 * center.y - (left.y + right.y) / 2;
		return `M ${left.x} ${left.y} Q ${ctrlX} ${ctrlY} ${right.x} ${right.y}`;
	}, [landmarks.commissureLeft, landmarks.commissureRight, landmarks.smileArcCenter]);

	return (
		<div
			className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden select-none rounded-xl"
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			data-testid="dsd-canvas-container"
		>
			{/* Базовое клиническое изображение пациента */}
			<img
				src={imageUrl}
				alt="Клинический фотопротокол DSD"
				className="w-full h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
				style={{ transform: `rotate(${rotationDegrees}deg)` }}
			/>

			{/* Векторный интерактивный оверлей (1000x1000) */}
			<svg
				ref={svgRef}
				viewBox="0 0 1000 1000"
				preserveAspectRatio="none"
				className="absolute inset-0 w-full h-full pointer-events-auto touch-none"
			>
				{/* 1. Межзрачковая линия (Interpupillary line) */}
				{guides.bipupillary && (
					<g className="dsd-guide-bipupillary">
						<line
							x1={landmarks.leftPupil.x - 300}
							y1={landmarks.leftPupil.y - (300 * Math.tan((bipupillaryAngle * Math.PI) / 180))}
							x2={landmarks.rightPupil.x + 300}
							y2={landmarks.rightPupil.y + (300 * Math.tan((bipupillaryAngle * Math.PI) / 180))}
							stroke="#06b6d4"
							strokeWidth="2.5"
							strokeDasharray="6 4"
						/>
						<line
							x1={landmarks.leftPupil.x}
							y1={landmarks.leftPupil.y}
							x2={landmarks.rightPupil.x}
							y2={landmarks.rightPupil.y}
							stroke="#06b6d4"
							strokeWidth="3.5"
						/>

						{/* Левый зрачок (тач-мишень >=44px) */}
						<g
							transform={`translate(${landmarks.leftPupil.x}, ${landmarks.leftPupil.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('leftPupil')}
							data-testid="handle-left-pupil"
						>
							<circle r="22" fill="transparent" />
							<circle r="12" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
							<circle r="4" fill="#06b6d4" />
						</g>

						{/* Правый зрачок (тач-мишень >=44px) */}
						<g
							transform={`translate(${landmarks.rightPupil.x}, ${landmarks.rightPupil.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('rightPupil')}
							data-testid="handle-right-pupil"
						>
							<circle r="22" fill="transparent" />
							<circle r="12" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
							<circle r="4" fill="#06b6d4" />
						</g>

						{/* Плашка значения угла */}
						<rect
							x={(landmarks.leftPupil.x + landmarks.rightPupil.x) / 2 - 90}
							y={(landmarks.leftPupil.y + landmarks.rightPupil.y) / 2 - 32}
							width="180"
							height="24"
							rx="6"
							fill="rgba(15, 23, 42, 0.85)"
							stroke="#06b6d4"
							strokeWidth="1"
						/>
						<text
							x={(landmarks.leftPupil.x + landmarks.rightPupil.x) / 2}
							y={(landmarks.leftPupil.y + landmarks.rightPupil.y) / 2 - 16}
							textAnchor="middle"
							fill="#38bdf8"
							fontSize="12"
							fontWeight="700"
							letterSpacing="0.05em"
						>
							Зрачки: {bipupillaryAngle >= 0 ? '+' : ''}
							{bipupillaryAngle.toFixed(1)}°
						</text>
					</g>
				)}

				{/* 2. Срединная линия лица (Facial Midline) */}
				{guides.midline && (
					<g className="dsd-guide-midline">
						<line
							x1={landmarks.midlineTop.x}
							y1={landmarks.midlineTop.y}
							x2={landmarks.midlineBottom.x}
							y2={landmarks.midlineBottom.y}
							stroke="#f43f5e"
							strokeWidth="2.5"
							strokeDasharray="8 5"
						/>

						{/* Верхний маркер средней линии */}
						<g
							transform={`translate(${landmarks.midlineTop.x}, ${landmarks.midlineTop.y})`}
							className="cursor-ew-resize"
							onPointerDown={handlePointerDown('midlineTop')}
							data-testid="handle-midline-top"
						>
							<circle r="22" fill="transparent" />
							<polygon points="-8,-12 8,-12 0,-2" fill="#f43f5e" />
							<circle r="4" fill="#f43f5e" />
						</g>

						{/* Нижний маркер средней линии */}
						<g
							transform={`translate(${landmarks.midlineBottom.x}, ${landmarks.midlineBottom.y})`}
							className="cursor-ew-resize"
							onPointerDown={handlePointerDown('midlineBottom')}
							data-testid="handle-midline-bottom"
						>
							<circle r="22" fill="transparent" />
							<polygon points="-8,12 8,12 0,2" fill="#f43f5e" />
							<circle r="4" fill="#f43f5e" />
						</g>
					</g>
				)}

				{/* 3. Дуга улыбки (Smile Arc) */}
				{guides.smileArc && (
					<g className="dsd-guide-smile-arc">
						<path d={smileArcPath} fill="none" stroke="#10b981" strokeWidth="3" />

						{/* Левая комиссура */}
						<g
							transform={`translate(${landmarks.commissureLeft.x}, ${landmarks.commissureLeft.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('commissureLeft')}
							data-testid="handle-commissure-left"
						>
							<circle r="22" fill="transparent" />
							<circle r="8" fill="#10b981" />
						</g>

						{/* Правая комиссура */}
						<g
							transform={`translate(${landmarks.commissureRight.x}, ${landmarks.commissureRight.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('commissureRight')}
							data-testid="handle-commissure-right"
						>
							<circle r="22" fill="transparent" />
							<circle r="8" fill="#10b981" />
						</g>

						{/* Нижняя контрольная точка изгиба дуги улыбки */}
						<g
							transform={`translate(${landmarks.smileArcCenter.x}, ${landmarks.smileArcCenter.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('smileArcCenter')}
							data-testid="handle-smile-arc-center"
						>
							<circle r="22" fill="transparent" />
							<circle r="10" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 3" />
							<circle r="5" fill="#10b981" />
						</g>
					</g>
				)}

				{/* 4. Золотое сечение 1.618 : 1.0 : 0.618 Wheeler 2.5D */}
				{guides.goldenRatio && (
					<g className="dsd-guide-golden-ratio">
						{/* Контуры и разметка резцов 13..23 */}
						{archSegments.map((seg) => (
							<g key={seg.id} className="dsd-tooth-box">
								{/* Анатомическая рамка зуба Wheeler */}
								<rect
									x={seg.x}
									y={landmarks.teethArchOrigin.y}
									width={seg.width}
									height={seg.height}
									rx="8"
									fill="rgba(234, 179, 8, 0.12)"
									stroke="#eab308"
									strokeWidth="1.8"
									strokeDasharray="4 2"
								/>
								{/* Подпись зуба */}
								<rect
									x={seg.x + 2}
									y={landmarks.teethArchOrigin.y + 4}
									width={seg.width - 4}
									height="16"
									rx="3"
									fill="rgba(15, 23, 42, 0.85)"
								/>
								<text
									x={seg.x + seg.width / 2}
									y={landmarks.teethArchOrigin.y + 16}
									textAnchor="middle"
									fill="#facc15"
									fontSize="10"
									fontWeight="700"
								>
									{seg.id}
								</text>
							</g>
						))}

						{/* Центральная ручка перемещения всей сетки зубов */}
						<g
							transform={`translate(${landmarks.teethArchOrigin.x}, ${landmarks.teethArchOrigin.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('teethArchOrigin')}
							data-testid="handle-teeth-origin"
						>
							<circle r="24" fill="transparent" />
							<circle r="12" fill="#eab308" stroke="#ffffff" strokeWidth="2" />
							<text x="0" y="4" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="900">
								DSD
							</text>
						</g>
					</g>
				)}

				{/* 5. Калибровочная линейка (10 мм) */}
				{guides.calibration && (
					<g className="dsd-guide-calibration">
						<line
							x1={calibration.p1.x}
							y1={calibration.p1.y}
							x2={calibration.p2.x}
							y2={calibration.p2.y}
							stroke="#c084fc"
							strokeWidth="3"
						/>

						{/* Точка P1 калибровки */}
						<g
							transform={`translate(${calibration.p1.x}, ${calibration.p1.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('calib_p1')}
							data-testid="handle-calib-p1"
						>
							<circle r="22" fill="transparent" />
							<circle r="9" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
						</g>

						{/* Точка P2 калибровки */}
						<g
							transform={`translate(${calibration.p2.x}, ${calibration.p2.y})`}
							className="cursor-move"
							onPointerDown={handlePointerDown('calib_p2')}
							data-testid="handle-calib-p2"
						>
							<circle r="22" fill="transparent" />
							<circle r="9" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />
						</g>

						{/* Лейбл калибровки */}
						<rect
							x={(calibration.p1.x + calibration.p2.x) / 2 - 50}
							y={(calibration.p1.y + calibration.p2.y) / 2 - 28}
							width="100"
							height="22"
							rx="4"
							fill="rgba(15, 23, 42, 0.9)"
							stroke="#c084fc"
							strokeWidth="1"
						/>
						<text
							x={(calibration.p1.x + calibration.p2.x) / 2}
							y={(calibration.p1.y + calibration.p2.y) / 2 - 13}
							textAnchor="middle"
							fill="#e9d5ff"
							fontSize="11"
							fontWeight="700"
						>
							{calibration.knownMm} мм
						</text>
					</g>
				)}
			</svg>
		</div>
	);
};
