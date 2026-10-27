import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DentalSyringe } from "../../icons/DentalIcons";
import { showToast } from "../../GlobalToast";
import { ToothSomaticStatusBanner } from "./ToothSomaticStatusBanner";
import {
	TOOTH_EXPRESS_ANESTHESIA_OPTIONS,
	type WarmAccordionSection,
	type ToothContextDrawerProps,
} from "./toothDrawerTypes";

interface ToothDrawerAnesthesiaAccordionProps {
	toothNumber: number;
	patient: ToothContextDrawerProps["patient"];
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onApplyAnesthesia?: ToothContextDrawerProps["onApplyAnesthesia"];
}

export const ToothDrawerAnesthesiaAccordion: React.FC<ToothDrawerAnesthesiaAccordionProps> = ({
	toothNumber,
	patient,
	activeSection,
	toggleSection,
	onInsertToProtocol,
	onApplyAnesthesia,
}) => {
	const isExpanded = activeSection === "anesthesia";

	const handleApplyPreset = (preset: (typeof TOOTH_EXPRESS_ANESTHESIA_OPTIONS)[number]) => {
		const diaryText = preset.buildDiaryText(toothNumber);
		onInsertToProtocol?.(diaryText);
		onApplyAnesthesia?.(diaryText);
		showToast(`Анестезия (${preset.title}) внесена в протокол`, "success", 2500);
	};

	return (
		<section className="dente-accordion-item">
			<button
				type="button"
				onClick={() => toggleSection("anesthesia")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
			>
				<div className="trigger-left">
					<DentalSyringe size={16} style={{ color: "var(--brand-primary, var(--teal))" }} />
					<span className="trigger-title">2. Экспресс-анестезия</span>
				</div>
				<div className="trigger-right">
					<span className="trigger-summary">Артикаин • Ультракаин • Скандонест • Септанест</span>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in p-3 flex flex-col gap-2">
					<ToothSomaticStatusBanner patient={patient} onInsertToProtocol={onInsertToProtocol} />

					<div className="flex items-center justify-between text-xs text-[var(--muted)] px-0.5">
						<span>Выбор анестетика:</span>
						<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Норма</span>
					</div>

					<div className="flex flex-col gap-1.5" data-testid="tooth-express-anesthesia-list">
						{TOOTH_EXPRESS_ANESTHESIA_OPTIONS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleApplyPreset(preset)}
								className="w-full text-left p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--line)]/20 transition-all flex items-center justify-between gap-3 min-h-[48px] cursor-pointer group"
								data-testid={`btn-tooth-anes-${preset.id}`}
								title={`${preset.title} — ${preset.subtitle}`}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<div className={`p-1.5 rounded-lg shrink-0 border ${preset.badgeClass}`}>
										<DentalSyringe className="w-4 h-4" />
									</div>
									<div className="min-w-0">
										<div className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--teal)] transition-colors truncate min-w-0">
											{preset.title}
										</div>
										<div className="text-[11px] text-[var(--muted)] truncate min-w-0 mt-0.5">
											{preset.subtitle}
										</div>
									</div>
								</div>
								<span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase shrink-0 bg-[var(--line)]/50 text-[var(--muted)] group-hover:bg-[var(--teal-surface)] group-hover:text-[var(--teal)] transition-colors">
									{preset.tag}
								</span>
							</button>
						))}
					</div>
				</div>
			)}
		</section>
	);
};
