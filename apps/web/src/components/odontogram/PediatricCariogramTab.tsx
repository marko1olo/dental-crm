import React from "react";
import { Activity, Info, ShieldCheck, Sparkles } from "lucide-react";
import {
	type CariogramInput,
	type CariogramPieSlice,
	type CariogramResult,
} from "./pediatricDentitionEngine";

export interface PediatricCariogramTabProps {
	cariogramInput: CariogramInput;
	onCariogramInputChange: (input: CariogramInput) => void;
	cariogramResult: CariogramResult;
	pieSlices: readonly CariogramPieSlice[];
}

export const PediatricCariogramTab: React.FC<PediatricCariogramTabProps> = ({
	cariogramInput,
	onCariogramInputChange,
	cariogramResult,
	pieSlices,
}) => {
	const handleFactorChange = <K extends keyof CariogramInput>(
		key: K,
		value: CariogramInput[K],
	) => {
		onCariogramInputChange({
			...cariogramInput,
			[key]: value,
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* Top Summary Banner: Risk Gauge & Donut Chart */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-3xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]">
				{/* Left: Interactive SVG Cariogram Donut */}
				<div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
					<div className="relative w-[260px] h-[260px] flex items-center justify-center">
						<svg
							width="260"
							height="260"
							viewBox="0 0 260 260"
							className="drop-shadow-lg"
							role="img"
							aria-label="Cariogram 5-секторная диаграмма кариесогенного риска"
						>
							<title>Cariogram 5-секторная диаграмма риска</title>
							<g transform="rotate(0 130 130)">
								{pieSlices.map((slice) => (
									<path
										key={slice.id}
										d={slice.pathData}
										fill={slice.fillColor}
										stroke="var(--odontogram-paper,var(--paper,#ffffff))"
										strokeWidth="2"
										className="hover:opacity-85 transition-opacity cursor-pointer"
									>
										<title>{`${slice.nameRu}: ${slice.percentage}% (${slice.descriptionRu})`}</title>
									</path>
								))}
							</g>
						</svg>

						{/* Donut Center Overlay */}
						<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
							<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
								Шанс избежать
							</span>
							<span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
								{cariogramResult.chanceOfAvoidingCariesPercent}%
							</span>
							<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
								по Bratthall
							</span>
						</div>
					</div>

					{/* Legend */}
					<div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs sm:text-sm">
						<div className="flex items-center gap-2">
							<span className="w-3.5 h-3.5 rounded-full bg-[#10b981] shrink-0" />
							<span className="font-bold text-emerald-700 dark:text-emerald-300">
								Шанс избежать ({cariogramResult.sectors.actualChanceOfAvoidingCaries}%)
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="w-3.5 h-3.5 rounded-full bg-[#1e40af] shrink-0" />
							<span className="font-semibold">Диета ({cariogramResult.sectors.dietSectorPercent}%)</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="w-3.5 h-3.5 rounded-full bg-[#ef4444] shrink-0" />
							<span className="font-semibold">Бактерии ({cariogramResult.sectors.bacteriaSectorPercent}%)</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="w-3.5 h-3.5 rounded-full bg-[#0284c7] shrink-0" />
							<span className="font-semibold">Восприимчивость ({cariogramResult.sectors.susceptibilitySectorPercent}%)</span>
						</div>
						<div className="flex items-center gap-2 col-span-2">
							<span className="w-3.5 h-3.5 rounded-full bg-[#eab308] shrink-0" />
							<span className="font-semibold">Анамнез / соматика ({cariogramResult.sectors.circumstancesSectorPercent}%)</span>
						</div>
					</div>
				</div>

				{/* Right: Risk Analysis & Preventive Plan */}
				<div className="lg:col-span-7 flex flex-col justify-between space-y-4">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span
								className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider"
								style={{
									backgroundColor: cariogramResult.badgeBg,
									color: cariogramResult.badgeColor,
								}}
							>
								{cariogramResult.riskCategoryNameRu}
							</span>
							<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
								(Интервал профгигиены: {cariogramResult.preventiveProgram.hygieneRecallIntervalMonths} мес.)
							</span>
						</div>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] leading-relaxed font-medium">
							{cariogramResult.riskCategoryDescriptionRu}
						</p>
						<div className="p-3.5 rounded-xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] border border-[var(--teal-glow,rgba(20,184,166,0.25))] text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)] dark:text-teal-200">
							<strong className="font-black text-[var(--teal,#0d9488)]">Доминирующий фактор риска:</strong> {cariogramResult.dominantRiskFactorRu}
						</div>
					</div>

					{/* Preventive Plan Cards */}
					<div className="space-y-2">
						<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
							Индивидуальный план профилактики
						</h4>
						<div className="space-y-2 text-xs sm:text-sm text-[var(--odontogram-ink,var(--ink,#0f172a))] font-medium">
							<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
								<ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
								<span>{cariogramResult.preventiveProgram.professionalHygieneRu}</span>
							</div>
							<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
								<Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
								<span>{cariogramResult.preventiveProgram.fluorideVarnishProtocolRu}</span>
							</div>
							<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
								<Activity className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
								<span>{cariogramResult.preventiveProgram.homeCareProtocolRu}</span>
							</div>
							<div className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2.5 shadow-xs">
								<Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
								<span>{cariogramResult.preventiveProgram.dietaryGuidanceRu}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 9 Clinical Factor Controls */}
			<div className="space-y-4">
				<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
					Клинические параметры пациента (Cariogram Input)
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{/* 1. Diet Content */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Диета: Содержание сахаров
						</label>
						<select
							value={cariogramInput.dietContents}
							onChange={(e) => handleFactorChange("dietContents", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Очень низкое (без сахара)</option>
							<option value={1}>1 — Умеренное (стандартное)</option>
							<option value={2}>2 — Высокое (сладкие напитки/соки)</option>
							<option value={3}>3 — Очень высокое (липкие сладости)</option>
						</select>
					</div>

					{/* 2. Diet Frequency */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Диета: Частота приёмов пищи
						</label>
						<select
							value={cariogramInput.dietFrequency}
							onChange={(e) => handleFactorChange("dietFrequency", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — ≤3 раз в день (без перекусов)</option>
							<option value={1}>1 — 4–5 раз в день (норма)</option>
							<option value={2}>2 — 6–7 раз в день (частые снеки)</option>
							<option value={3}>3 — &gt;7 раз в день (постоянно)</option>
						</select>
					</div>

					{/* 3. Plaque Amount */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Бактерии: Зубной налёт (Silness-Löe)
						</label>
						<select
							value={cariogramInput.plaqueAmount}
							onChange={(e) => handleFactorChange("plaqueAmount", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Отличная гигиена (налета нет)</option>
							<option value={1}>1 — Удовлетворительная (пришеечный налет)</option>
							<option value={2}>2 — Умеренный видимый налёт</option>
							<option value={3}>3 — Обильный мягкий налёт и бляшки</option>
						</select>
					</div>

					{/* 4. S. Mutans */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Бактерии: Уровень Streptococcus mutans
						</label>
						<select
							value={cariogramInput.streptococcusMutans}
							onChange={(e) => handleFactorChange("streptococcusMutans", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Класс 0 (&lt;10⁴ КОЕ/мл)</option>
							<option value={1}>1 — Класс 1 (10⁴–10⁵ КОЕ/мл)</option>
							<option value={2}>2 — Класс 2 (10⁵–10⁶ КОЕ/мл)</option>
							<option value={3}>3 — Класс 3 (&gt;10⁶ КОЕ/мл, критично)</option>
						</select>
					</div>

					{/* 5. Fluoride Program */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Восприимчивость: Программа фторирования
						</label>
						<select
							value={cariogramInput.fluorideProgram}
							onChange={(e) => handleFactorChange("fluorideProgram", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Оптимальное (паста 1450ppm + лак)</option>
							<option value={1}>1 — Стандартная фтор-паста 1000ppm</option>
							<option value={2}>2 — Нерегулярное фторирование</option>
							<option value={3}>3 — Полное отсутствие фтора</option>
						</select>
					</div>

					{/* 6. Saliva Secretion Rate */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Восприимчивость: Скорость слюноотделения
						</label>
						<select
							value={cariogramInput.salivaSecretionRate}
							onChange={(e) => handleFactorChange("salivaSecretionRate", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Норма (&gt;1.2 мл/мин)</option>
							<option value={1}>1 — Сниженная (0.9–1.2 мл/мин)</option>
							<option value={2}>2 — Низкая (0.5–0.9 мл/мин)</option>
							<option value={3}>3 — Гипосаливация / Ксеростомия (&lt;0.5)</option>
						</select>
					</div>

					{/* 7. Past Caries Experience */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Анамнез: Опыт кариеса (КПУ/кпу)
						</label>
						<select
							value={cariogramInput.pastCariesExperience}
							onChange={(e) => handleFactorChange("pastCariesExperience", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Нет новых полостей за последний год</option>
							<option value={1}>1 — 1–2 новые кариозные полости</option>
							<option value={2}>2 — 3–4 новые полости (умеренный КПУ)</option>
							<option value={3}>3 — &gt;4 полостей (высокий прирост КПУ)</option>
						</select>
					</div>

					{/* 8. Systemic Diseases */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Анамнез: Соматические факторы
						</label>
						<select
							value={cariogramInput.systemicDiseases}
							onChange={(e) => handleFactorChange("systemicDiseases", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Здоров (нет отягощающих факторов)</option>
							<option value={1}>1 — Компенсированные соматические патологии</option>
							<option value={2}>2 — Декомпенсированные / частый прием сиропов</option>
						</select>
					</div>

					{/* 9. Clinical Judgment */}
					<div className="p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-2">
						<label className="text-sm font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] block">
							Клиническое суждение врача
						</label>
						<select
							value={cariogramInput.clinicalJudgment}
							onChange={(e) => handleFactorChange("clinicalJudgment", Number(e.target.value))}
							className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] font-bold cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							<option value={0}>0 — Благоприятное (лучше тестов)</option>
							<option value={1}>1 — Стандартное (соответствует тестам)</option>
							<option value={2}>2 — Настороженное (выше риск)</option>
							<option value={3}>3 — Крайне неблагоприятное</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	);
};

