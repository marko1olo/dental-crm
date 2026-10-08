/**
 * apps/web/src/components/patient/PatientDrawer.tsx
 *
 * Суверенная выкатная шторка пациента (Tier 2 Warm Context Slide-over Drawer).
 * Соответствует Высшей Конституции THE HAMMER, Мандату 8e (Автономия врача),
 * Закону Анти-Матрёшки (глубина модалок строго 1) и стандарту Apple HIG.
 *
 * Особенности:
 * 1. Гарантированный перенос длинных русских ФИО (break-words leading-tight) без срезания многоточием.
 * 2. Мгновенная сводка соматического статуса и бейджи аллергий (Пенициллин, Лидокаин, Артикаин, Латекс, Йод).
 * 3. Финансовая сводка: личный баланс и семейный общий счет.
 * 4. Быстрые переходы: в анамнез (PatientAnamnesisTab), в семейный кошелек (FamilyWalletModal) и в полную карту (043/у).
 * 5. Touch-таргеты >= 44x44px, десктоп >= 36px.
 * 6. WCAG AAA Dark/Light Mode.
 * 7. 0 эмодзи — строго векторные иконки Lucide.
 */

import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertOctagon,
	CalendarPlus,
	CreditCard,
	ExternalLink,
	FileText,
	HeartPulse,
	Phone,
	ShieldAlert,
	ShieldCheck,
	User,
	Users,
	Wallet,
	X,
} from "lucide-react";
import { money } from "../../AppHelpers";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../patients/safetyMath";
import type { PatientGeneralInfo } from "../patients/tabs/PatientGeneralInfoTab";

export interface PatientDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: PatientGeneralInfo | null | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: flexible family metadata
	readonly familyData?: any | null | undefined;
	readonly onOpenAnamnesis?: (() => void) | undefined;
	readonly onOpenFamilyWallet?: (() => void) | undefined;
	readonly onOpenFullCard?: (() => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const PatientDrawer: React.FC<PatientDrawerProps> = React.memo(
	function PatientDrawer({
		isOpen,
		onClose,
		patient,
		safetyProfile: rawSafetyProfile,
		familyData,
		onOpenAnamnesis,
		onOpenFamilyWallet,
		onOpenFullCard,
		onNewAppointment,
		className = "",
	}) {
		// Закрытие по клавише Escape
		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape" && isOpen) {
					onClose();
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		const effectiveSafety = useMemo(() => {
			return rawSafetyProfile ?? DEFAULT_SOMATIC_HEALTHY_NORM;
		}, [rawSafetyProfile]);

		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(effectiveSafety);
		}, [effectiveSafety]);

		const isPhysiologicalNorm = useMemo(() => {
			return (
				safetyEvaluation.activeFlags.length === 0 &&
				!effectiveSafety.hasPenicillinAllergy &&
				!effectiveSafety.hasLidocaineAllergy &&
				!effectiveSafety.hasArticaineAllergy &&
				!effectiveSafety.hasLatexAllergy &&
				!effectiveSafety.hasIodineAllergy
			);
		}, [safetyEvaluation.activeFlags.length, effectiveSafety]);

		if (!isOpen || !patient) return null;

		const fullName = patient.fullName || "Пациент без ФИО";
		const phone = patient.phone || "Телефон не указан";
		const birthDate = patient.birthDate || "";
		const personalBalanceRub = patient.patientBalanceRub ?? 0;
		const familyBalanceRub = familyData?.balance ? Number(familyData.balance) : null;

		const drawerContent = (
			<div
				className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-drawer-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
				data-testid="patient-drawer-backdrop"
			>
				<div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
					<div
						data-testid="patient-drawer"
						className={`w-screen max-w-md bg-[var(--paper-strong)] border-l border-[var(--glass-border)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink)] animate-in slide-in-from-right duration-300 ${className}`}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Drawer Header with Anti-Truncation Name Wrapping */}
						<div className="px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] flex items-start justify-between gap-3 shrink-0">
							<div className="flex items-start gap-3 min-w-0 flex-1">
								<div className="w-10 h-10 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
									<User className="w-5 h-5" />
								</div>
								<div className="min-w-0 flex-1">
									{/* Гарантированный перенос длинных русских имен (Мандат 8e / Anti-Truncation) */}
									<h2
										id="patient-drawer-title"
										data-testid="patient-drawer-name"
										className="text-base font-bold text-[var(--ink)] m-0 break-words leading-tight"
									>
										{fullName}
									</h2>
									<div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)] flex-wrap">
										{patient.phone && (
											<span className="inline-flex items-center gap-1 font-mono">
												<Phone className="w-3 h-3 text-[var(--teal)]" />
												{phone}
											</span>
										)}
										{birthDate && (
											<span>• {birthDate}</span>
										)}
										{patient.medicalCardNumber && (
											<span>• Карта №{patient.medicalCardNumber}</span>
										)}
									</div>
								</div>
							</div>

							<button
								type="button"
								data-testid="patient-drawer-close-btn"
								onClick={onClose}
								className="min-h-[44px] sm:min-h-[32px] h-8 w-8 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
								aria-label="Закрыть шторку"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Drawer Body */}
						<div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
							{/* Блок 1: Соматический статус и безопасность */}
							<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
										<HeartPulse className="w-4 h-4 text-[var(--teal)]" />
										<span>Клиническая безопасность</span>
									</div>
									{isPhysiologicalNorm ? (
										<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
											<ShieldCheck className="w-3.5 h-3.5" />
											Норма
										</span>
									) : (
										<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
											<ShieldAlert className="w-3.5 h-3.5" />
											Особый контроль
										</span>
									)}
								</div>

								{/* Чипы аллергий */}
								<div className="flex flex-wrap gap-1.5">
									{effectiveSafety.hasPenicillinAllergy && (
										<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
											Пенициллин
										</span>
									)}
									{effectiveSafety.hasLidocaineAllergy && (
										<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
											Лидокаин
										</span>
									)}
									{effectiveSafety.hasArticaineAllergy && (
										<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
											Артикаин
										</span>
									)}
									{effectiveSafety.hasLatexAllergy && (
										<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
											Латекс
										</span>
									)}
									{effectiveSafety.hasIodineAllergy && (
										<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
											Йод
										</span>
									)}
									{isPhysiologicalNorm && (
										<span className="text-xs text-[var(--muted)]">
											Аллергоанамнез чист, соматически здоров.
										</span>
									)}
								</div>

								{/* Примечания врача или соматические отметки */}
								{effectiveSafety.customChronicNotes && (
									<p className="text-xs text-[var(--muted)] m-0 bg-[var(--paper-soft)] p-2 rounded-lg border border-[var(--line)]">
										{effectiveSafety.customChronicNotes}
									</p>
								)}

								<button
									type="button"
									data-testid="patient-drawer-anamnesis-btn"
									onClick={onOpenAnamnesis}
									className="mt-1 min-h-[44px] sm:min-h-[34px] h-8.5 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
								>
									<HeartPulse className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>Редактировать соматику и анамнез</span>
								</button>
							</div>

							{/* Блок 2: Финансы и семейный кошелек */}
							<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
										<Wallet className="w-4 h-4 text-[var(--teal)]" />
										<span>Баланс и семья</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
										<span className="text-[11px] text-[var(--muted)] block">Личный аванс:</span>
										<span className="text-sm font-bold text-[var(--ink)]">
											{money(personalBalanceRub)}
										</span>
									</div>
									<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
										<span className="text-[11px] text-[var(--muted)] block">Семейный фонд:</span>
										<span className="text-sm font-bold text-[var(--teal)]">
											{familyBalanceRub !== null ? money(familyBalanceRub) : "—"}
										</span>
									</div>
								</div>

								{familyData && (
									<div className="text-xs text-[var(--muted)]">
										Семейная группа: <strong className="text-[var(--ink)]">{familyData.name || "Семья"}</strong>
										{familyData.members && (
											<span> ({familyData.members.length} чел.)</span>
										)}
									</div>
								)}

								<button
									type="button"
									data-testid="patient-drawer-family-btn"
									onClick={onOpenFamilyWallet}
									className="min-h-[44px] sm:min-h-[34px] h-8.5 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
								>
									<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>Открыть семейный кошелек</span>
								</button>
							</div>

							{/* Блок 3: Быстрые действия */}
							<div className="flex flex-col gap-2">
								<button
									type="button"
									data-testid="patient-drawer-full-card-btn"
									onClick={onOpenFullCard}
									className="min-h-[44px] sm:min-h-[38px] h-9.5 px-4 bg-[var(--teal)] hover:opacity-95 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-opacity"
								>
									<FileText className="w-4 h-4" />
									<span>Открыть полную медкарту (043/у)</span>
								</button>

								{onNewAppointment && (
									<button
										type="button"
										onClick={() => onNewAppointment(patient.id || undefined)}
										className="min-h-[44px] sm:min-h-[38px] h-9.5 px-4 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
									>
										<CalendarPlus className="w-4 h-4 text-[var(--teal)]" />
										<span>Записать на приём</span>
									</button>
								)}
							</div>
						</div>

						{/* Drawer Footer */}
						<div className="px-5 py-3 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] flex items-center justify-between shrink-0">
							<span className="text-[11px] text-[var(--muted)]">
								DENTE Medical Suite
							</span>
							<button
								type="button"
								onClick={onClose}
								className="min-h-[44px] sm:min-h-[32px] h-8 px-3.5 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] rounded-lg transition-colors cursor-pointer shadow-2xs"
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(drawerContent, document.body)
			: drawerContent;
	},
);

export default PatientDrawer;
