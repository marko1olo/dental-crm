/**
 * DENTE CRM — Patient Sentiment & Scoring Badge Component
 * (DOMAIN: CLINICAL HIG, PATIENT SCORING, LTV, COMPLIANCE & SENTIMENT)
 */

import React, { useId, useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Crown,
	FileWarning,
	HelpCircle,
	Info,
	Percent,
	ShieldAlert,
	Sparkles,
	TrendingUp,
	User,
	UserCheck,
	X,
} from "lucide-react";
import { kopecksToRub } from "@dental/shared";

export type PatientSentimentType =
	| "loyal_vip"
	| "cancellation_risk"
	| "strict_ids_required"
	| "standard";

export interface PatientSentimentInfo {
	type: PatientSentimentType;
	label: string;
	shortLabel: string;
	badgeEmoji: string;
	colorTheme: "emerald" | "amber" | "rose" | "slate";
	description: string;
	clinicalDirective: string;
	calculatedLtvRub: number;
	complianceScorePercent: number;
	riskFactors: string[];
}

export interface PatientSentimentBadgeProps {
	patientId?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: accepts flexible patient record
	patient?: any | null | undefined;
	ltvRub?: number | null | undefined;
	complianceScore?: number | null | undefined;
	sentiment?: PatientSentimentType | null | undefined;
	variant?: "compact" | "pill" | "detailed" | "card" | undefined;
	showLtv?: boolean | undefined;
	showCompliance?: boolean | undefined;
	interactive?: boolean | undefined;
	className?: string | undefined;
	onClick?: (() => void) | undefined;
}

/**
 * Computes patient scoring metrics & sentiment category from patient metadata
 */
export function computePatientSentiment(
	// biome-ignore lint/suspicious/noExplicitAny: flexible input data
	patient: any,
	overrides?: {
		sentiment?: PatientSentimentType | null | undefined;
		ltvRub?: number | null | undefined;
		complianceScore?: number | null | undefined;
	},
): PatientSentimentInfo {
	if (!patient && !overrides?.sentiment) {
		return {
			type: "standard",
			label: "Стандартный профиль",
			shortLabel: "Стандарт",
			badgeEmoji: "🟢",
			colorTheme: "slate",
			description: "Стандартный профиль обслуживания пациента.",
			clinicalDirective: "Стандартный клинический протокол приёма и оформления карты 043/у.",
			calculatedLtvRub: overrides?.ltvRub ?? 0,
			complianceScorePercent: overrides?.complianceScore ?? 100,
			riskFactors: [],
		};
	}

	// 1. Explicit override wins
	const forcedType = overrides?.sentiment || patient?.sentimentType;

	// 2. Extract metrics
	const ltv =
		overrides?.ltvRub ??
		(typeof patient?.ltvRub === "number"
			? patient.ltvRub
			: typeof patient?.totalSpentRub === "number"
				? patient.totalSpentRub
				: typeof patient?.totalPaidRub === "number"
					? patient.totalPaidRub
					: typeof patient?.totalPaidKopecks === "number"
						? kopecksToRub(patient.totalPaidKopecks)
						: typeof patient?.balanceKopecks === "number" && patient.balanceKopecks > 0
							? kopecksToRub(patient.balanceKopecks)
							: typeof patient?.balanceRub === "number" && patient.balanceRub > 0
								? patient.balanceRub
								: 0);

	const tier = (
		patient?.loyaltyTier ||
		patient?.administrativeProfile?.loyaltyTier ||
		patient?.tier ||
		""
	).toLowerCase();

	const notes = String(patient?.notes || "").toLowerCase();
	const allergiesStr = String(
		patient?.allergies || patient?.allergiesText || patient?.anamnesis?.allergies || "",
	).toLowerCase();

	const hasCancelNotes = Boolean(
		notes.includes("отмен") ||
			notes.includes("неявк") ||
			notes.includes("не пришел") ||
			notes.includes("перенос") ||
			notes.includes("опозда"),
	);

	const hasConflictHistory = Boolean(
		patient?.hasLegalComplaints ||
			patient?.isConflictProne ||
			patient?.requiresStrictInformedConsent ||
			patient?.tags?.includes("конфликт") ||
			patient?.tags?.includes("претензия") ||
			notes.includes("конфликт") ||
			notes.includes("претензи") ||
			notes.includes("юрист") ||
			notes.includes("строг"),
	);

	const hasHighAllergies = Boolean(
		allergiesStr.includes("отек квинке") ||
			allergiesStr.includes("анафилак") ||
			allergiesStr.includes("новокаин") ||
			allergiesStr.includes("лидокаин") ||
			allergiesStr.includes("анестетик") ||
			patient?.hasSevereAllergies ||
			(Array.isArray(patient?.allergies) && patient.allergies.length > 0),
	);

	const cancelRatio =
		typeof patient?.cancellationRatio === "number"
			? patient.cancellationRatio
			: typeof patient?.noShowRate === "number"
				? patient.noShowRate
				: typeof patient?.noShowProbability === "number"
					? patient.noShowProbability
					: hasCancelNotes
						? 0.4
						: 0;

	let compliance =
		overrides?.complianceScore ??
		(typeof patient?.complianceScore === "number"
			? patient.complianceScore
			: typeof patient?.compliancePercent === "number"
				? patient.compliancePercent
				: hasCancelNotes || cancelRatio > 0.3
					? 65
					: tier === "platinum" || tier === "gold"
						? 95
						: 90);

	if (hasCancelNotes && compliance > 70) {
		compliance = 65;
	}

	const riskFactors: string[] = [];
	if (cancelRatio > 0.25 || compliance < 75 || hasCancelNotes) {
		riskFactors.push("Высокая вероятность срыва или переноса записи");
	}
	if (hasConflictHistory) {
		riskFactors.push("В анамнезе претензионные обращения или особые юридические требования");
	}
	if (hasHighAllergies) {
		riskFactors.push("Требуется строгое ИДС с подробным разъяснением рисков");
	}

	// 3. Classify
	let resolvedType: PatientSentimentType = "standard";

	if (forcedType) {
		resolvedType = forcedType;
	} else if (hasConflictHistory || hasHighAllergies) {
		resolvedType = "strict_ids_required";
	} else if (cancelRatio > 0.3 || compliance < 70 || (patient?.recentNoShowsCount ?? 0) >= 2 || hasCancelNotes) {
		resolvedType = "cancellation_risk";
	} else if (
		tier === "platinum" ||
		tier === "gold" ||
		tier === "vip" ||
		ltv >= 100000 ||
		compliance >= 95
	) {
		resolvedType = "loyal_vip";
	}

	switch (resolvedType) {
		case "loyal_vip":
			return {
				type: "loyal_vip",
				label: "VIP / Лояльный пациент",
				shortLabel: "VIP • Лояльный",
				badgeEmoji: "🟢",
				colorTheme: "emerald",
				description:
					"Пациент с высоким LTV, высокой дисциплиной визитов и высоким доверием к комплексным планам.",
				clinicalDirective:
					"Приоритетная запись в удобное время, персональный менеджер куратора, презентация комплексных планов.",
				calculatedLtvRub: ltv,
				complianceScorePercent: compliance,
				riskFactors,
			};
		case "cancellation_risk":
			return {
				type: "cancellation_risk",
				label: "Риск отмены / Неявки",
				shortLabel: "Риск отмены",
				badgeEmoji: "🟡",
				colorTheme: "amber",
				description:
					"Повышенная вероятность срыва записи или спонтанного переноса приёма (комплаенс снижен).",
				clinicalDirective:
					"Обязательный звонок администратора за 24 ч + контрольное SMS-напоминание утром в день приёма, бронирование с предоплатой.",
				calculatedLtvRub: ltv,
				complianceScorePercent: compliance,
				riskFactors,
			};
		case "strict_ids_required":
			return {
				type: "strict_ids_required",
				label: "Требуется строгое ИДС",
				shortLabel: "Строгое ИДС",
				badgeEmoji: "🔴",
				colorTheme: "rose",
				description:
					"Пациент требует расширенного информирования, детализации альтернатив лечения и видеофиксации согласий.",
				clinicalDirective:
					"100% оформление расширенного ИДС по приказу 1051н, протоколирование этапов в ЭМК и фотопротокол.",
				calculatedLtvRub: ltv,
				complianceScorePercent: compliance,
				riskFactors,
			};
		default:
			return {
				type: "standard",
				label: "Стандартный профиль",
				shortLabel: "Стандарт",
				badgeEmoji: "🟢",
				colorTheme: "slate",
				description:
					"Пациент со стабильной историей посещений и стандартными условиями обслуживания.",
				clinicalDirective: "Стандартный протокол приёма и оформления медицинской карты 043/у.",
				calculatedLtvRub: ltv,
				complianceScorePercent: compliance,
				riskFactors,
			};
	}
}

export const PatientSentimentBadge: React.FC<PatientSentimentBadgeProps> = ({
	patientId,
	patient,
	ltvRub,
	complianceScore,
	sentiment,
	variant = "pill",
	showLtv = true,
	showCompliance = true,
	interactive = true,
	className = "",
	onClick,
}) => {
	const popoverId = useId();
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

	const info = useMemo(
		() =>
			computePatientSentiment(patient, {
				sentiment,
				ltvRub,
				complianceScore,
			}),
		[patient, sentiment, ltvRub, complianceScore],
	);

	const updatePopoverPosition = () => {
		if (buttonRef.current && typeof window !== "undefined") {
			const rect = buttonRef.current.getBoundingClientRect();
			const popoverWidth = 320;
			const margin = 12;
			let left = rect.left;
			if (left + popoverWidth > window.innerWidth - margin) {
				left = window.innerWidth - popoverWidth - margin;
			}
			if (left < margin) {
				left = margin;
			}
			const top = rect.bottom + 6;
			setPopoverPos({ top, left });
		}
	};

	useEffect(() => {
		if (isOpen) {
			updatePopoverPosition();
			const handleResize = () => updatePopoverPosition();
			window.addEventListener("resize", handleResize);
			window.addEventListener("scroll", handleResize, true);
			return () => {
				window.removeEventListener("resize", handleResize);
				window.removeEventListener("scroll", handleResize, true);
			};
		}
	}, [isOpen]);

	const themeStyles = useMemo(() => {
		switch (info.colorTheme) {
			case "emerald":
				return {
					badgeBg: "bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60",
					badgeBorder: "border-emerald-500/40 dark:border-emerald-500/50",
					badgeText: "text-emerald-800 dark:text-emerald-200",
					dotBg: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]",
					accentIcon: <Crown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
					popoverHeaderBg: "bg-gradient-to-r from-emerald-500/20 to-teal-500/20",
				};
			case "amber":
				return {
					badgeBg: "bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-950/40 dark:hover:bg-amber-950/60",
					badgeBorder: "border-amber-500/40 dark:border-amber-500/50",
					badgeText: "text-amber-800 dark:text-amber-200",
					dotBg: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]",
					accentIcon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
					popoverHeaderBg: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
				};
			case "rose":
				return {
					badgeBg: "bg-rose-500/15 hover:bg-rose-500/25 dark:bg-rose-950/40 dark:hover:bg-rose-950/60",
					badgeBorder: "border-rose-500/40 dark:border-rose-500/50",
					badgeText: "text-rose-800 dark:text-rose-200",
					dotBg: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]",
					accentIcon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />,
					popoverHeaderBg: "bg-gradient-to-r from-rose-500/20 to-red-500/20",
				};
			default:
				return {
					badgeBg: "bg-[var(--paper-soft)] hover:bg-[var(--paper-soft)]/80",
					badgeBorder: "border-[var(--line)]",
					badgeText: "text-[var(--ink)]",
					dotBg: "bg-slate-400",
					accentIcon: <UserCheck className="w-3.5 h-3.5 text-[var(--muted,var(--ink-muted))] shrink-0" />,
					popoverHeaderBg: "bg-[var(--paper-soft)]",
				};
		}
	}, [info.colorTheme]);

	const formattedLtv = useMemo(() => {
		if (!info.calculatedLtvRub) return "0 ₽";
		return `${info.calculatedLtvRub.toLocaleString("ru-RU")} ₽`;
	}, [info.calculatedLtvRub]);

	const handleClick = (e: React.MouseEvent) => {
		if (onClick) {
			onClick();
			return;
		}
		if (interactive) {
			e.stopPropagation();
			updatePopoverPosition();
			setIsOpen((prev) => !prev);
		}
	};

	return (
		<div
			className={`inline-flex items-center shrink-0 ${className}`}
			data-testid="patient-sentiment-badge-root"
		>
			<button
				ref={buttonRef}
				type="button"
				onClick={handleClick}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-controls={isOpen ? popoverId : undefined}
				className={`group inline-flex items-center justify-center gap-1.5 px-2.5 py-1 min-h-[32px] sm:min-h-[36px] min-w-[110px] rounded-xl text-xs font-bold border transition-all duration-150 select-none shrink-0 ${
					interactive ? "cursor-pointer active:scale-98" : "cursor-default"
				} ${themeStyles.badgeBg} ${themeStyles.badgeBorder} ${themeStyles.badgeText}`}
				title={`${info.label} • LTV: ${formattedLtv} • Комплаенс: ${info.complianceScorePercent}%`}
				data-testid={`sentiment-badge-${info.type}`}
			>
				<span className={`w-2 h-2 rounded-full shrink-0 ${themeStyles.dotBg}`} />
				{themeStyles.accentIcon}
				<span className="font-bold tracking-tight">{info.shortLabel}</span>

				{showLtv && info.calculatedLtvRub > 0 && (
					<span className="text-xs font-mono opacity-85 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
						{formattedLtv}
					</span>
				)}

				{showCompliance && (
					<span className="text-xs font-semibold opacity-75 hidden sm:inline-flex items-center gap-0.5 shrink-0">
						<span>{info.complianceScorePercent}%</span>
					</span>
				)}
			</button>

			{/* Portal-based Detailed Clinical HIG Popover Modal */}
			{isOpen && typeof document !== "undefined" &&
				createPortal(
					<>
						<div
							className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-xs animate-in fade-in duration-100"
							onClick={(e) => {
								e.stopPropagation();
								setIsOpen(false);
							}}
							aria-hidden="true"
						/>
						<div
							id={popoverId}
							role="dialog"
							aria-label={info.label}
							style={{
								position: "fixed",
								top: `${popoverPos.top}px`,
								left: `${popoverPos.left}px`,
							}}
							className="w-[320px] max-w-[calc(100vw-24px)] p-3.5 rounded-2xl bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(255,255,255,0.12))] shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-150 space-y-3 pointer-events-auto"
							onClick={(e) => e.stopPropagation()}
							data-testid="patient-sentiment-popover"
						>
							{/* Popover Header */}
							<div
								className={`p-2.5 rounded-xl border border-[var(--line-subtle,rgba(255,255,255,0.06))] flex items-center justify-between gap-2 ${themeStyles.popoverHeaderBg}`}
							>
								<div className="flex items-center gap-2 min-w-0">
									{themeStyles.accentIcon}
									<div>
										<div className="text-xs font-black uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
											<span>{info.label}</span>
										</div>
										<div className="text-xs text-[var(--muted,var(--ink-muted))]">
											Клинический скоринг пациента
										</div>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setIsOpen(false)}
									className="p-1 min-h-[32px] min-w-[32px] rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted,var(--ink-muted))] hover:text-[var(--ink)] cursor-pointer inline-flex items-center justify-center transition-colors"
									aria-label="Закрыть"
								>
									<X size={16} />
								</button>
							</div>

							{/* Metric Stats Grid */}
							<div className="grid grid-cols-2 gap-2">
								<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line-subtle,rgba(255,255,255,0.05))]">
									<div className="text-xs font-semibold text-[var(--muted,var(--ink-muted))] uppercase flex items-center gap-1">
										<TrendingUp size={13} className="text-emerald-500" />
										<span>LTV Клиники</span>
									</div>
									<div className="text-sm font-black font-mono mt-0.5 text-[var(--ink)]">
										{formattedLtv}
									</div>
								</div>

								<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line-subtle,rgba(255,255,255,0.05))]">
									<div className="text-xs font-semibold text-[var(--muted,var(--ink-muted))] uppercase flex items-center gap-1">
										<Percent size={13} className="text-cyan-500" />
										<span>Комплаенс</span>
									</div>
									<div className="text-sm font-black font-mono mt-0.5 text-[var(--ink)]">
										{info.complianceScorePercent}%
									</div>
								</div>
							</div>

							{/* Clinical Directive */}
							<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line-subtle,rgba(255,255,255,0.05))] space-y-1 text-xs">
								<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
									<Info size={14} className="text-[var(--brand,#0d9488)]" />
									<span>Рекомендация врачу и куратору:</span>
								</div>
								<p className="text-xs font-medium leading-relaxed text-[var(--muted,var(--ink-muted))] m-0">
									{info.clinicalDirective}
								</p>
							</div>

							{/* Risk Factors if any */}
							{info.riskFactors.length > 0 && (
								<div className="space-y-1">
									<div className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
										<AlertTriangle size={13} />
										<span>Факторы внимания:</span>
									</div>
									<ul className="text-xs text-[var(--muted,var(--ink-muted))] space-y-0.5 pl-4 list-disc m-0">
										{info.riskFactors.map((factor) => (
											<li key={factor}>{factor}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</>,
					document.body,
				)}
		</div>
	);
};

export default PatientSentimentBadge;
