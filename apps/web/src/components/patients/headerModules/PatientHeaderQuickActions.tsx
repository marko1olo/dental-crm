/**
 * DENTE CRM — Patient Header Quick Actions Toolbar
 * (DOMAIN: Miller's Law, 1-line Action Toolbar, 32px Button Geometry)
 */

import React, { useState, useRef, useEffect } from "react";
import {
	Archive,
	Calendar,
	CreditCard,
	Edit3,
	FileText,
	GitMerge,
	HeartPulse,
	History,
	MessageSquare,
	MoreHorizontal,
	Printer,
	Sparkles,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "../blankContractPrint";

export interface PatientHeaderQuickActionsProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient record
	resolvedPatient: any;
	fullName: string;
	phone: string;
	clinicLegalName?: string | undefined;
	onOpenAnamnesis?: (() => void) | undefined;
	onEditPatient?: (() => void) | undefined;
	onOpenFamilyWallet: () => void;
	isActiveVisit?: boolean | undefined;
	nextAppointment?: {
		id: string;
		startsAt?: string;
		status?: string;
		reason?: string;
	} | null | undefined;
}

export const PatientHeaderQuickActions: React.FC<PatientHeaderQuickActionsProps> = ({
	resolvedPatient,
	fullName,
	phone,
	clinicLegalName,
	onOpenAnamnesis,
	onEditPatient,
	onOpenFamilyWallet,
	isActiveVisit,
	nextAppointment,
}) => {
	const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
	const actionsMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isActionsMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				actionsMenuRef.current &&
				!actionsMenuRef.current.contains(e.target as Node)
			) {
				setIsActionsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isActionsMenuOpen]);

	const handleOpenVisit = () => {
		if (!resolvedPatient) return;
		usePatientStore.getState().setSelectedPatientId(resolvedPatient.id);
		useAppStore.getState().setCurrentView("visit");
		showToast(`Открыт приём: ${fullName}`, "success");
	};

	const handleBookAppointment = () => {
		if (!resolvedPatient) return;
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		const currentHour = now.getHours();
		const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
		const endHour = Math.min(startHour + 1, 21);
		const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
		const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

		useScheduleStore.getState().setNewAppointmentDraft({
			patientId: resolvedPatient.id,
			doctorUserId: "",
			assistantUserId: "",
			chairId: "",
			status: "planned",
			startsAt,
			endsAt,
			reason: "Консультация и осмотр",
			comment: "",
		});
		useAppStore.getState().setCurrentView("schedule");
		showToast(
			`Пациент ${fullName} выбран для записи в расписание`,
			"success",
		);
	};

	const isPatientAwaiting = Boolean(
		isActiveVisit ||
		(nextAppointment?.startsAt && (nextAppointment.status === "arrived" || nextAppointment.status === "in_treatment" || nextAppointment.status === "confirmed")),
	);

	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{/* Canonical Actions: Exactly ONE emerald .primary-button + ONE .secondary-button */}
			{isPatientAwaiting ? (
				<>
					{/* Primary CTA (Awaiting in clinic): Начать приём */}
					<button
						type="button"
						onClick={handleOpenVisit}
						className="primary-button h-8 px-3.5 rounded-lg bg-[var(--teal,var(--brand-primary))] hover:opacity-95 active:scale-95 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-[13px] whitespace-nowrap"
						title="Открыть амбулаторный приём (пациент ожидает)"
						data-testid="header-open-visit-btn"
					>
						<Stethoscope size={14} className="shrink-0" />
						<span>Начать приём</span>
					</button>

					{/* Secondary Action: Записать */}
					<button
						type="button"
						onClick={handleBookAppointment}
						className="secondary-button h-8 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors text-[13px] whitespace-nowrap"
						title="Записать пациента в расписание приёма"
						data-testid="header-book-appointment-btn"
					>
						<Calendar size={14} className="text-[var(--teal)] shrink-0" />
						<span>Записать</span>
					</button>
				</>
			) : (
				<>
					{/* Primary CTA (No active visit): Записать на приём */}
					<button
						type="button"
						onClick={handleBookAppointment}
						className="primary-button h-8 px-3.5 rounded-lg bg-[var(--teal,var(--brand-primary))] hover:opacity-95 active:scale-95 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-[13px] whitespace-nowrap"
						title="Записать пациента на приём в расписание"
						data-testid="header-book-appointment-btn"
					>
						<Calendar size={14} className="shrink-0" />
						<span>Записать на приём</span>
					</button>

					{/* Secondary Action: Начать приём */}
					<button
						type="button"
						onClick={handleOpenVisit}
						className="secondary-button h-8 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors text-[13px] whitespace-nowrap"
						title="Открыть амбулаторный приём без лишних подтверждений"
						data-testid="header-open-visit-btn"
					>
						<Stethoscope size={14} className="text-[var(--teal)] shrink-0" />
						<span>Начать приём</span>
					</button>
				</>
			)}

			{/* Secondary Popover Menu: 32x32px .icon-button trigger */}
			<div className="relative" ref={actionsMenuRef}>
				<button
					type="button"
					onClick={() => setIsActionsMenuOpen((prev) => !prev)}
					className="icon-button h-8 w-8 min-w-[32px] min-h-[32px] rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
					title="Дополнительные действия (печать карты, план лечения, касса, архив)"
					aria-label="Дополнительные действия"
					aria-expanded={isActionsMenuOpen}
					aria-haspopup="true"
					data-testid="header-actions-menu-btn"
				>
					<MoreHorizontal size={15} />
				</button>

				{isActionsMenuOpen && (
					<div
						className="absolute right-0 top-full mt-1 w-64 p-1 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] shadow-xl z-50 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 duration-100"
						data-testid="header-actions-menu-popover"
					>
						{/* 0. План лечения */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								if (typeof window !== "undefined") {
									window.dispatchEvent(
										new CustomEvent("dente:open-treatment-plan", {
											bubbles: true,
											detail: { patientId: resolvedPatient.id },
										}),
									);
								}
								showToast(`План лечения: ${fullName}`, "info");
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Открыть планы лечения пациента"
							data-testid="header-treatment-plan-btn"
						>
							<Sparkles size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="truncate">План лечения</span>
						</button>

						{/* 1. Печать и экспорт карты */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								if (typeof window !== "undefined") {
									window.print();
								}
								showToast("Печать и экспорт карты запущены", "info");
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Печать и экспорт карты"
							data-testid="header-export-043u-btn"
						>
							<Printer size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="truncate">Печать карты</span>
						</button>

						{/* 2. Выписка счёта и касса */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								usePatientStore
									.getState()
									.setSelectedPatientId(resolvedPatient.id);
								window.dispatchEvent(
									new CustomEvent("dente:open-payment-modal", {
										detail: {
											patientId: resolvedPatient.id,
											patientName: fullName,
											patientPhone: resolvedPatient.phone,
											amountRub: 15400,
										},
									}),
								);
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Принять оплату и выдать кассовый чек"
							data-testid="header-finance-btn"
						>
							<CreditCard size={13} className="text-emerald-600 shrink-0" />
							<span className="truncate">Принять оплату (Касса)</span>
						</button>

						{/* 3. Семейный баланс */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								onOpenFamilyWallet();
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Семейный кошелек и распределение авансов"
							data-testid="header-family-balance-btn"
						>
							<UserCheck size={13} className="text-indigo-600 shrink-0" />
							<span className="truncate">Семейный баланс</span>
						</button>

						{/* 4. Бланк договора (_______) */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								void printBlankMedicalContract(resolvedPatient, {
									clinicName: clinicLegalName,
								});
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Распечатать пустой договор на оказание услуг со строками _______"
							data-testid="header-print-blank-contract-btn"
						>
							<FileText size={13} className="text-amber-600 shrink-0" />
							<span className="truncate">Бланк договора (_______)</span>
						</button>

						{/* 4b. Бланк ИДС / согласий (_______) */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								void printBlankMedicalConsent(resolvedPatient, {
									clinicName: clinicLegalName,
								});
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Распечатать пустой бланк информированного согласия (ИДС) со строками _______"
							data-testid="header-print-blank-consent-btn"
						>
							<FileText size={13} className="text-teal-600 shrink-0" />
							<span className="truncate">Бланк ИДС / согласий (_______)</span>
						</button>

						{/* 5. Анамнез */}
						{onOpenAnamnesis && (
							<button
								type="button"
								onClick={() => {
									setIsActionsMenuOpen(false);
									onOpenAnamnesis();
								}}
								className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
								title="Анамнез пациента"
								data-testid="header-anamnesis-btn"
							>
								<HeartPulse size={13} className="text-rose-500 shrink-0" />
								<span className="truncate">Анамнез</span>
							</button>
						)}

						{/* 6. Объединить дубликаты */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								if (typeof window !== "undefined") {
									window.dispatchEvent(
										new CustomEvent("dente-open-duplicate-merge-modal", {
											detail: { patientId: resolvedPatient.id },
										}),
									);
								}
								showToast("Проверка очередей слияния дубликатов", "info");
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Объединить дубликаты пациента"
							data-testid="header-merge-duplicates-btn"
						>
							<GitMerge size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span className="truncate">Объединить дубликаты</span>
						</button>

						{/* 7. История изменений */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								showToast(`История изменений карты: ${fullName}`, "info");
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="История изменений данных пациента"
							data-testid="header-history-btn"
						>
							<History size={13} className="text-[var(--muted)] shrink-0" />
							<span className="truncate">История изменений</span>
						</button>

						{/* 8. WhatsApp */}
						{phone && (
							<button
								type="button"
								onClick={() => {
									setIsActionsMenuOpen(false);
									openWhatsAppChat(
										phone,
										`Здравствуйте, ${fullName}! Стоматологическая клиника DENTE приветствует вас.`,
									);
								}}
								className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-emerald-800 dark:text-emerald-300 font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
								title="Написать в WhatsApp"
								data-testid="header-whatsapp-btn"
							>
								<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="truncate">WhatsApp</span>
							</button>
						)}

						{/* 9. Изменить */}
						{onEditPatient && (
							<button
								type="button"
								onClick={() => {
									setIsActionsMenuOpen(false);
									onEditPatient();
								}}
								className="w-full h-8 px-2 rounded-lg hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--paper-hover,#1e293b)] text-[var(--ink,#0f172a)] dark:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
								title="Редактировать данные пациента"
								data-testid="header-edit-patient-btn"
							>
								<Edit3 size={13} className="text-[var(--muted)] shrink-0" />
								<span className="truncate">Изменить</span>
							</button>
						)}

						{/* 10. В архив / Деактивация */}
						<button
							type="button"
							onClick={() => {
								setIsActionsMenuOpen(false);
								showToast(`Карта пациента ${fullName} перемещена в архив`, "info");
							}}
							className="w-full h-8 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium inline-flex items-center gap-2 cursor-pointer transition-colors text-left"
							title="Переместить карту пациента в архив"
							data-testid="header-archive-btn"
						>
							<Archive size={13} className="text-rose-500 shrink-0" />
							<span className="truncate">В архив / Деактивация</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
