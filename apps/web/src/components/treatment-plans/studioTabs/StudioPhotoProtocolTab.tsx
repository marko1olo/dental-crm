/**
 * StudioPhotoProtocolTab.tsx — Вкладка «Фотопротокол До / После» в студии планов лечения (SSOT).
 * Мандаты 8b, 8e: Интерактивный сплиттер эстетического сопоставления результатов улыбки.
 * Клинический стандарт: Интраоральный, Портретный и Окклюзионный фотопротокол.
 */

import React, { useState } from "react";
import { Camera, Sparkles, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { BeforeAfterSplitSlider } from "../../photography/BeforeAfterSplitSlider";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";

export interface StudioPhotoProtocolTabProps {
	readonly activeTier: TreatmentPlanTier;
}

export type PhotoProtocolCategory = "intraoral" | "portrait" | "occlusal";

export const StudioPhotoProtocolTab: React.FC<StudioPhotoProtocolTabProps> = ({ activeTier }) => {
	const sanitizedTitle = activeTier.title.replace("★ ", "");
	const [activeCategory, setActiveCategory] = useState<PhotoProtocolCategory>("intraoral");

	const categories = [
		{
			id: "intraoral" as const,
			title: "Интраоральный фотопротокол",
			description: "Фронтальная окклюзия, боковые контакты справа/слева",
			count: 3,
		},
		{
			id: "portrait" as const,
			title: "Портретный фотопротокол",
			description: "Покой губ, широкая улыбка в анфас, эстетический профиль",
			count: 3,
		},
		{
			id: "occlusal" as const,
			title: "Окклюзионный фотопротокол",
			description: "Зубная дуга верхней челюсти, зубная дуга нижней челюсти",
			count: 2,
		},
	];

	return (
		<div className="space-y-4 max-w-4xl mx-auto" data-testid="studio-photo-protocol-tab">
			{/* 1. Верхняя информационная плашка */}
			<div className="flex items-center justify-between flex-wrap gap-2 p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Camera className="w-5 h-5" />
					</div>
					<div>
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 flex items-center gap-1.5">
							<span>Клиническое сопоставление улыбки До / После</span>
							<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] font-bold">
								{sanitizedTitle}
							</span>
						</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Интерактивная демонстрация эстетического и функционального преображения по плану лечения
						</p>
					</div>
				</div>

				<div className="text-xs text-[var(--muted)] flex items-center gap-1 font-medium">
					<Sparkles className="w-3.5 h-3.5 text-amber-500" />
					<span>Сдвигайте ползунок для сравнения</span>
				</div>
			</div>

			{/* 2. Сегментный переключатель типов фотопротокола */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="tablist">
				{categories.map((cat) => {
					const isSelected = activeCategory === cat.id;
					return (
						<button
							key={cat.id}
							type="button"
							role="tab"
							aria-selected={isSelected}
							onClick={() => setActiveCategory(cat.id)}
							className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
								isSelected
									? "bg-[var(--paper)] border-[var(--teal,#0d9488)] shadow-xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
						>
							<div className="flex items-center justify-between gap-2">
								<span className={`text-xs font-bold ${isSelected ? "text-[var(--teal,#0d9488)]" : "text-[var(--ink)]"}`}>
									{cat.title}
								</span>
								<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--line-subtle)] text-[var(--muted)] shrink-0">
									{cat.count} фото
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-1">{cat.description}</p>
						</button>
					);
				})}
			</div>

			{/* 3. Интерактивный интерактивный сплиттер До / После */}
			<div className="p-2 sm:p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-3">
				<BeforeAfterSplitSlider
					beforeLabel="До лечения"
					afterLabel={`План: ${sanitizedTitle}`}
					showControls={true}
				/>

				<div className="flex items-center justify-between text-xs text-[var(--muted)] px-1 pt-1">
					<span className="flex items-center gap-1">
						<ImageIcon className="w-3.5 h-3.5" />
						<span>Исходная клиническая ситуация</span>
					</span>
					<span className="flex items-center gap-1 text-[var(--teal,#0d9488)] font-semibold">
						<CheckCircle2 className="w-3.5 h-3.5" />
						<span>Цифровой прогноз реабилитации</span>
					</span>
				</div>
			</div>
		</div>
	);
};

export default StudioPhotoProtocolTab;
