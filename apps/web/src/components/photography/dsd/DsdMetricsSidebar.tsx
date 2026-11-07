import React, { useState } from 'react';
import {
	Sparkles,
	Check,
	Sliders,
	Eye,
	Activity,
	Copy,
	Send,
	Maximize2,
	RotateCw,
} from 'lucide-react';
import type { DsdAnalysisData, DsdToothMetric } from '@dental/shared';
import type { DsdCanvasGuideFlags, DsdFacialLandmarks, DsdCalibrationState } from './DsdCanvasOverlay';

export interface DsdMetricsSidebarProps {
	landmarks: DsdFacialLandmarks;
	calibration: DsdCalibrationState;
	guides: DsdCanvasGuideFlags;
	rotationDegrees: number;
	onToggleGuide: (key: keyof DsdCanvasGuideFlags) => void;
	onRotatePhoto: (delta: number) => void;
	onAutoLevel: () => void;
	onApplyToTreatmentPlanAndLab: (analysis: Partial<DsdAnalysisData>) => void;
	onResetToNorm: () => void;
}

export const DsdMetricsSidebar: React.FC<DsdMetricsSidebarProps> = ({
	landmarks,
	calibration,
	guides,
	rotationDegrees,
	onToggleGuide,
	onRotatePhoto,
	onAutoLevel,
	onApplyToTreatmentPlanAndLab,
	onResetToNorm,
}) => {
	const [selectedMaterial, setSelectedMaterial] = useState<
		'emax_lithium_disilicate' | 'zirconia_multilayer' | 'feldspathic_ceramic' | 'composite'
	>('emax_lithium_disilicate');
	const [selectedVitaShade, setSelectedVitaShade] = useState('A2');
	const [selectedTranslucency, setSelectedTranslucency] = useState<'HT' | 'LT' | 'MO' | 'HO'>('HT');
	const [doctorNotes, setDoctorNotes] = useState('');
	const [isCopied, setIsCopied] = useState(false);

	// Вычисление масштаба: пикселей на мм
	const calibDx = calibration.p2.x - calibration.p1.x;
	const calibDy = calibration.p2.y - calibration.p1.y;
	const calibDistPx = Math.max(1, Math.sqrt(calibDx * calibDx + calibDy * calibDy));
	const mmPerPx = calibration.knownMm / calibDistPx;

	// Крен межзрачковой линии
	const pupilDx = landmarks.rightPupil.x - landmarks.leftPupil.x;
	const pupilDy = landmarks.rightPupil.y - landmarks.leftPupil.y;
	const bipupillaryTilt = (Math.atan2(pupilDy, pupilDx) * 180) / Math.PI;

	// Смещение срединной линии лица относительно центра зрачков
	const pupilCenterX = (landmarks.leftPupil.x + landmarks.rightPupil.x) / 2;
	const midlineOffsetPx = landmarks.midlineTop.x - pupilCenterX;
	const midlineOffsetMm = Math.round(midlineOffsetPx * mmPerPx * 10) / 10;

	// Анализ дуги улыбки
	const commY = (landmarks.commissureLeft.y + landmarks.commissureRight.y) / 2;
	const smileDepthPx = landmarks.smileArcCenter.y - commY;
	let smileCurvature: 'consonant' | 'flat' | 'reverse' = 'consonant';
	let smileDescription = 'Консонантная (повторяет дугу нижней губы)';
	if (smileDepthPx < 5) {
		smileCurvature = 'flat';
		smileDescription = 'Прямая (уплощенная линия улыбки)';
	} else if (smileDepthPx < -5) {
		smileCurvature = 'reverse';
		smileDescription = 'Обратная (инвертированная дуга)';
	}

	// Зубы Wheeler 2.5D и золотая пропорция
	const centralWidthMm = Math.round((landmarks.teethArchWidth * 0.25) * mmPerPx * 10) / 10;
	const lateralWidthMm = Math.round((centralWidthMm / 1.618) * 10) / 10;
	const canineWidthMm = Math.round((lateralWidthMm / 1.618) * 10) / 10;
	const centralHeightMm = Math.round(landmarks.teethArchHeight * mmPerPx * 10) / 10;
	const ratioWH = centralHeightMm > 0 ? Math.round((centralWidthMm / centralHeightMm) * 100) : 80;

	const teethMetrics: DsdToothMetric[] = [
		{ toothFdi: 13, widthMm: canineWidthMm, heightMm: Math.round(centralHeightMm * 0.95 * 10) / 10, ratioWidthToHeight: 0.75, visibleProportionToCentral: 0.38, goldenDeviationPercent: 2 },
		{ toothFdi: 12, widthMm: lateralWidthMm, heightMm: Math.round(centralHeightMm * 0.88 * 10) / 10, ratioWidthToHeight: 0.72, visibleProportionToCentral: 0.62, goldenDeviationPercent: 1 },
		{ toothFdi: 11, widthMm: centralWidthMm, heightMm: centralHeightMm, ratioWidthToHeight: ratioWH / 100, visibleProportionToCentral: 1.0, goldenDeviationPercent: 0 },
		{ toothFdi: 21, widthMm: centralWidthMm, heightMm: centralHeightMm, ratioWidthToHeight: ratioWH / 100, visibleProportionToCentral: 1.0, goldenDeviationPercent: 0 },
		{ toothFdi: 22, widthMm: lateralWidthMm, heightMm: Math.round(centralHeightMm * 0.88 * 10) / 10, ratioWidthToHeight: 0.72, visibleProportionToCentral: 0.62, goldenDeviationPercent: 1 },
		{ toothFdi: 23, widthMm: canineWidthMm, heightMm: Math.round(centralHeightMm * 0.95 * 10) / 10, ratioWidthToHeight: 0.75, visibleProportionToCentral: 0.38, goldenDeviationPercent: 2 },
	];

	const handleCopySummary = () => {
		const text = `Клинический анализ Digital Smile Design:
- Межзрачковый наклон: ${bipupillaryTilt.toFixed(1)}°
- Смещение средней линии: ${midlineOffsetMm} мм
- Дуга улыбки: ${smileDescription}
- Центральные резцы (11, 21): ширина ${centralWidthMm} мм, высота ${centralHeightMm} мм (W/L: ${ratioWH}%)
- Боковые резцы (12, 22): ширина ${lateralWidthMm} мм (золотая пропорция 61.8%)
- Клыки (13, 23): ширина ${canineWidthMm} мм (золотая пропорция 38.2%)
- Рекомендованный материал: ${selectedMaterial === 'emax_lithium_disilicate' ? 'Дисиликат лития (IPS e.max CAD)' : 'Цирконий Multi-layer'}
- Цвет VITA: ${selectedVitaShade} (${selectedTranslucency})`;

		navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleApply = () => {
		onApplyToTreatmentPlanAndLab({
			calibratedMmPerPx: mmPerPx,
			calibrationDistancePx: calibDistPx,
			calibrationKnownMm: calibration.knownMm,
			bipupillaryTiltDegrees: Math.round(bipupillaryTilt * 10) / 10,
			facialMidlineOffsetMm: midlineOffsetMm,
			smileArcCurvature: smileCurvature,
			smileArcSymmetryPercent: 95,
			teethMetrics,
			recommendedMaterial: selectedMaterial,
			recommendedVitaShade: selectedVitaShade,
			translucencyLevel: selectedTranslucency,
			doctorNotes,
		});
	};

	return (
		<div className="flex flex-col h-full bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-l border-[var(--line,#cbd5e1)] dark:border-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 overflow-hidden">
			{/* Шапка боковой панели */}
			<div className="p-3 sm:p-4 border-b border-[var(--line,#cbd5e1)] dark:border-slate-800 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-2">
					<Sparkles className="w-5 h-5 text-[var(--teal,#0d9488)]" />
					<h3 className="text-sm sm:text-base font-bold">Эстетический анализ (DSD)</h3>
				</div>
				<button
					type="button"
					onClick={onResetToNorm}
					className="text-xs px-2.5 py-1 rounded-md border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 hover:bg-[var(--paper-strong,#f1f5f9)] dark:hover:bg-slate-700 transition cursor-pointer"
					title="Сбросить направляющие к канонической норме"
				>
					К норме
				</button>
			</div>

			<div className="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto">
				{/* 1. Направляющие слои (Toggle chips) */}
				<div>
					<div className="text-xs font-semibold text-[var(--muted,#64748b)] mb-2 flex items-center gap-1.5">
						<Eye className="w-3.5 h-3.5" />
						<span>Направляющие оверлеи:</span>
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						<button
							type="button"
							onClick={() => onToggleGuide('bipupillary')}
							className={`text-xs px-2 py-1.5 rounded-lg border text-left font-medium flex items-center justify-between transition cursor-pointer ${
								guides.bipupillary
									? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-700 dark:text-cyan-300'
									: 'border-[var(--line,#cbd5e1)] dark:border-slate-800 opacity-60'
							}`}
						>
							<span>Зрачковая линия</span>
							{guides.bipupillary && <Check className="w-3.5 h-3.5" />}
						</button>
						<button
							type="button"
							onClick={() => onToggleGuide('midline')}
							className={`text-xs px-2 py-1.5 rounded-lg border text-left font-medium flex items-center justify-between transition cursor-pointer ${
								guides.midline
									? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300'
									: 'border-[var(--line,#cbd5e1)] dark:border-slate-800 opacity-60'
							}`}
						>
							<span>Средняя линия</span>
							{guides.midline && <Check className="w-3.5 h-3.5" />}
						</button>
						<button
							type="button"
							onClick={() => onToggleGuide('smileArc')}
							className={`text-xs px-2 py-1.5 rounded-lg border text-left font-medium flex items-center justify-between transition cursor-pointer ${
								guides.smileArc
									? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
									: 'border-[var(--line,#cbd5e1)] dark:border-slate-800 opacity-60'
							}`}
						>
							<span>Дуга улыбки</span>
							{guides.smileArc && <Check className="w-3.5 h-3.5" />}
						</button>
						<button
							type="button"
							onClick={() => onToggleGuide('goldenRatio')}
							className={`text-xs px-2 py-1.5 rounded-lg border text-left font-medium flex items-center justify-between transition cursor-pointer ${
								guides.goldenRatio
									? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300'
									: 'border-[var(--line,#cbd5e1)] dark:border-slate-800 opacity-60'
							}`}
						>
							<span>Золотое сечение</span>
							{guides.goldenRatio && <Check className="w-3.5 h-3.5" />}
						</button>
						<button
							type="button"
							onClick={() => onToggleGuide('calibration')}
							className={`text-xs px-2 py-1.5 rounded-lg border text-left font-medium flex items-center justify-between transition cursor-pointer col-span-2 ${
								guides.calibration
									? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300'
									: 'border-[var(--line,#cbd5e1)] dark:border-slate-800 opacity-60'
							}`}
						>
							<span>Калибровочная линейка ({calibration.knownMm} мм)</span>
							{guides.calibration && <Check className="w-3.5 h-3.5" />}
						</button>
					</div>
				</div>

				{/* 2. Быстрое выравнивание горизонта фото */}
				<div className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/50 space-y-2">
					<div className="flex items-center justify-between text-xs">
						<span className="font-semibold text-[var(--muted,#64748b)]">Ориентация фото:</span>
						<span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
							{rotationDegrees.toFixed(1)}°
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={onAutoLevel}
							className="flex-1 py-1.5 px-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
							title="Автоматически повернуть фото строго параллельно зрачковой линии"
						>
							<Sliders className="w-3.5 h-3.5" />
							<span>Выровнять по зрачкам</span>
						</button>
						<button
							type="button"
							onClick={() => onRotatePhoto(0.5)}
							className="p-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
							title="Поворот +0.5°"
						>
							<RotateCw className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				{/* 3. Измеренные клинические параметры */}
				<div className="space-y-2">
					<div className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<Activity className="w-3.5 h-3.5" />
						<span>Клинические параметры:</span>
					</div>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="p-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/50">
							<div className="text-[11px] text-[var(--muted,#64748b)]">Зрачковый крен</div>
							<div className="font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
								{bipupillaryTilt >= 0 ? '+' : ''}
								{bipupillaryTilt.toFixed(1)}°
							</div>
						</div>
						<div className="p-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/50">
							<div className="text-[11px] text-[var(--muted,#64748b)]">Сдвиг средней линии</div>
							<div className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
								{midlineOffsetMm} мм
							</div>
						</div>
						<div className="p-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/50 col-span-2">
							<div className="text-[11px] text-[var(--muted,#64748b)]">Линия улыбки (Smile Arc)</div>
							<div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
								{smileDescription}
							</div>
						</div>
					</div>
				</div>

				{/* 4. Таблица пропорций резцов Wheeler 2.5D */}
				<div className="space-y-1.5">
					<div className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center justify-between">
						<span>Пропорции резцов Wheeler 2.5D:</span>
						<span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
							W/L: {ratioWH}%
						</span>
					</div>
					<div className="border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-lg overflow-hidden text-xs">
						<div className="grid grid-cols-4 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 p-1.5 font-bold text-[11px] text-[var(--muted,#64748b)] border-b border-[var(--line,#cbd5e1)] dark:border-slate-800">
							<span>Зуб</span>
							<span>Ширина</span>
							<span>Высота</span>
							<span>Пропорция</span>
						</div>
						<div className="divide-y divide-[var(--line,#cbd5e1)] dark:divide-slate-800 font-mono text-[11px]">
							<div className="grid grid-cols-4 p-1.5">
								<span className="font-bold">11 / 21</span>
								<span>{centralWidthMm} мм</span>
								<span>{centralHeightMm} мм</span>
								<span className="text-amber-600 dark:text-amber-400 font-bold">100% (база)</span>
							</div>
							<div className="grid grid-cols-4 p-1.5">
								<span className="font-bold">12 / 22</span>
								<span>{lateralWidthMm} мм</span>
								<span>{Math.round(centralHeightMm * 0.88 * 10) / 10} мм</span>
								<span className="text-amber-600 dark:text-amber-400">61.8%</span>
							</div>
							<div className="grid grid-cols-4 p-1.5">
								<span className="font-bold">13 / 23</span>
								<span>{canineWidthMm} мм</span>
								<span>{Math.round(centralHeightMm * 0.95 * 10) / 10} мм</span>
								<span className="text-amber-600 dark:text-amber-400">38.2%</span>
							</div>
						</div>
					</div>
				</div>

				{/* 5. Рекомендация для лаборатории ЗТЛ */}
				<div className="space-y-2 pt-2 border-t border-[var(--line,#cbd5e1)] dark:border-slate-800">
					<div className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Параметры заказ-наряда ЗТЛ:
					</div>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>
							<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">Материал</label>
							<select
								value={selectedMaterial}
								onChange={(e) => setSelectedMaterial(e.target.value as any)}
								className="w-full px-2 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 font-medium cursor-pointer"
							>
								<option value="emax_lithium_disilicate">IPS e.max (Дисиликат)</option>
								<option value="zirconia_multilayer">Цирконий Multi-layer</option>
								<option value="feldspathic_ceramic">Полевошпатовая керамика</option>
								<option value="composite">Композит (Mock-up)</option>
							</select>
						</div>
						<div>
							<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">Цвет VITA</label>
							<div className="flex gap-1">
								{['BL2', 'A1', 'A2', 'A3', 'B1'].map((shade) => (
									<button
										key={shade}
										type="button"
										onClick={() => setSelectedVitaShade(shade)}
										className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
											selectedVitaShade === shade
												? 'bg-teal-600 text-white border-teal-600'
												: 'border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800'
										}`}
									>
										{shade}
									</button>
								))}
							</div>
						</div>
					</div>

					<div>
						<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
							Заметки для зубного техника / плана:
						</label>
						<textarea
							rows={2}
							value={doctorNotes}
							onChange={(e) => setDoctorNotes(e.target.value)}
							placeholder="Пример: удлинить режущий край 11, 21 на 1.0 мм, закрыть диастему..."
							className="w-full text-xs p-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
						/>
					</div>
				</div>
			</div>

			{/* Подвал действий: 1 Primary CTA + вторичные */}
			<div className="p-3 sm:p-4 border-t border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 flex flex-col gap-2 shrink-0">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopySummary}
						className="flex-1 py-2 px-3 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[36px]"
					>
						{isCopied ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
						<span>{isCopied ? 'Скопировано!' : 'Копировать замеры'}</span>
					</button>
				</div>

				{/* РОBНО 1 PRIMARY CTA: Никогда не disabled (Мандат 8e / 8am) */}
				<button
					type="button"
					onClick={handleApply}
					className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary,#0d9488)] hover:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer min-h-[44px]"
					data-testid="btn-apply-dsd-to-plan-and-lab"
				>
					<Send className="w-4 h-4" />
					<span>✓ Применить к плану лечения и ЗТЛ</span>
				</button>
			</div>
		</div>
	);
};
