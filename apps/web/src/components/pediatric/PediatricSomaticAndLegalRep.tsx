/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC SOMATIC STATUS & LEGAL REPRESENTATIVE COMPONENT
 * 1-Click Pediatric Somatic Norm (Мандат 8e: соматическая норма для детей)
 * Auto-substitution of Legal Representative (Родитель) into Form 043/u
 * Without forced extra fields (Doctor Autonomy Mandates 8e, 8n)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import { Check, Heart, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { ToothDeciduous } from "../icons/DentalIcons";

export interface PediatricSomaticStatus {
	readonly isNormal: boolean;
	readonly summaryRu: string;
	readonly physicalDevelopmentRu: string;
	readonly allergiesRu: string;
	readonly infectionsRu: string;
	readonly chronicDiseasesRu: string;
	readonly notesRu?: string;
}

export const PEDIATRIC_SOMATIC_NORM_SUMMARY = "Ребенок соматически здоров, контактен. Аллергии нет";

export const DEFAULT_PEDIATRIC_SOMATIC_NORM: PediatricSomaticStatus = {
	isNormal: true,
	summaryRu: PEDIATRIC_SOMATIC_NORM_SUMMARY,
	physicalDevelopmentRu: "Физическое развитие соответствует возрасту",
	allergiesRu: "Аллергологический анамнез не отягощен (аллергия на местные анестетики отсутствует)",
	infectionsRu: "Детские инфекции без осложнений, контакт с инфекционными больными в течение 21 дня отрицает",
	chronicDiseasesRu: "Хронические соматические заболевания отсутствуют, соматически здоров",
};

export type LegalRepresentativeRole = "Мать" | "Отец" | "Опекун" | "Усыновитель" | "Родитель";

export interface LegalRepresentativeData {
	readonly role: LegalRepresentativeRole;
	readonly fullName: string;
	readonly phone: string;
	readonly statutoryDocument: string;
	readonly consentSigned: boolean;
}

export const DEFAULT_LEGAL_REPRESENTATIVE: LegalRepresentativeData = {
	role: "Мать",
	fullName: "",
	phone: "",
	statutoryDocument: "ст. 20 323-ФЗ, ст. 64 СК РФ (законный представитель)",
	consentSigned: true,
};

/**
 * Человеческий медицинский формат представителя ребенка без птичьего языка
 */
export function formatPediatricRepresentativeText(
	rep: LegalRepresentativeData,
	patientAge?: number | null | undefined,
): string {
	const repRole = rep.role === "Мать" ? "Мама" : rep.role === "Отец" ? "Папа" : rep.role;
	const namePart = rep.fullName.trim();
	const phonePart = rep.phone.trim();
	const details = [namePart, phonePart].filter(Boolean).join(", ");

	if (patientAge !== null && patientAge !== undefined && patientAge >= 15) {
		const consentPart = rep.consentSigned
			? "Согласие на лечение получено (пациент 15+ лет / представитель, ст. 54 323-ФЗ)"
			: "Согласие может быть подписано пациентом самостоятельно (15+ лет, ст. 54 323-ФЗ) или представителем";
		return details
			? `Родитель/представитель: ${repRole} (${details}). ${consentPart}.`
			: `Родитель/представитель: ${repRole}. ${consentPart}.`;
	}

	const consentPart = rep.consentSigned
		? "Согласие на лечение получено"
		: "ВНИМАНИЕ: требуется подписание согласия родителем";

	return details
		? `Родитель: ${repRole} (${details}). ${consentPart}.`
		: `Родитель: ${repRole}. ${consentPart}.`;
}

export interface PediatricSomaticAndLegalRepProps {
	/** Начальный соматический статус */
	readonly initialSomatic?: Partial<PediatricSomaticStatus> | undefined;
	/** Обработчик изменения соматического статуса */
	readonly onSomaticChange?: ((status: PediatricSomaticStatus, formattedText: string) => void) | undefined;
	/** Данные законного представителя (если переданы из карточки пациента) */
	readonly initialRepresentative?: Partial<LegalRepresentativeData> | undefined;
	/** Имя родителя из профиля пациента для автоподстановки */
	readonly defaultRepresentativeFullName?: string | undefined;
	/** Телефон родителя из профиля пациента для автоподстановки */
	readonly defaultRepresentativePhone?: string | undefined;
	/** Роль представителя из профиля (например "Мать" или "Отец") */
	readonly defaultRepresentativeRole?: string | undefined;
	/** Обработчик изменения представителя */
	readonly onRepresentativeChange?: ((rep: LegalRepresentativeData, formattedText: string) => void) | undefined;
	/** Возраст пациента (для валидации ст. 54 323-ФЗ: с 15 лет пациент вправе подписывать ИДС сам) */
	readonly patientAge?: number | null | undefined;
	/** Дополнительный CSS класс */
	readonly className?: string | undefined;
}

export const PediatricSomaticAndLegalRep: React.FC<PediatricSomaticAndLegalRepProps> = ({
	initialSomatic,
	onSomaticChange,
	initialRepresentative,
	defaultRepresentativeFullName = "",
	defaultRepresentativePhone = "",
	defaultRepresentativeRole,
	onRepresentativeChange,
	patientAge,
	className = "",
}) => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. СОМАТИЧЕСКАЯ НОРМА РЕБЕНКА (1-КЛИК)
	// ─────────────────────────────────────────────────────────────────────────
	const [somaticStatus, setSomaticStatus] = useState<PediatricSomaticStatus>({
		...DEFAULT_PEDIATRIC_SOMATIC_NORM,
		...initialSomatic,
	});

	const formatSomaticText = useCallback((status: PediatricSomaticStatus): string => {
		if (status.isNormal) {
			const summary = status.summaryRu || PEDIATRIC_SOMATIC_NORM_SUMMARY;
			return [
				`Соматический статус ребенка: ${summary}.`,
				`• Физическое развитие: ${status.physicalDevelopmentRu}.`,
				`• Аллергологический анамнез: ${status.allergiesRu}.`,
				`• Инфекционный анамнез: ${status.infectionsRu}.`,
				`• Хронические заболевания: ${status.chronicDiseasesRu}.`,
				"• Противопоказаний к амбулаторному стоматологическому лечению нет.",
			].join("\n");
		}
		return [
			"Соматический статус ребенка: выявлены особенности анамнеза.",
			status.notesRu ? `• Особенности: ${status.notesRu}.` : "",
			`• Аллергологический анамнез: ${status.allergiesRu}.`,
			`• Хронические заболевания: ${status.chronicDiseasesRu}.`,
		].filter(Boolean).join("\n");
	}, []);

	const handleApply1ClickSomaticNorm = useCallback(() => {
		const norm = { ...DEFAULT_PEDIATRIC_SOMATIC_NORM };
		setSomaticStatus(norm);
		const text = formatSomaticText(norm);
		onSomaticChange?.(norm, text);
	}, [formatSomaticText, onSomaticChange]);

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ (АВТОПОДСТАНОВКА БЕЗ ПРИНУЖДЕНИЯ)
	// ─────────────────────────────────────────────────────────────────────────
	const resolvedRole: LegalRepresentativeRole = useMemo(() => {
		if (initialRepresentative?.role) return initialRepresentative.role;
		if (defaultRepresentativeRole) {
			if (["Мать", "Отец", "Опекун", "Усыновитель", "Родитель"].includes(defaultRepresentativeRole)) {
				return defaultRepresentativeRole as LegalRepresentativeRole;
			}
		}
		return "Мать";
	}, [initialRepresentative?.role, defaultRepresentativeRole]);

	const [representative, setRepresentative] = useState<LegalRepresentativeData>({
		role: resolvedRole,
		fullName: initialRepresentative?.fullName || defaultRepresentativeFullName || "",
		phone: initialRepresentative?.phone || defaultRepresentativePhone || "",
		statutoryDocument: initialRepresentative?.statutoryDocument || "ст. 20 323-ФЗ, ст. 64 СК РФ (законный представитель)",
		consentSigned: initialRepresentative?.consentSigned ?? true,
	});

	const formatRepresentativeText = useCallback((rep: LegalRepresentativeData): string => {
		return formatPediatricRepresentativeText(rep, patientAge);
	}, [patientAge]);

	const handleUpdateRepresentative = useCallback((updates: Partial<LegalRepresentativeData>) => {
		setRepresentative((prev) => {
			const next = { ...prev, ...updates };
			const text = formatRepresentativeText(next);
			onRepresentativeChange?.(next, text);
			return next;
		});
	}, [formatRepresentativeText, onRepresentativeChange]);

	const handle1ClickParentPresent = useCallback(() => {
		const statutoryDoc =
			patientAge !== null && patientAge !== undefined && patientAge >= 15
				? "ст. 54 323-ФЗ (пациент 15+ лет), ст. 64 СК РФ"
				: "ст. 20 323-ФЗ, ст. 64 СК РФ (законный представитель)";
		const updated: LegalRepresentativeData = {
			...representative,
			consentSigned: true,
			statutoryDocument: statutoryDoc,
		};
		setRepresentative(updated);
		onRepresentativeChange?.(updated, formatRepresentativeText(updated));
	}, [representative, onRepresentativeChange, formatRepresentativeText, patientAge]);

	return (
		<div
			className={`pediatric-somatic-legal-rep space-y-3 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 ${className}`.trim()}
			data-testid="pediatric-somatic-legal-rep"
		>
			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* РАЗДЕЛ 1: СОМАТИЧЕСКАЯ НОРМА РЕБЕНКА В 1 КЛИК */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3">
				<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Heart className="h-4 w-4 text-rose-500 shrink-0" />
						<span className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)]">
							Соматический статус ребенка:
						</span>
					</div>

					{/* 1-Клик кнопка соматической нормы */}
					<button
						type="button"
						onClick={handleApply1ClickSomaticNorm}
						className="min-h-[36px] sm:h-8 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
						title="Физиологическая норма развития, аллергоанамнез не отягощен, соматически здоров"
						data-testid="btn-one-click-somatic-norm"
					>
						<ToothDeciduous className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Соматическая норма ребенка</span>
					</button>
				</div>

				{/* Индикатор нормы */}
				<div className="flex items-center gap-2 text-xs">
					{somaticStatus.isNormal ? (
						<div
							className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-full"
							data-testid="pediatric-somatic-norm-indicator"
						>
							<ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>{somaticStatus.summaryRu || PEDIATRIC_SOMATIC_NORM_SUMMARY}</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg w-full">
							<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
							<span>Особенности анамнеза: {somaticStatus.notesRu || "требует внимания врача"}</span>
						</div>
					)}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* РАЗДЕЛ 2: АВТОПОДСТАНОВКА ЗАКОННОГО ПРЕДСТАВИТЕЛЯ (РОДИТЕЛЯ) В КАРТУ */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3">
				<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<UserCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)]">
							Родитель / Законный представитель:
						</span>
						<span className="sr-only">Медицинская карта, ст. 20 323-ФЗ, ст. 64 СК РФ</span>
					</div>

					<button
						type="button"
						onClick={handle1ClickParentPresent}
						className="min-h-[32px] sm:h-7 px-2 rounded-lg border border-teal-500/30 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 hover:bg-teal-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
						title="Родитель присутствует, согласие оформлено"
						data-testid="btn-parent-present-norm"
					>
						<Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
						<span>Родитель на приёме (норма)</span>
					</button>
				</div>

				{/* Выбор роли представителя (чипы) */}
				<div className="mb-2 flex flex-wrap items-center gap-1.5">
					<span className="text-[11px] text-[var(--muted,#64748b)] mr-1">Роль:</span>
					{(["Мать", "Отец", "Опекун", "Родитель"] as const).map((role) => {
						const isSelected = representative.role === role;
						return (
							<button
								key={role}
								type="button"
								onClick={() => handleUpdateRepresentative({ role })}
								className={`min-h-[32px] sm:h-7 px-2.5 rounded-lg text-xs font-bold border transition cursor-pointer select-none ${
									isSelected
										? "bg-teal-600 text-white border-teal-600 shadow-xs"
										: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper,#ffffff)]"
								}`}
								data-testid={`rep-role-chip-${role}`}
							>
								{role}
							</button>
						);
					})}
				</div>

				{/* Поля ФИО и телефона (опциональные, без блокировок!) */}
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<div>
						<label htmlFor="rep-fullname-input" className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-0.5">
							ФИО родителя:
						</label>
						<input
							id="rep-fullname-input"
							type="text"
							value={representative.fullName}
							onChange={(e) => handleUpdateRepresentative({ fullName: e.target.value })}
							placeholder="Например: Смирнова Анна Павловна"
							className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-hidden"
							data-testid="input-representative-fullname"
						/>
					</div>

					<div>
						<label htmlFor="rep-phone-input" className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-0.5">
							Телефон родителя:
						</label>
						<input
							id="rep-phone-input"
							type="text"
							value={representative.phone}
							onChange={(e) => handleUpdateRepresentative({ phone: e.target.value })}
							placeholder="+7 (___) ___-__-__"
							className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-hidden"
							data-testid="input-representative-phone"
						/>
					</div>
				</div>

				{/* Документ-основание и статус согласия */}
				<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted,#64748b)] border-t border-[var(--line,#e2e8f0)] pt-1.5">
					<div className="flex items-center gap-1.5">
						<span className="font-semibold text-teal-800 dark:text-teal-300">
							Статус:
						</span>
						<span className="font-semibold text-[var(--ink,#0f172a)]">
							{patientAge !== null && patientAge !== undefined && patientAge >= 15
								? "Пациент 15+ лет (ст. 54 323-ФЗ) / Законный представитель"
								: "Законный представитель ребёнка"}
						</span>
						<span className="sr-only font-mono text-[10px]">
							{representative.statutoryDocument}
						</span>
					</div>

					<label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[var(--ink,#0f172a)]">
						<input
							type="checkbox"
							checked={representative.consentSigned}
							onChange={(e) => handleUpdateRepresentative({ consentSigned: e.target.checked })}
							className="rounded border-[var(--line,#e2e8f0)] text-teal-600 focus:ring-teal-500"
							data-testid="checkbox-rep-consent"
						/>
						<span>Согласие на приём оформлено</span>
						<span className="sr-only">(ст. 20, 54 323-ФЗ)</span>
					</label>
				</div>

				{!representative.consentSigned && (
					<div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs" data-testid="rep-consent-warning-banner">
						<div className="flex items-center gap-1.5 min-w-0">
							<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
							<span className="truncate">
								{patientAge !== null && patientAge !== undefined && patientAge >= 15
									? "323-ФЗ ст. 54: пациент старше 15 лет вправе подписать ИДС лично либо через законного представителя"
									: "323-ФЗ ст. 20: требуется подписание ИДС родителем перед инвазивным вмешательством"}
							</span>
						</div>
						<button
							type="button"
							onClick={handle1ClickParentPresent}
							className="min-h-[28px] px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shrink-0 cursor-pointer transition active:scale-95"
							data-testid="btn-one-click-sign-consent"
						>
							Подписать ИДС
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default PediatricSomaticAndLegalRep;
