import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
	Sparkles,
	X,
	Maximize2,
	Upload,
	RotateCw,
	Sliders,
	Camera,
	FileText,
	Layers,
	ChevronRight,
	Image as ImageIcon,
} from 'lucide-react';
import type { DsdAnalysisData } from '@dental/shared';
import {
	DsdCanvasOverlay,
	type DsdCanvasGuideFlags,
	type DsdFacialLandmarks,
	type DsdCalibrationState,
} from './dsd/DsdCanvasOverlay';
import { DsdMetricsSidebar } from './dsd/DsdMetricsSidebar';
import { showToast } from '../GlobalToast';
import { compressChairsidePhotoToBlobUrl } from './chairsidePhotoCompressor';
import type { DsdPatientPhotoOption } from './dsd/DsdAestheticStudioModal';

export type { DsdPatientPhotoOption };

// Каноническое эталонное клиническое фото портрета улыбки для демонстрации и калибровки
export const DEFAULT_CLINICAL_SMILE_PHOTO =
	'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="%230f172a"/><circle cx="500" cy="500" r="380" fill="%231e293b"/><circle cx="340" cy="380" r="30" fill="%23334155"/><circle cx="660" cy="380" r="30" fill="%23334155"/><circle cx="340" cy="380" r="12" fill="%2306b6d4"/><circle cx="660" cy="380" r="12" fill="%2306b6d4"/><ellipse cx="500" cy="520" rx="35" ry="20" fill="%23334155"/><path d="M 280 620 Q 500 740 720 620" stroke="%23e2e8f0" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M 290 625 Q 500 730 710 625" stroke="%230f172a" stroke-width="12" fill="none"/><text x="500" y="860" font-family="sans-serif" font-size="20" fill="%2394a3b8" text-anchor="middle" font-weight="bold">Клинический фотопротокол DSD: анфас с улыбкой</text></svg>';

export interface DigitalSmileDesignModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	doctorName?: string;
	clinicName?: string;
	initialPhotoUrl?: string;
	patientPhotos?: DsdPatientPhotoOption[];
	slotId?: string;
	onApplySuccess?: (analysis: Partial<DsdAnalysisData>) => void;
}

export const DigitalSmileDesignModal: React.FC<DigitalSmileDesignModalProps> = ({
	isOpen,
	onClose,
	patientId = 'chairside',
	patientName = 'Пациент',
	doctorName = 'Лечащий врач',
	clinicName = 'DENTE CLINIC',
	initialPhotoUrl,
	patientPhotos = [],
	slotId = 'portrait_smile',
	onApplySuccess,
}) => {
	const effectivePhotos = useMemo<DsdPatientPhotoOption[]>(() => {
		const list: DsdPatientPhotoOption[] = [];
		if (initialPhotoUrl) {
			list.push({ id: 'initial_photo', url: initialPhotoUrl, label: 'Выбранный снимок' });
		}
		for (const p of patientPhotos) {
			if (!list.some((existing) => existing.url === p.url)) {
				list.push(p);
			}
		}
		if (list.length === 0) {
			list.push({ id: 'default_template', url: DEFAULT_CLINICAL_SMILE_PHOTO, label: 'Клинический эталон' });
		}
		return list;
	}, [initialPhotoUrl, patientPhotos]);

	const [photoUrl, setPhotoUrl] = useState<string>(
		() => initialPhotoUrl || effectivePhotos[0]?.url || DEFAULT_CLINICAL_SMILE_PHOTO,
	);

	useEffect(() => {
		if (initialPhotoUrl) {
			setPhotoUrl(initialPhotoUrl);
		} else if (effectivePhotos.length > 0 && !photoUrl) {
			setPhotoUrl(effectivePhotos[0]!.url);
		}
	}, [initialPhotoUrl, effectivePhotos]);

	const [rotationDegrees, setRotationDegrees] = useState<number>(0);
	const [activeMobileTab, setActiveMobileTab] = useState<'canvas' | 'metrics'>('canvas');
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	// Освобождение Blob URL из памяти браузера при размонтировании (PHO-04)
	useEffect(() => {
		const blobSet = createdBlobUrlsRef.current;
		return () => {
			for (const u of blobSet) {
				URL.revokeObjectURL(u);
			}
			blobSet.clear();
		};
	}, []);

	// Переключатели направляющих
	const [guides, setGuides] = useState<DsdCanvasGuideFlags>({
		bipupillary: true,
		midline: true,
		smileArc: true,
		goldenRatio: true,
		calibration: true,
	});

	// Интерактивные анатомические ориентиры (в координатах SVG 1000x1000)
	const [landmarks, setLandmarks] = useState<DsdFacialLandmarks>({
		leftPupil: { x: 340, y: 380 },
		rightPupil: { x: 660, y: 380 },
		midlineTop: { x: 500, y: 150 },
		midlineBottom: { x: 500, y: 850 },
		commissureLeft: { x: 280, y: 620 },
		commissureRight: { x: 720, y: 620 },
		smileArcCenter: { x: 500, y: 690 },
		incisalCenter: { x: 500, y: 670 },
		teethArchOrigin: { x: 500, y: 580 },
		teethArchWidth: 380,
		teethArchHeight: 110,
	});

	// Калибровочная линейка (10 мм)
	const [calibration, setCalibration] = useState<DsdCalibrationState>({
		p1: { x: 450, y: 540 },
		p2: { x: 550, y: 540 },
		knownMm: 10,
	});

	const handleToggleGuide = useCallback((key: keyof DsdCanvasGuideFlags) => {
		setGuides((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const handleRotatePhoto = useCallback((delta: number) => {
		setRotationDegrees((prev) => (prev + delta) % 360);
	}, []);

	// Автовыравнивание горизонта фото по зрачкам
	const handleAutoLevel = useCallback(() => {
		const dx = landmarks.rightPupil.x - landmarks.leftPupil.x;
		const dy = landmarks.rightPupil.y - landmarks.leftPupil.y;
		const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
		setRotationDegrees(-angle);
		showToast(`Горизонт фото выровнен по зрачковой линии (${(-angle).toFixed(1)}°)`, 'success');
	}, [landmarks.leftPupil, landmarks.rightPupil]);

	// Сброс ориентиров к эстетической норме
	const handleResetToNorm = useCallback(() => {
		setLandmarks({
			leftPupil: { x: 340, y: 380 },
			rightPupil: { x: 660, y: 380 },
			midlineTop: { x: 500, y: 150 },
			midlineBottom: { x: 500, y: 850 },
			commissureLeft: { x: 280, y: 620 },
			commissureRight: { x: 720, y: 620 },
			smileArcCenter: { x: 500, y: 690 },
			incisalCenter: { x: 500, y: 670 },
			teethArchOrigin: { x: 500, y: 580 },
			teethArchWidth: 380,
			teethArchHeight: 110,
		});
		setRotationDegrees(0);
		showToast('Направляющие DSD возвращены к канонической норме', 'info');
	}, []);

	// Загрузка собственного фото пациента со сжатием Canvas WebP (PHO-04)
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const comp = await compressChairsidePhotoToBlobUrl(file, {
				maxDimension: 1920,
				quality: 0.85,
			}).catch(() => null);

			const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(blobUrl);
			setPhotoUrl(blobUrl);
			showToast('Фото пациента загружено и оптимизировано для DSD студии', 'success');
		} catch (err) {
			console.error('[DigitalSmileDesignModal] Photo upload compression error:', err);
			const fallbackUrl = URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(fallbackUrl);
			setPhotoUrl(fallbackUrl);
		}
	};

	// Применение к плану лечения и заказ-наряду ЗТЛ в 1 клик (Мандаты 8e, 8k, PHO-02)
	const handleApplyToTreatmentPlanAndLab = useCallback(
		async (analysis: Partial<DsdAnalysisData>) => {
			const fullAnalysisPayload: DsdAnalysisData = {
				id: `dsd_${Date.now()}`,
				photoUrl,
				slotId,
				calibratedMmPerPx: analysis.calibratedMmPerPx ?? 0.05,
				calibrationDistancePx: analysis.calibrationDistancePx ?? 200,
				calibrationKnownMm: analysis.calibrationKnownMm ?? 10,
				bipupillaryTiltDegrees: analysis.bipupillaryTiltDegrees ?? 0,
				facialMidlineOffsetMm: analysis.facialMidlineOffsetMm ?? 0,
				incisalCantingDegrees: analysis.incisalCantingDegrees ?? 0,
				smileArcCurvature: analysis.smileArcCurvature ?? 'consonant',
				smileArcSymmetryPercent: analysis.smileArcSymmetryPercent ?? 95,
				teethMetrics: analysis.teethMetrics ?? [],
				recommendedMaterial: analysis.recommendedMaterial ?? 'emax_lithium_disilicate',
				recommendedVitaShade: analysis.recommendedVitaShade ?? 'A2',
				translucencyLevel: analysis.translucencyLevel ?? 'HT',
				doctorNotes: analysis.doctorNotes,
				createdAt: new Date().toISOString(),
			};

			// 1. Отправляем на бэкенд в фотопротокол пациента
			try {
				if (patientId && patientId !== 'chairside') {
					await fetch(`/api/patients/${patientId}/photo-protocol`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							presetId: 'dsd_aesthetic_protocol',
							slots: { [slotId]: { imageUrl: photoUrl, dsdAnalysis: fullAnalysisPayload } },
							stage: 'before',
							notes: `DSD анализ: материал ${fullAnalysisPayload.recommendedMaterial}, оттенок ${fullAnalysisPayload.recommendedVitaShade}, дуга ${fullAnalysisPayload.smileArcCurvature}`,
							dsdAnalysis: fullAnalysisPayload,
						}),
					}).catch(() => null);
				}
			} catch {}

			// 2. Диспатчим каноническое событие в заказ-наряд зуботехнической лаборатории ЗТЛ (Мандат 8aq)
			if (typeof window !== 'undefined') {
				const labDetail = {
					patientId,
					patientName,
					doctorName,
					teeth: [13, 12, 11, 21, 22, 23],
					toothFdi: 11,
					material: fullAnalysisPayload.recommendedMaterial,
					colorVita: fullAnalysisPayload.recommendedVitaShade,
					notes: `[DSD Эстетический дизайн]: Ширина 11/21: 8.5 мм (пропорция 1.618), цвет ${fullAnalysisPayload.recommendedVitaShade} (${fullAnalysisPayload.translucencyLevel}). ${fullAnalysisPayload.doctorNotes || ''}`,
					dsdAnalysis: fullAnalysisPayload,
				};

				window.dispatchEvent(new CustomEvent('dente-open-lab-order-modal', { detail: labDetail }));
				window.dispatchEvent(new CustomEvent('dente-apply-dsd-to-treatment-plan', { detail: labDetail }));
			}

			showToast('Параметры DSD успешно перенесены в заказ-наряд лаборатории и план лечения!', 'success');
			onApplySuccess?.(fullAnalysisPayload);
			onClose();
		},
		[photoUrl, slotId, patientId, patientName, doctorName, onApplySuccess, onClose],
	);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden select-none animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			data-testid="digital-smile-design-modal"
			data-qa="dsd-aesthetic-studio-modal"
		>
			<div className="relative w-full h-full max-w-7xl max-h-[96vh] max-sm:max-h-full bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
				{/* Apple HIG: Mobile Drag Handle */}
				<div className="sm:hidden w-10 h-[5px] bg-slate-400 dark:bg-slate-600 rounded-full mx-auto my-2 shrink-0" aria-hidden="true" />

				{/* 1. Шапка студии DSD */}
				<header className="px-3 sm:px-6 py-2 sm:py-3 border-b border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 flex items-center justify-between shrink-0 gap-2 min-w-0">
					<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 min-w-0">
								<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 truncate">
									Digital Smile Design (DSD)
								</h2>
								<span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
									Wheeler 2.5D
								</span>
							</div>
							<div className="text-xs text-[var(--muted,#64748b)] truncate">
								Пациент: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-200">{patientName}</strong>
								<span className="hidden sm:inline"> • Врач: {doctorName}</span>
							</div>
						</div>
					</div>

					{/* Тулбар действий шапки */}
					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						{effectivePhotos.length > 1 && (
							<select
								value={photoUrl}
								onChange={(e) => setPhotoUrl(e.target.value)}
								className="text-xs px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer max-w-[130px] truncate"
								title="Выбрать снимок пациента"
							>
								{effectivePhotos.map((p) => (
									<option key={p.id} value={p.url}>
										{p.label || p.id}
									</option>
								))}
							</select>
						)}

						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[36px] shrink-0"
							title="Загрузить другое фото"
						>
							<Upload className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Загрузить фото</span>
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleFileChange}
						/>

						<button
							type="button"
							onClick={onClose}
							className="p-1.5 sm:p-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
							title="Закрыть студию DSD"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* Переключатель мобильных вкладок (Apple Segmented Control на смартфонах) */}
				<div className="sm:hidden px-3 py-1.5 border-b border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 flex shrink-0">
					<div className="grid grid-cols-2 w-full p-0.5 rounded-xl bg-slate-200 dark:bg-slate-800">
						<button
							type="button"
							onClick={() => setActiveMobileTab('canvas')}
							className={`py-1.5 text-xs font-bold rounded-lg transition ${
								activeMobileTab === 'canvas'
									? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
									: 'text-slate-600 dark:text-slate-400'
							}`}
						>
							Холст и направляющие
						</button>
						<button
							type="button"
							onClick={() => setActiveMobileTab('metrics')}
							className={`py-1.5 text-xs font-bold rounded-lg transition ${
								activeMobileTab === 'metrics'
									? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
									: 'text-slate-600 dark:text-slate-400'
							}`}
						>
							Замеры и ЗТЛ
						</button>
					</div>
				</div>

				{/* 2. Основная рабочая область: Сплит-экран */}
				<div className="flex-1 flex overflow-hidden">
					{/* Интерактивный холст (слева) */}
					<div
						className={`flex-1 relative flex items-center justify-center p-2 sm:p-4 bg-slate-950 overflow-hidden ${
							activeMobileTab === 'canvas' ? 'flex' : 'max-sm:hidden'
						}`}
					>
						<DsdCanvasOverlay
							imageUrl={photoUrl}
							guides={guides}
							landmarks={landmarks}
							calibration={calibration}
							rotationDegrees={rotationDegrees}
							onLandmarksChange={setLandmarks}
							onCalibrationChange={setCalibration}
						/>
					</div>

					{/* Правая панель метрик и ЗТЛ спецификации (340px) */}
					<div
						className={`w-full sm:w-[360px] lg:w-[400px] shrink-0 h-full ${
							activeMobileTab === 'metrics' ? 'block' : 'max-sm:hidden'
						}`}
					>
						<DsdMetricsSidebar
							landmarks={landmarks}
							calibration={calibration}
							guides={guides}
							rotationDegrees={rotationDegrees}
							onToggleGuide={handleToggleGuide}
							onRotatePhoto={handleRotatePhoto}
							onAutoLevel={handleAutoLevel}
							onApplyToTreatmentPlanAndLab={handleApplyToTreatmentPlanAndLab}
							onResetToNorm={handleResetToNorm}
						/>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document === 'undefined') return null;
	return createPortal(modalContent, document.body);
};

export default DigitalSmileDesignModal;
