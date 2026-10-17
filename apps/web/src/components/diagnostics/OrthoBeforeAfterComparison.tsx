import React, { useState } from "react";
import { Columns, Split, Upload, Sparkles, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
	ORTHODONTIC_8_ANGLES,
	type OrthodonticAngleId,
	type OrthodonticPhotoSession,
} from "@dental/shared";

interface OrthoBeforeAfterComparisonProps {
	session: OrthodonticPhotoSession;
	onUploadAngle: (angleId: OrthodonticAngleId) => void;
	onCloseCompare: () => void;
}

export const OrthoBeforeAfterComparison: React.FC<OrthoBeforeAfterComparisonProps> = ({
	session,
	onUploadAngle,
	onCloseCompare,
}) => {
	const [selectedAngleId, setSelectedAngleId] = useState<OrthodonticAngleId>("extraoral_smile");
	const [compareViewMode, setCompareViewMode] = useState<"side_by_side" | "slider">("side_by_side");
	const [sliderPosition, setSliderPosition] = useState<number>(50);

	// Key comparison angles
	const comparisonAngles = ORTHODONTIC_8_ANGLES.filter((a) =>
		["extraoral_smile", "intraoral_frontal", "extraoral_profile", "intraoral_right", "intraoral_left"].includes(a.id),
	);

	const activeAngle = ORTHODONTIC_8_ANGLES.find((a) => a.id === selectedAngleId) || ORTHODONTIC_8_ANGLES[1]!;
	const slot = session.slots[selectedAngleId];
	const currentImageUrl = slot?.imageUrl || null;

	// In production, beforeImageUrl comes from pre-treatment session slot
	// If only 1 image exists, provide clean placeholder or demo comparison
	const beforeImageUrl = slot?.metadata?.notes?.includes("data:image")
		? slot.metadata.notes
		: null;

	return (
		<div
			data-testid="ortho-before-after-comparison-panel"
			className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3 my-2"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
						<Split size={16} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">
							Сравнение До / После в 1 клик
						</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Динамика перемещения зубов, смыкания и улыбки · {activeAngle.titleRu}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{/* Mode switch */}
					<div className="bg-[var(--paper)] p-0.5 rounded-xl border border-[var(--line)] flex items-center gap-1">
						<button
							type="button"
							onClick={() => setCompareViewMode("side_by_side")}
							data-testid="compare-mode-side-by-side-btn"
							className={`min-h-[36px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
								compareViewMode === "side_by_side"
									? "bg-[var(--primary)] text-white shadow-xs"
									: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Columns size={13} />
							<span>Рядом</span>
						</button>
						<button
							type="button"
							onClick={() => setCompareViewMode("slider")}
							data-testid="compare-mode-slider-btn"
							className={`min-h-[36px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
								compareViewMode === "slider"
									? "bg-[var(--primary)] text-white shadow-xs"
									: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<Split size={13} />
							<span>Шторка</span>
						</button>
					</div>

					<button
						type="button"
						onClick={onCloseCompare}
						data-testid="close-compare-panel-btn"
						className="secondary-button min-h-[36px] sm:min-h-[28px] sm:h-7 px-2.5 text-xs font-semibold !rounded-xl cursor-pointer"
					>
						К сетке 8 фото
					</button>
				</div>
			</div>

			{/* Angle selector pills */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
				<span className="text-xs font-bold text-[var(--muted)] shrink-0">Ракурс:</span>
				{comparisonAngles.map((angle) => {
					const isSelected = selectedAngleId === angle.id;
					const hasPhoto = Boolean(session.slots[angle.id]?.imageUrl);
					return (
						<button
							key={angle.id}
							type="button"
							onClick={() => setSelectedAngleId(angle.id)}
							data-testid={`compare-angle-${angle.id}-btn`}
							className={`min-h-[36px] sm:min-h-[28px] sm:h-7 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
								isSelected
									? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"
							}`}
						>
							{hasPhoto && <Check size={12} className={isSelected ? "text-white" : "text-emerald-500"} />}
							<span>{angle.shortLabelRu}</span>
						</button>
					);
				})}
			</div>

			{/* Comparison Viewport */}
			{compareViewMode === "side_by_side" ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[280px]">
					{/* Before */}
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center justify-between gap-2 text-center">
						<div className="w-full flex items-center justify-between">
							<span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
								ДО ЛЕЧЕНИЯ (ИСХОДНОЕ)
							</span>
							<span className="text-[11px] text-[var(--muted)]">Этап 1: Старт</span>
						</div>
						<div className="w-full h-52 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
							{beforeImageUrl ? (
								<img
									src={beforeImageUrl}
									alt="До лечения"
									className="w-full h-full object-cover"
								/>
							) : currentImageUrl ? (
								<div className="relative w-full h-full">
									<img
										src={currentImageUrl}
										alt="До лечения (архив)"
										className="w-full h-full object-cover filter contrast-125 grayscale-30"
									/>
									<span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
										Архивный снимок
									</span>
								</div>
							) : (
								<div className="flex flex-col items-center gap-2 p-4 text-[var(--muted)]">
									<Upload size={24} />
									<span className="text-xs">Снимок «До» отсутствует</span>
									<button
										type="button"
										onClick={() => onUploadAngle(selectedAngleId)}
										className="secondary-button text-xs !rounded-lg px-2.5 py-1"
									>
										Загрузить фото До
									</button>
								</div>
							)}
						</div>
						<span className="text-xs text-[var(--muted)]">
							Исходное положение зубных рядов и профиля
						</span>
					</div>

					{/* After / Current */}
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center justify-between gap-2 text-center">
						<div className="w-full flex items-center justify-between">
							<span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
								ТЕКУЩИЙ ЭТАП / ПОСЛЕ
							</span>
							<span className="text-[11px] text-[var(--muted)]">Активный результат</span>
						</div>
						<div className="w-full h-52 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
							{currentImageUrl ? (
								<img
									src={currentImageUrl}
									alt="Текущий этап"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="flex flex-col items-center gap-2 p-4 text-[var(--muted)]">
									<Upload size={24} />
									<span className="text-xs">Снимок текущего визита не загружен</span>
									<button
										type="button"
										onClick={() => onUploadAngle(selectedAngleId)}
										className="primary-button text-xs !rounded-lg px-2.5 py-1"
									>
										Загрузить фото После
									</button>
								</div>
							)}
						</div>
						<span className="text-xs text-[var(--muted)]">
							Результат нивелирования, выравнивания и коррекции прикуса
						</span>
					</div>
				</div>
			) : (
				/* Slider Split View */
				<div className="relative w-full h-72 sm:h-80 rounded-2xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden select-none">
					{/* Before background */}
					<div className="absolute inset-0 flex items-center justify-center bg-[var(--paper-soft)]">
						{beforeImageUrl || currentImageUrl ? (
							<img
								src={beforeImageUrl || currentImageUrl!}
								alt="До"
								className="w-full h-full object-cover filter contrast-125 grayscale-20"
							/>
						) : (
							<span className="text-xs text-[var(--muted)]">Загрузите снимки для сравнения</span>
						)}
						<span className="absolute top-3 left-3 bg-amber-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
							ДО ЛЕЧЕНИЯ
						</span>
					</div>

					{/* After overlay with clipPath */}
					<div
						className="absolute inset-0 overflow-hidden flex items-center justify-center"
						style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
					>
						{currentImageUrl ? (
							<img
								src={currentImageUrl}
								alt="После"
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full bg-[var(--paper)] flex items-center justify-center">
								<span className="text-xs text-[var(--muted)]">Нет фото После</span>
							</div>
						)}
						<span className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
							ПОСЛЕ / СЕЙЧАС
						</span>
					</div>

					{/* Divider line & handle */}
					<div
						className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize flex items-center justify-center pointer-events-none"
						style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
					>
						<div className="w-7 h-7 rounded-full bg-white text-[var(--ink)] shadow-md flex items-center justify-center border border-[var(--line)]">
							<ChevronLeft size={12} className="-mr-1 text-[var(--muted)]" />
							<ChevronRight size={12} className="-ml-1 text-[var(--muted)]" />
						</div>
					</div>

					{/* Range input overlay */}
					<input
						type="range"
						min={0}
						max={100}
						value={sliderPosition}
						onChange={(e) => setSliderPosition(Number(e.target.value))}
						aria-label="Положение шторки сравнения До/После"
						className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
					/>
				</div>
			)}
		</div>
	);
};
