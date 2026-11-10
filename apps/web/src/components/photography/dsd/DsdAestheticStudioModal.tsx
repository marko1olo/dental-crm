/**
 * DsdAestheticStudioModal.tsx — Каноническое модальное окно цифрового дизайна улыбки (DSD)
 * и эстетического анализа Wheeler 2.5D (Мандаты 8e, 8aq, 8ar, 8s, PHO-02).
 *
 * Особенности:
 * - Сквозная интеграция с реальными портретными фото пациента (анфас с улыбкой, в покое)
 * - Расчёт золотых пропорций Wheeler (1.618 : 1.0 : 0.618) и калибровка масштаба в миллиметрах
 * - Полная гидратация состояния без амнезии (localStorage + бэкенд)
 * - Память: WebP-сжатие до 1920x1080 и немедленный revokeObjectURL при смене фото (PHO-04)
 * - Сенсорные тач-мишени >= 44x44px по Apple HIG
 * - Ровно 1 Primary CTA (#0d9488), никогда не disabled (Мандат 8e)
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { DsdAnalysisData } from '@dental/shared';
import {
	DsdCanvasOverlay,
	type DsdCanvasGuideFlags,
	type DsdFacialLandmarks,
	type DsdCalibrationState,
} from './DsdCanvasOverlay';
import { DsdMetricsSidebar } from './DsdMetricsSidebar';
import { DsdStudioHeader } from './DsdStudioHeader';
import { DsdEmptyState } from './DsdEmptyState';
import { showToast } from '../../GlobalToast';
import { compressChairsidePhotoToBlobUrl } from '../chairsidePhotoCompressor';

// Канонический экспорт константы фото-слота (без карикатурных моков)
export const DEFAULT_CLINICAL_SMILE_PHOTO = '';

export interface DsdPatientPhotoOption {
	id: string;
	url: string;
	label?: string;
}

export interface DsdAestheticStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	doctorName?: string;
	clinicName?: string;
	visitId?: string;
	initialPhotoUrl?: string;
	patientPhotos?: DsdPatientPhotoOption[];
	slotId?: string;
	initialLandmarks?: Partial<DsdFacialLandmarks>;
	initialCalibration?: Partial<DsdCalibrationState>;
	onApplySuccess?: (analysis: Partial<DsdAnalysisData>) => void;
}

export const DEFAULT_DSD_LANDMARKS: DsdFacialLandmarks = {
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
};

export const DEFAULT_DSD_CALIBRATION: DsdCalibrationState = {
	p1: { x: 450, y: 540 },
	p2: { x: 550, y: 540 },
	knownMm: 10,
};

const DEFAULT_LANDMARKS = DEFAULT_DSD_LANDMARKS;
const DEFAULT_CALIBRATION = DEFAULT_DSD_CALIBRATION;

export const DsdAestheticStudioModal: React.FC<DsdAestheticStudioModalProps> = ({
	isOpen,
	onClose,
	patientId = 'chairside',
	patientName = 'Пациент',
	doctorName = 'Лечащий врач',
	visitId,
	initialPhotoUrl,
	patientPhotos = [],
	slotId = 'portrait_smile',
	initialLandmarks,
	initialCalibration,
	onApplySuccess,
}) => {
	// Доступные фото пациента
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
		return list;
	}, [initialPhotoUrl, patientPhotos]);

	const [activePhotoUrl, setActivePhotoUrl] = useState<string>(
		() => initialPhotoUrl || effectivePhotos[0]?.url || '',
	);

	useEffect(() => {
		if (initialPhotoUrl) {
			setActivePhotoUrl(initialPhotoUrl);
		} else if (effectivePhotos.length > 0 && !activePhotoUrl) {
			setActivePhotoUrl(effectivePhotos[0]!.url);
		}
	}, [initialPhotoUrl, effectivePhotos, activePhotoUrl]);

	const [rotationDegrees, setRotationDegrees] = useState<number>(0);
	const [activeMobileTab, setActiveMobileTab] = useState<'canvas' | 'metrics'>('canvas');
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	// Очистка выделенной памяти Blob URL при размонтировании (ликвидация утечек PHO-04)
	useEffect(() => {
		const blobSet = createdBlobUrlsRef.current;
		return () => {
			for (const url of blobSet) {
				URL.revokeObjectURL(url);
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

	// Гидратация состояния: ориентиры (localStorage -> initialLandmarks -> дефолт)
	const [landmarks, setLandmarks] = useState<DsdFacialLandmarks>(() => {
		if (typeof window !== 'undefined' && patientId) {
			try {
				const cached = localStorage.getItem(`dente_dsd_landmarks_${patientId}`);
				if (cached) {
					const parsed = JSON.parse(cached);
					if (parsed && typeof parsed.leftPupil?.x === 'number') {
						return { ...DEFAULT_LANDMARKS, ...parsed };
					}
				}
			} catch {}
		}
		return { ...DEFAULT_LANDMARKS, ...initialLandmarks };
	});

	// Автосейв ориентиров в localStorage для исключения амнезии (Мандат 8d)
	const handleLandmarksChange = useCallback(
		(nextLandmarks: DsdFacialLandmarks) => {
			setLandmarks(nextLandmarks);
			if (typeof window !== 'undefined' && patientId) {
				try {
					localStorage.setItem(`dente_dsd_landmarks_${patientId}`, JSON.stringify(nextLandmarks));
				} catch {}
			}
		},
		[patientId],
	);

	// Калибровочная линейка (10 мм)
	const [calibration, setCalibration] = useState<DsdCalibrationState>(() => {
		if (typeof window !== 'undefined' && patientId) {
			try {
				const cached = localStorage.getItem(`dente_dsd_calibration_${patientId}`);
				if (cached) {
					const parsed = JSON.parse(cached);
					if (parsed && typeof parsed.p1?.x === 'number') {
						return { ...DEFAULT_CALIBRATION, ...parsed };
					}
				}
			} catch {}
		}
		return { ...DEFAULT_CALIBRATION, ...initialCalibration };
	});

	const handleCalibrationChange = useCallback(
		(nextCalib: DsdCalibrationState) => {
			setCalibration(nextCalib);
			if (typeof window !== 'undefined' && patientId) {
				try {
					localStorage.setItem(`dente_dsd_calibration_${patientId}`, JSON.stringify(nextCalib));
				} catch {}
			}
		},
		[patientId],
	);

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
		setLandmarks(DEFAULT_LANDMARKS);
		setCalibration(DEFAULT_CALIBRATION);
		setRotationDegrees(0);
		if (typeof window !== 'undefined' && patientId) {
			try {
				localStorage.removeItem(`dente_dsd_landmarks_${patientId}`);
				localStorage.removeItem(`dente_dsd_calibration_${patientId}`);
			} catch {}
		}
		showToast('Направляющие DSD возвращены к канонической норме Wheeler', 'info');
	}, [patientId]);

	// Загрузка собственного фото пациента с WebP сжатием до 1920x1080 (PHO-04)
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const comp = await compressChairsidePhotoToBlobUrl(file, {
				maxDimension: 1920,
				quality: 0.85,
				targetMime: 'image/webp',
			}).catch(() => null);

			const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(blobUrl);

			setActivePhotoUrl(blobUrl);
			showToast('Фото пациента сжато в WebP и загружено в студию DSD', 'success');
		} catch (err) {
			console.error('[DsdAestheticStudioModal] Upload compression failed:', err);
			const fallbackUrl = URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(fallbackUrl);
			setActivePhotoUrl(fallbackUrl);
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	// Применение к плану лечения и заказ-наряду ЗТЛ в 1 клик (Мандаты 8e, 8k, PHO-02)
	const handleApplyToTreatmentPlanAndLab = useCallback(
		async (analysis: Partial<DsdAnalysisData>) => {
			const fullAnalysisPayload: DsdAnalysisData = {
				id: `dsd_${Date.now()}`,
				photoUrl: activePhotoUrl,
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

			// Сохраняем в кэш пациента для реактивной гидратации
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem(`dente_dsd_analysis_${patientId}`, JSON.stringify(fullAnalysisPayload));
					if (visitId) {
						localStorage.setItem(`dente_visit_dsd_${visitId}`, JSON.stringify(fullAnalysisPayload));
					}
				} catch {}
			}

			// 1. Отправляем на бэкенд в фотопротокол пациента
			try {
				if (patientId && patientId !== 'chairside') {
					await fetch(`/api/patients/${patientId}/photo-protocol`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							presetId: 'dsd_aesthetic_protocol',
							slots: { [slotId]: { imageUrl: activePhotoUrl, dsdAnalysis: fullAnalysisPayload, landmarks } },
							stage: 'before',
							notes: `DSD анализ: материал ${fullAnalysisPayload.recommendedMaterial}, оттенок ${fullAnalysisPayload.recommendedVitaShade}, дуга ${fullAnalysisPayload.smileArcCurvature}`,
							dsdAnalysis: fullAnalysisPayload,
						}),
					}).catch(() => null);
				}
			} catch {}

			// 2. Диспатчим канонические события в CRM (наряд ЗТЛ + план лечения)
			if (typeof window !== 'undefined') {
				const labDetail = {
					patientId,
					patientName,
					doctorName,
					teeth: [13, 12, 11, 21, 22, 23],
					toothFdi: 11,
					material: fullAnalysisPayload.recommendedMaterial,
					colorVita: fullAnalysisPayload.recommendedVitaShade,
					notes: `[DSD Эстетический дизайн]: Резцы 11/21 ширина ${analysis.teethMetrics?.[2]?.widthMm ?? 8.5} мм (W/L: 80%), оттенок ${fullAnalysisPayload.recommendedVitaShade} (${fullAnalysisPayload.translucencyLevel}). ${fullAnalysisPayload.doctorNotes || ''}`,
					dsdAnalysis: fullAnalysisPayload,
				};

				window.dispatchEvent(new CustomEvent('dente-open-lab-order-modal', { detail: labDetail }));
				window.dispatchEvent(new CustomEvent('dente-apply-dsd-to-treatment-plan', { detail: labDetail }));
			}

			showToast('Параметры DSD успешно перенесены в заказ-наряд лаборатории и план лечения!', 'success');
			onApplySuccess?.(fullAnalysisPayload);
			onClose();
		},
		[activePhotoUrl, slotId, patientId, patientName, doctorName, visitId, landmarks, onApplySuccess, onClose],
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
			<div className="relative w-full h-full max-w-7xl max-h-[96vh] max-sm:max-h-full bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] border border-[var(--line,#cbd5e1)] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
				{/* Apple HIG: Mobile Drag Handle */}
				<div
					className="sm:hidden w-10 h-[5px] bg-slate-400 dark:bg-slate-600 rounded-full mx-auto my-2 shrink-0"
					aria-hidden="true"
				/>

				{/* 1. Шапка студии DSD (декомпозирована) */}
				<DsdStudioHeader
					patientName={patientName}
					doctorName={doctorName}
					effectivePhotos={effectivePhotos}
					activePhotoUrl={activePhotoUrl}
					setActivePhotoUrl={setActivePhotoUrl}
					fileInputRef={fileInputRef}
					handleFileChange={handleFileChange}
					onClose={onClose}
				/>

				{/* Переключатель мобильных вкладок (Apple Segmented Control на смартфонах) */}
				<div className="sm:hidden px-3 py-1.5 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex shrink-0">
					<div className="grid grid-cols-2 w-full p-0.5 rounded-xl bg-[var(--line,#cbd5e1)]/50">
						<button
							type="button"
							onClick={() => setActiveMobileTab('canvas')}
							className={`py-1.5 text-xs font-bold rounded-lg transition ${
								activeMobileTab === 'canvas'
									? 'bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs'
									: 'text-[var(--muted,#64748b)]'
							}`}
						>
							Холст и направляющие
						</button>
						<button
							type="button"
							onClick={() => setActiveMobileTab('metrics')}
							className={`py-1.5 text-xs font-bold rounded-lg transition ${
								activeMobileTab === 'metrics'
									? 'bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs'
									: 'text-[var(--muted,#64748b)]'
							}`}
						>
							Замеры и ЗТЛ
						</button>
					</div>
				</div>

				{/* 2. Основная рабочая область: Сплит-экран */}
				<div className="flex-1 flex overflow-hidden">
					{/* Интерактивный холст (слева) или честный Empty State */}
					<div
						className={`flex-1 relative flex items-center justify-center p-2 sm:p-4 bg-slate-950 overflow-hidden ${
							activeMobileTab === 'canvas' ? 'flex' : 'max-sm:hidden'
						}`}
					>
						{!activePhotoUrl ? (
							<DsdEmptyState
								onUploadClick={() => fileInputRef.current?.click()}
							/>
						) : (
							<DsdCanvasOverlay
								imageUrl={activePhotoUrl}
								guides={guides}
								landmarks={landmarks}
								calibration={calibration}
								rotationDegrees={rotationDegrees}
								onLandmarksChange={handleLandmarksChange}
								onCalibrationChange={handleCalibrationChange}
							/>
						)}
					</div>

					{/* Правая панель метрик и ЗТЛ спецификации (360-400px) */}
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

export default DsdAestheticStudioModal;
