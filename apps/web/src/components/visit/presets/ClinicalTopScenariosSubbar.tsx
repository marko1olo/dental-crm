import React from "react";
import {
	Flame,
	HeartPulse,
	Scissors,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import {
	CLINICAL_SOAP_PRESETS,
	type ClinicalQuickPreset,
	THERAPY_ENDO_QUICK_PRESET_IDS,
	TOP_EXPRESS_PRESET_IDS,
} from "../clinicalSoapPresets";

interface ClinicalTopScenariosSubbarProps {
	readonly currentTooth: number | null;
	readonly onSelectPreset: (preset: ClinicalQuickPreset) => void;
}

export const ClinicalTopScenariosSubbar: React.FC<
	ClinicalTopScenariosSubbarProps
> = ({ currentTooth, onSelectPreset }) => {
	const topExpressPresets = React.useMemo(() => {
		return TOP_EXPRESS_PRESET_IDS.map((id) =>
			CLINICAL_SOAP_PRESETS.find((p) => p.id === id),
		).filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	const therapyEndoQuickPresets = React.useMemo(() => {
		return THERAPY_ENDO_QUICK_PRESET_IDS.map((id) =>
			CLINICAL_SOAP_PRESETS.find((p) => p.id === id),
		).filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	const surgeryQuickPresets = React.useMemo(() => {
		const targetIds = ["surgery_extraction_complex", "surgery_periostotomy"];
		return targetIds
			.map((id) => CLINICAL_SOAP_PRESETS.find((p) => p.id === id))
			.filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	return (
		<>
			{/* ── ТОП-5 ЭКСПРЕСС-СЦЕНАРИЕВ (КРУПНЫЕ КНОПКИ >= 50px) ── */}
			<div className="space-y-1.5">
				<div className="text-xs font-bold text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-amber-500" />
					<span>Главные экспресс-сценарии приема:</span>
				</div>
				<div className="flex overflow-x-auto no-scrollbar whitespace-nowrap flex-nowrap scrollbar-none px-2 py-1 pr-6 gap-2 touch-pan-x">
					{topExpressPresets.map((preset) => {
						const isNorm = preset.id === "norm_healthy";
						const isHygiene = preset.id === "hygiene_complex";
						const isCaries = preset.id === "caries_medium";
						const isPulpitis = preset.id === "pulpitis_acute";
						const isPerio = preset.id === "perio_srp_curettage";
						const isSurgery = preset.id === "surgery_extraction_simple";

						const dynamicBadge = isNorm
							? "Норма (Здоров)"
							: isHygiene
								? "Профгигиена"
								: isSurgery
									? currentTooth
										? `Удаление ${currentTooth}`
										: "Удаление"
									: currentTooth
										? `${preset.shortBadge.replace(/\s*\d{2}/, "")} ${currentTooth}`
										: preset.shortBadge;

						const subtext = isNorm
							? "Осмотр: Здоров, физиологическая норма"
							: isHygiene
								? "Осмотр, ультразвук, Air-Flow, фторирование"
								: isCaries
									? "Кариес: препарирование, пломбирование"
									: isPulpitis
										? "Анестезия, экстирпация, лечебная паста"
										: isPerio
											? "УЗ-скейлинг, Air-Flow, антисептик"
											: "Удаление, ревизия лунки, гемостаз, шов";

						return (
							<button
								key={`top-${preset.id}`}
								type="button"
								onClick={() => onSelectPreset(preset)}
								className="clinical-protocol-card min-h-[50px] sm:min-h-[44px] min-w-[200px] sm:min-w-[220px] shrink-0 flex-shrink-0 px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold border transition-all flex flex-col items-start justify-center gap-0.5 cursor-pointer shadow-2xs active:scale-98 touch-manipulation text-left select-none bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)]"
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`express-preset-${preset.id}`}
								data-tour="diary-preset"
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										{isNorm && (
											<ShieldCheck
												size={15}
												className="text-emerald-600 dark:text-emerald-400 shrink-0"
											/>
										)}
										{isHygiene && (
											<Sparkles
												size={15}
												className="text-teal-600 dark:text-teal-400 shrink-0"
											/>
										)}
										{isCaries && (
											<Stethoscope
												size={15}
												className="text-blue-600 dark:text-blue-400 shrink-0"
											/>
										)}
										{isPulpitis && (
											<Flame
												size={15}
												className="text-rose-600 dark:text-rose-400 shrink-0"
											/>
										)}
										{isPerio && (
											<HeartPulse
												size={15}
												className="text-amber-600 dark:text-amber-400 shrink-0"
											/>
										)}
										{isSurgery && (
											<Scissors
												size={15}
												className="text-purple-600 dark:text-purple-400 shrink-0"
											/>
										)}
										<span className="whitespace-nowrap shrink-0 font-extrabold text-[var(--ink)]">
											{dynamicBadge}
										</span>
									</div>
									<span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-normal text-[var(--muted)] line-clamp-1 leading-tight break-words"
									title={subtext}
								>
									{subtext}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── ТЕРАПИЯ И ЭНДОДОНТИЯ ── */}
			<div
				className="space-y-1.5 pt-1 border-t border-[var(--border)]"
				data-testid="therapy-endo-quick-actions-section"
			>
				<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Stethoscope size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>Терапия и эндодонтия:</span>
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] font-normal hidden sm:inline">
						Пульпит (1/2 эт.) · Периодонтит · Кариес
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{therapyEndoQuickPresets.map((preset) => {
						const dynamicBadge = currentTooth
							? `${preset.shortBadge.replace(/\s*\d{2}/, "")} ${currentTooth}`
							: preset.shortBadge;
						const subtitle =
							preset.id === "pulpitis_visit1"
								? "Экстирпация, гидроксид кальция под повязку"
								: preset.id === "pulpitis_obturation"
									? "Обтурация гуттаперчей и силером"
									: preset.id === "periodontitis_destructive"
										? "УЗ-дезинфекция, временная обтурация"
										: "Адгезивный протокол, послойная реставрация";

						return (
							<button
								key={`therapy-endo-${preset.id}`}
								type="button"
								onClick={() => onSelectPreset(preset)}
								className="clinical-protocol-card min-h-[50px] sm:min-h-[44px] px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold border transition-all flex flex-col items-start justify-center gap-0.5 cursor-pointer shadow-2xs active:scale-98 touch-manipulation text-left bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)]"
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`btn-therapy-endo-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										<Stethoscope
											size={15}
											className="text-blue-600 dark:text-blue-400 shrink-0"
										/>
										<span className="whitespace-nowrap shrink-0 font-extrabold text-[var(--ink)]">
											{dynamicBadge}
										</span>
									</div>
									<span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-normal text-[var(--muted)] line-clamp-2 leading-tight w-full break-words"
									title={subtitle}
								>
									{subtitle}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── ХИРУРГИЧЕСКИЕ БЫСТРЫЕ ДЕЙСТВИЯ (ОСТРАЯ БОЛЬ) ── */}
			<div
				className="space-y-1.5 pt-1 border-t border-[var(--border)]"
				data-testid="surgery-quick-actions-section"
			>
				<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Flame size={14} className="text-rose-500 shrink-0" />
						<span>Хирургические быстрые действия (Острая боль):</span>
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] font-normal hidden sm:inline">
						Сложное удаление · периостотомия
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
					{surgeryQuickPresets.map((preset) => {
						const isComplex = preset.id === "surgery_extraction_complex";
						const dynamicBadge = isComplex
							? currentTooth
								? `Сложн. удаление ${currentTooth}`
								: "Сложн. удаление"
							: currentTooth
								? `Периостотомия ${currentTooth}`
								: "Периостотомия";
						const subtitle = isComplex
							? "Разъединение корней, кюретаж лунки, швы"
							: "Разрез, вскрытие очага, дренирование";

						return (
							<button
								key={`surgery-quick-${preset.id}`}
								type="button"
								onClick={() => onSelectPreset(preset)}
								className="clinical-protocol-card min-h-[50px] sm:min-h-[44px] px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold border transition-all flex flex-col items-start justify-center gap-0.5 cursor-pointer shadow-2xs active:scale-98 touch-manipulation text-left bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)]"
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`btn-surgery-quick-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										<Scissors
											size={15}
											className="text-rose-600 dark:text-rose-400 shrink-0"
										/>
										<span className="whitespace-nowrap shrink-0 font-extrabold text-[var(--ink)]">
											{dynamicBadge}
										</span>
									</div>
									<span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-normal text-[var(--muted)] line-clamp-2 leading-tight w-full break-words"
									title={subtitle}
								>
									{subtitle}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};
