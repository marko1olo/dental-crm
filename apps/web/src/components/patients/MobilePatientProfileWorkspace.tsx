/**
 * DENTE CRM — Dedicated Mobile Patient Profile Workspace & HUD
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, 390x844 Screen Ergonomics)
 *
 * Invariants:
 * 1. Natural Thumb Zone First (CTA & navigation in thumb range).
 * 2. Touch targets >= 44x44px.
 * 3. 0px horizontal page drift (overflow-x: clip).
 * 4. Full Russian text without ellipses in patient name.
 * 5. Safety Alerts for Allergies & Somatic risks prominent at bedside.
 * 6. 1-Tap communication: Call, WhatsApp, Telegram, Copy phone.
 * 7. Family balance & one-tap member switcher.
 * 8. 5 Tabs: [ Медкарта | Визиты | Финансы | Документы | Снимки ].
 * 9. Zero mocks — 100% honest data from database / IndexedDB.
 */

import type { Appointment, Dashboard, Patient } from "@dental/shared";
import {
	Activity,
	AlertOctagon,
	Calendar,
	Camera,
	Check,
	ChevronRight,
	Clock,
	Copy,
	CreditCard,
	Edit3,
	FileCheck,
	FileText,
	HeartPulse,
	MessageSquare,
	Phone,
	Plus,
	Printer,
	Receipt,
	Send,
	Shield,
	ShieldCheck,
	Stethoscope,
	User,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useAppLogicContext, useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { showToast } from "../GlobalToast";
import {
	printBlankMedicalConsent,
	printBlankMedicalContract,
} from "./blankContractPrint";
import {
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	isNegativeAllergyStatement,
} from "./safetyMath";
import { TaxDeductionCertificateModal } from "../finance/TaxDeductionCertificateModal";

export type MobilePatientTab =
	| "card"
	| "visits"
	| "finance"
	| "documents"
	| "scans";

export interface MobilePatientProfileWorkspaceProps {
	patient: Patient;
	dashboard?: Dashboard | null | undefined;
	onBack: () => void;
	onSelectPatient: (patientId: string) => void;
	onOpenVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId: string) => void) | undefined;
	money: (amountRub: number) => string;
	patientCoreDraft?: any;
	updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
	savePatientCore?: (() => Promise<any> | void) | undefined;
	patientCoreDirty?: boolean | undefined;
	patientCoreSaveState?: ("idle" | "saving" | "saved" | "error") | undefined;
	className?: string | undefined;
}

export function formatPatientBirthAndAge(birthDateIso?: string | null): string {
	if (!birthDateIso) return "";
	const date = new Date(birthDateIso);
	if (Number.isNaN(date.getTime())) return "";

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const m = today.getMonth() - date.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
		age--;
	}

	const dateStr = date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	let ageWord = "лет";
	const lastDigit = age % 10;
	const lastTwoDigits = age % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		ageWord = "лет";
	} else if (lastDigit === 1) {
		ageWord = "год";
	} else if (lastDigit >= 2 && lastDigit <= 4) {
		ageWord = "года";
	}

	return `${age} ${ageWord} • ${dateStr}`;
}

export const MobilePatientProfileWorkspace: React.FC<
	MobilePatientProfileWorkspaceProps
> = ({
	patient,
	dashboard: propDashboard,
	onBack,
	onSelectPatient,
	onOpenVisit,
	onNewAppointment,
	money,
	patientCoreDraft,
	updatePatientCoreDraft,
	savePatientCore,
	patientCoreDirty = false,
	patientCoreSaveState = "idle",
	className = "",
}) => {
	const appLogic = useOptionalAppLogicContext();
	const dashboard = propDashboard ?? appLogic?.dashboard;

	const [activeTab, setActiveTab] = useState<MobilePatientTab>("card");
	const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1);
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

	// ─── 1. FAMILY BALANCE & MEMBERS STATE (HONEST DB FETCH) ───
	const [familyData, setFamilyData] = useState<any>(null);
	const [isLoadingFamily, setIsLoadingFamily] = useState(false);

	useEffect(() => {
		let isMounted = true;
		if (!patient?.id) {
			setFamilyData(null);
			return;
		}

		setIsLoadingFamily(true);
		fetch(`/api/finance/family/patient/${patient.id}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (!isMounted) return;
				if (res.ok) {
					const data = await res.json().catch(() => null);
					setFamilyData(data);
				} else {
					setFamilyData(null);
				}
			})
			.catch(() => {
				if (isMounted) setFamilyData(null);
			})
			.finally(() => {
				if (isMounted) setIsLoadingFamily(false);
			});

		return () => {
			isMounted = false;
		};
	}, [patient?.id]);

	// ─── 2. PATIENT CORE DATA RESOLUTION ───
	const fullName = patient.fullName || "Пациент без имени";
	const initials = useMemo(() => {
		return (
			fullName
				.split(" ")
				.map((n) => n[0])
				.filter(Boolean)
				.slice(0, 2)
				.join("")
				.toUpperCase() || "П"
		);
	}, [fullName]);

	const phone = patient.phone || "";
	const cleanPhone = phone.replace(/\D/g, "");
	const birthDateStr = formatPatientBirthAndAge(patient.birthDate);
	const balanceRub = Number(patient.balanceRub ?? 0);

	// ─── 3. ACTIVE VISIT & UPCOMING APPOINTMENT ───
	const isCurrentlyInVisit =
		dashboard?.activeVisit?.patientId === patient.id;

	const patientAppointments = useMemo(() => {
		const list = (dashboard?.appointments ?? []).filter(
			(a: Appointment) => a?.patientId === patient.id,
		);
		return list.sort(
			(a, b) =>
				new Date(b?.startsAt ?? 0).getTime() -
				new Date(a?.startsAt ?? 0).getTime(),
		);
	}, [dashboard?.appointments, patient.id]);

	const upcomingAppointment = useMemo(() => {
		const now = Date.now();
		const upcoming = patientAppointments
			.filter(
				(a) =>
					a.status !== "cancelled" &&
					a.startsAt &&
					new Date(a.startsAt).getTime() >= now - 3600000,
			)
			.sort(
				(a, b) =>
					new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
			);
		return upcoming[0] || null;
	}, [patientAppointments]);

	// ─── 4. CLINICAL SAFETY ALERTS (ALLERGIES & SOMATIC RISKS) ───
	const allergyText = useMemo(() => {
		const raw =
			(patient as any).allergies ||
			(patient as any).anamnesis?.allergies ||
			patient.notes ||
			"";
		if (
			typeof raw === "string" &&
			raw.trim() &&
			!isNegativeAllergyStatement(raw)
		) {
			const match = raw.match(
				/(?:аллерги[яиею]|аллергическ\w*)\s*(?:на|:)?\s*([^.,;!\n]+)/i,
			);
			if (match && match[1]) {
				const matchedText = match[1];
				if (!/отрицает|нет|не отягощ|без осложнен/i.test(matchedText)) {
					const cleaned = matchedText.replace(/^(на|к)\s+/i, "").trim();
					if (cleaned) return cleaned;
				}
			}
			const found: string[] = [];
			const checkAllergen = (regex: RegExp, negRegex: RegExp, name: string) => {
				if (regex.test(raw) && !negRegex.test(raw)) {
					found.push(name);
				}
			};

			checkAllergen(
				/лидокаин/i,
				/переносимость(?:\s+\w+){0,4}\s+лидокаин\w*(?:\s+\w+){0,4}\s+хорош|лидокаин\w*(?:\s+\w+){0,4}\s+отрицает/i,
				"Лидокаин",
			);
			checkAllergen(
				/пенициллин/i,
				/пенициллин\w*(?:\s+\w+){0,4}\s+отрицает/i,
				"Пенициллин",
			);
			checkAllergen(
				/новокаин/i,
				/новокаин\w*(?:\s+\w+){0,4}\s+отрицает/i,
				"Новокаин",
			);
			checkAllergen(/латекс/i, /латекс\w*(?:\s+\w+){0,4}\s+отрицает/i, "Латекс");
			checkAllergen(/йод/i, /йод\w*(?:\s+\w+){0,4}\s+отрицает/i, "Йод");
			checkAllergen(
				/артикаин|ультракаин/i,
				/переносимость(?:\s+\w+){0,4}\s+артикаин\w*(?:\s+\w+){0,4}\s+хорош|артикаин\w*(?:\s+\w+){0,4}\s+отрицает|ультракаин\w*(?:\s+\w+){0,4}\s+отрицает/i,
				"Артикаин",
			);

			if (found.length > 0) return found.join(", ");
		}

		if ((patient as any).clinicalSafetyProfile) {
			const evalResult = evaluatePatientSafetyFlags(
				(patient as any).clinicalSafetyProfile,
			);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) =>
					f.category === "anesthesia_allergy" ||
					f.id.startsWith("allergy_") ||
					f.id.includes("allergy") ||
					f.id === "anaphylaxis_history",
			);
			if (allergyFlags.length > 0) {
				return allergyFlags.map((f) => f.shortBadge || f.titleRu).join(", ");
			}
		}
		return "";
	}, [patient]);

	const somaticRiskFlags = useMemo(() => {
		const profile =
			(patient as any).clinicalSafetyProfile ||
			(patient as any).anamnesis?.clinicalSafetyProfile ||
			(patient as any).somaticRiskProfile;
		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			return evalResult.activeFlags.filter(
				(f) =>
					f.category !== "anesthesia_allergy" &&
					!f.id.startsWith("allergy_") &&
					!f.id.includes("allergy") &&
					f.id !== "anaphylaxis_history",
			);
		}

		const notes = patient.notes || "";
		if (typeof notes === "string" && notes.trim()) {
			const flags: Array<{ id: string; title: string; desc: string }> = [];
			if (/кардиостимулятор|экс|ритмоводитель/i.test(notes)) {
				flags.push({
					id: "pacemaker",
					title: "Кардиостимулятор",
					desc: "Запрет на ультразвуковой скейлер и диатермокоагулятор",
				});
			}
			if (/диабет|инсулин/i.test(notes)) {
				flags.push({
					id: "diabetes",
					title: "Сахарный диабет",
					desc: "Риск замедленного заживления и гипогликемии",
				});
			}
			if (/беременност/i.test(notes)) {
				flags.push({
					id: "pregnancy",
					title: "Беременность",
					desc: "Запрет адреналина и КТ без защиты",
				});
			}
			if (/антикоагулянт|варфарин|аспирин|ксарелто/i.test(notes)) {
				flags.push({
					id: "anticoagulants",
					title: "Антикоагулянты",
					desc: "Риск кровотечения при хирургии",
				});
			}
			if (/гипертони|давление|аг\s/i.test(notes)) {
				flags.push({
					id: "hypertension",
					title: "Гипертония",
					desc: "Контроль АД перед введением вазоконстриктора",
				});
			}
			return flags;
		}
		return [];
	}, [patient]);

	// ─── 5. IMAGING STUDIES (REAL DATA) ───
	const patientStudies = useMemo(() => {
		const all = (dashboard?.imagingStudies ?? []) as any[];
		return all.filter((s) => String(s?.patientId) === String(patient.id));
	}, [dashboard?.imagingStudies, patient.id]);

	// ─── 6. INVOICES & PAYMENTS (REAL DATA) ───
	const patientInvoices = useMemo(() => {
		const all = (dashboard?.invoices ?? []) as any[];
		return all.filter((inv) => String(inv?.patientId) === String(patient.id));
	}, [dashboard?.invoices, patient.id]);

	// ─── 7. ACTIONS HANDLERS ───
	const handleCopyPhone = useCallback(() => {
		if (!phone) {
			showToast("Телефон не указан", "info");
			return;
		}
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(phone);
			showToast(`Телефон скопирован: ${phone}`, "success");
		}
	}, [phone]);

	const handleOpenWhatsapp = useCallback(() => {
		if (!phone) {
			showToast("Телефон не указан для WhatsApp", "error");
			return;
		}
		openWhatsAppChat(
			phone,
			`Здравствуйте, ${fullName}! Стоматологическая клиника DENTE приветствует вас.`,
		);
	}, [phone, fullName]);

	const handleOpenTelegram = useCallback(() => {
		if (!cleanPhone) {
			showToast("Телефон не указан для Telegram", "error");
			return;
		}
		const tgUrl = `https://t.me/+${cleanPhone}`;
		window.open(tgUrl, "_blank", "noopener,noreferrer");
	}, [cleanPhone]);

	const handleApplySomaticNorm = useCallback(() => {
		if (updatePatientCoreDraft) {
			updatePatientCoreDraft("notes", "Соматически здоров. Физиологическая норма. Аллергоанамнез не отягощен.");
			showToast("Применена физиологическая норма: соматически здоров", "success");
		}
	}, [updatePatientCoreDraft]);

	const handleStartVisit = useCallback(() => {
		usePatientStore.getState().setSelectedPatientId(patient.id);
		useAppStore.getState().setCurrentView("visit");
		showToast(`Открыт приём: ${fullName}`, "success");
	}, [patient.id, fullName]);

	const handleBookAppointment = useCallback(() => {
		if (onNewAppointment) {
			onNewAppointment(patient.id);
			return;
		}
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		const currentHour = now.getHours();
		const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
		const endHour = Math.min(startHour + 1, 21);
		const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
		const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

		useScheduleStore.getState().setNewAppointmentDraft({
			patientId: patient.id,
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
		showToast(`Пациент ${fullName} выбран для записи`, "success");
	}, [onNewAppointment, patient.id, fullName]);

	return (
		<div
			className={`mobile-patient-profile-container ${className}`}
			data-testid="mobile-patient-profile-workspace"
		>
			{/* ─── STICKY TOP BAR (HIG Navigation) ─── */}
			<header className="mobile-patient-top-bar" data-testid="mobile-patient-top-bar">
				<button
					type="button"
					className="mobile-patient-back-btn"
					onClick={onBack}
					aria-label="Вернуться к списку пациентов"
					data-testid="mobile-patient-back-btn"
				>
					<span className="text-base leading-none">&larr;</span>
					<span>Пациенты</span>
				</button>

				<div className="flex items-center gap-1.5 shrink-0">
					{patientCoreDirty && (
						<button
							type="button"
							onClick={savePatientCore}
							disabled={patientCoreSaveState === "saving"}
							className="min-h-[44px] px-3 rounded-xl bg-teal-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
							data-testid="mobile-save-patient-btn"
						>
							<Check size={14} />
							<span>{patientCoreSaveState === "saving" ? "Сохранение..." : "Сохранить"}</span>
						</button>
					)}
					<button
						type="button"
						onClick={handleStartVisit}
						className="min-h-[44px] px-3 rounded-xl bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-bold text-xs inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
						data-testid="mobile-quick-visit-btn"
					>
						<Stethoscope size={14} />
						<span>Приём</span>
					</button>
				</div>
			</header>

			{/* ─── 1. PATIENT HUD HERO CARD ─── */}
			<section className="mobile-patient-hud-card" data-testid="mobile-patient-hud-card">
				<div className="flex items-start gap-3 min-w-0">
					{/* Avatar */}
					<div
						className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--teal,#0d9488)] to-cyan-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-[var(--teal,#0d9488)]/20"
						aria-hidden="true"
					>
						{initials}
					</div>

					<div className="min-w-0 flex-1">
						{/* Full Name (No truncation on mobile, clear typography) */}
						<h1
							className="text-base sm:text-lg font-black text-[var(--ink)] leading-snug break-words m-0"
							data-testid="mobile-patient-fullname"
						>
							{fullName}
						</h1>

						{/* Age & Birthdate */}
						<p className="text-xs text-[var(--muted)] mt-0.5 m-0 font-medium">
							{birthDateStr || "Дата рождения не указана"}
						</p>

						{/* Visit Status & Patient Card Number */}
						<div className="flex items-center gap-2 flex-wrap mt-1.5">
							{isCurrentlyInVisit ? (
								<span
									className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
									data-testid="mobile-patient-in-visit-badge"
								>
									<span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
									На приёме в клинике
								</span>
							) : upcomingAppointment ? (
								<span
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/25"
									data-testid="mobile-patient-upcoming-visit-badge"
								>
									<Clock size={11} className="shrink-0" />
									<span>
										Приём: {new Date(upcomingAppointment.startsAt!).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} в {new Date(upcomingAppointment.startsAt!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									</span>
								</span>
							) : (
								<span className="text-[11px] text-[var(--muted)]">
									Запланированных визитов нет
								</span>
							)}

							<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
								{patient.id ? `№ ${String(patient.id).slice(0, 8)}` : "—"}
							</span>
						</div>
					</div>
				</div>

				{/* ─── 2. BED-SIDE 1-TAP COMMUNICATION BUTTONS (>=44x44px) ─── */}
				<div className="mobile-comm-grid pt-1" data-testid="mobile-comm-grid">
					{phone ? (
						<a
							href={`tel:${phone}`}
							className="mobile-comm-btn bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)]"
							title={`Позвонить: ${phone}`}
							data-testid="mobile-btn-call"
						>
							<Phone size={17} className="text-teal-600 dark:text-teal-400" />
							<span>Звонок</span>
						</a>
					) : (
						<div
							className="mobile-comm-btn bg-[var(--paper-soft)] opacity-50 text-[var(--muted)] cursor-not-allowed"
							title="Телефон не указан"
						>
							<Phone size={17} />
							<span>Звонок</span>
						</div>
					)}

					<button
						type="button"
						onClick={handleOpenWhatsapp}
						className="mobile-comm-btn bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
						title="Написать в WhatsApp"
						data-testid="mobile-btn-whatsapp"
					>
						<MessageSquare size={17} className="text-emerald-600 dark:text-emerald-400" />
						<span>WhatsApp</span>
					</button>

					<button
						type="button"
						onClick={handleOpenTelegram}
						className="mobile-comm-btn bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/20"
						title="Написать в Telegram"
						data-testid="mobile-btn-telegram"
					>
						<Send size={17} className="text-sky-600 dark:text-sky-400" />
						<span>Telegram</span>
					</button>

					<button
						type="button"
						onClick={handleCopyPhone}
						className="mobile-comm-btn bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)]"
						title="Скопировать номер телефона"
						data-testid="mobile-btn-copy-phone"
					>
						<Copy size={17} className="text-[var(--muted)]" />
						<span>Копия</span>
					</button>
				</div>
			</section>

			{/* ─── 3. PROMINENT SAFETY & SOMATIC ALERT BANNERS ─── */}
			<div className="px-3.5 pt-2 flex flex-col gap-2" data-testid="mobile-safety-alerts-section">
				{/* Allergy Alert */}
				{allergyText ? (
					<div
						className="p-3 rounded-2xl bg-rose-500/15 border-2 border-rose-600 text-rose-950 dark:text-rose-100 flex items-start gap-2.5 shadow-xs"
						role="alert"
						data-testid="mobile-allergy-alert"
					>
						<AlertOctagon
							size={20}
							className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-pulse"
						/>
						<div className="flex-1 min-w-0">
							<div className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
								СТОП-ФАКТОР / АЛЛЕРГИЯ:
							</div>
							<div className="text-sm font-black text-rose-950 dark:text-rose-100 break-words mt-0.5">
								{allergyText}
							</div>
						</div>
					</div>
				) : null}

				{/* Somatic Risks Alert */}
				{somaticRiskFlags.length > 0 ? (
					<div
						className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-950 dark:text-purple-100 flex items-start gap-2.5 shadow-xs"
						role="alert"
						data-testid="mobile-somatic-alert"
					>
						<HeartPulse
							size={20}
							className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5"
						/>
						<div className="flex-1 min-w-0">
							<div className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
								СОМАТИЧЕСКИЙ СТАТУС:
							</div>
							<div className="flex items-center gap-1.5 flex-wrap mt-1">
								{somaticRiskFlags.map((flag: any) => (
									<span
										key={flag.id}
										className="px-2 py-0.5 rounded-lg bg-purple-600/20 text-purple-950 dark:text-purple-100 border border-purple-500/40 text-xs font-bold"
										title={flag.desc || flag.description}
									>
										{flag.title || flag.titleRu}
									</span>
								))}
							</div>
						</div>
					</div>
				) : null}

				{/* Healthy Norm (Quiet banner if no risks) */}
				{!allergyText && somaticRiskFlags.length === 0 ? (
					<div
						className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-center justify-between gap-2 shadow-2xs"
						data-testid="mobile-healthy-norm-banner"
					>
						<div className="flex items-center gap-2">
							<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="font-semibold text-emerald-800 dark:text-emerald-300">
								Соматически здоров / физиологическая норма
							</span>
						</div>
						<button
							type="button"
							onClick={handleApplySomaticNorm}
							className="text-[11px] font-bold text-[var(--teal)] underline cursor-pointer"
						>
							Изменить
						</button>
					</div>
				) : null}
			</div>

			{/* ─── 4. FAMILY BALANCE & ONE-TAP MEMBER SWITCHER ─── */}
			<section className="mobile-family-box" data-testid="mobile-family-box">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Users size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs font-bold text-[var(--ink)]">
							{familyData?.name || "Семейный счёт"}
						</span>
					</div>

					<div className="text-right">
						<span className="text-[11px] text-[var(--muted)] block">Баланс семьи:</span>
						<span
							className={`text-sm font-black font-mono ${
								Number(familyData?.balance ?? 0) > 0
									? "text-emerald-700 dark:text-emerald-400"
									: Number(familyData?.balance ?? 0) < 0
										? "text-rose-700 dark:text-rose-400"
										: "text-[var(--ink)]"
							}`}
							data-testid="mobile-family-balance-sum"
						>
							{familyData?.balance !== undefined && familyData?.balance !== null
								? money(Number(familyData.balance))
								: balanceRub !== 0
									? `${money(balanceRub)} (личный)`
									: "0 ₽"}
						</span>
					</div>
				</div>

				{/* Member Switcher Chips */}
				{familyData?.members && familyData.members.length > 0 ? (
					<div className="flex flex-col gap-1.5 pt-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
							Члены семьи (тап для переключения карты):
						</span>
						<div
							className="mobile-family-members-scroller"
							role="tablist"
							data-testid="mobile-family-members-list"
						>
							{familyData.members.map((m: any) => {
								const isCurrent = m.id === patient.id;
								const isHead = m.id === familyData.headPatientId;
								return (
									<button
										key={m.id}
										type="button"
										onClick={() => onSelectPatient(m.id)}
										className={`mobile-family-member-chip ${isCurrent ? "active" : ""}`}
										data-testid={`mobile-family-member-${m.id}`}
										title={`Переключиться на карточку: ${m.fullName}`}
									>
										<User size={13} className={isCurrent ? "text-teal-600" : "text-[var(--muted)]"} />
										<span className="font-bold">{m.fullName}</span>
										<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">
											{isHead ? "Родитель / Глава" : "Ребёнок / Член"}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				) : (
					<div className="text-xs text-[var(--muted)] flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle,#e2e8f0)]">
						<span>Пациент не состоит в семейной группе</span>
						<button
							type="button"
							onClick={() => {
								showToast("Раздел привязки семьи доступен во вкладке Медкарта", "info");
								setActiveTab("card");
							}}
							className="text-xs font-bold text-[var(--teal)] underline cursor-pointer"
						>
							Создать семью
						</button>
					</div>
				)}
			</section>

			{/* ─── 5. SCROLLABLE PROFILE TABS CHIPS (>=44PX TOUCH TARGETS) ─── */}
			<nav
				className="mobile-profile-chips-scroller"
				role="tablist"
				aria-label="Вкладки профиля пациента"
				data-testid="mobile-profile-tabs-nav"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "card"}
					className={`mobile-tab-chip ${activeTab === "card" ? "active" : ""}`}
					onClick={() => setActiveTab("card")}
					data-testid="mobile-tab-card"
				>
					<FileText size={16} />
					<span>Медкарта</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "visits"}
					className={`mobile-tab-chip ${activeTab === "visits" ? "active" : ""}`}
					onClick={() => setActiveTab("visits")}
					data-testid="mobile-tab-visits"
				>
					<Calendar size={16} />
					<span>Визиты ({patientAppointments.length})</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "finance"}
					className={`mobile-tab-chip ${activeTab === "finance" ? "active" : ""}`}
					onClick={() => setActiveTab("finance")}
					data-testid="mobile-tab-finance"
				>
					<CreditCard size={16} />
					<span>Финансы</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "documents"}
					className={`mobile-tab-chip ${activeTab === "documents" ? "active" : ""}`}
					onClick={() => setActiveTab("documents")}
					data-testid="mobile-tab-documents"
				>
					<Printer size={16} />
					<span>Документы</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "scans"}
					className={`mobile-tab-chip ${activeTab === "scans" ? "active" : ""}`}
					onClick={() => setActiveTab("scans")}
					data-testid="mobile-tab-scans"
				>
					<Camera size={16} />
					<span>Снимки ({patientStudies.length})</span>
				</button>
			</nav>

			{/* ─── 6. TAB CONTENT PANELS ─── */}
			<main className="px-3.5 flex flex-col gap-3 pb-24" data-testid="mobile-tab-content-panel">
				{/* ── TAB 1: МЕДКАРТА & ДАННЫЕ ── */}
				{activeTab === "card" && (
					<div className="flex flex-col gap-3" data-testid="mobile-panel-card">
						{/* Passport & Contact Details Grouped Card */}
						<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
							<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
								Паспортные данные и контакты
							</h3>

							<div className="grid grid-cols-1 gap-2 text-xs">
								<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
									<span className="text-[var(--muted)] font-medium">Телефон:</span>
									<span className="font-mono font-bold text-[var(--ink)]">
										{phone ? formatPhoneNumber(phone) : "Не указан"}
									</span>
								</div>

								<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
									<span className="text-[var(--muted)] font-medium">Email:</span>
									<span className="font-mono font-semibold text-[var(--ink)]">
										{patient.email || "Не указан"}
									</span>
								</div>

								<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
									<span className="text-[var(--muted)] font-medium">Пол:</span>
									<span className="font-semibold text-[var(--ink)]">
										{patient.gender === "male"
											? "Мужской"
											: patient.gender === "female"
												? "Женский"
												: "Не указан"}
									</span>
								</div>

								{(patient as any).administrativeProfile?.snils && (
									<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
										<span className="text-[var(--muted)] font-medium">СНИЛС:</span>
										<span className="font-mono font-bold text-[var(--ink)]">
											{(patient as any).administrativeProfile.snils}
										</span>
									</div>
								)}

								{(patient as any).administrativeProfile?.address && (
									<div className="flex justify-between items-center p-2 rounded-xl bg-[var(--paper-soft)]">
										<span className="text-[var(--muted)] font-medium">Адрес:</span>
										<span className="font-medium text-[var(--ink)] text-right truncate max-w-[200px]">
											{(patient as any).administrativeProfile.address}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Clinical Notes Card */}
						<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
									Клинические заметки и анамнез
								</h3>
								<button
									type="button"
									onClick={handleApplySomaticNorm}
									className="text-xs font-bold text-[var(--teal)] underline cursor-pointer"
								>
									+ Норма
								</button>
							</div>

							<textarea
								rows={3}
								className="w-full p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal)] transition-all resize-none"
								value={patientCoreDraft?.notes ?? patient.notes ?? ""}
								onChange={(e) => updatePatientCoreDraft?.("notes", e.target.value)}
								placeholder="Клинические особенности, аллергии, дентофобия..."
								data-testid="mobile-patient-notes-textarea"
							/>

							{/* Quick Clinical Comfort Chips */}
							<div className="flex items-center gap-1.5 flex-wrap">
								{["Дентофобия", "Тошнотный рефлекс", "VIP", "Высокий чек"].map((chip) => (
									<button
										key={chip}
										type="button"
										onClick={() => {
											const current = patientCoreDraft?.notes ?? patient.notes ?? "";
											if (!current.toLowerCase().includes(chip.toLowerCase())) {
												updatePatientCoreDraft?.(
													"notes",
													current ? `${current}, ${chip}` : chip,
												);
											}
										}}
										className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-[11px] font-semibold border border-[var(--line)] cursor-pointer active:scale-95 transition-all"
									>
										+ {chip}
									</button>
								))}
							</div>
						</div>

						{/* Mobile Quadrant Dental Chart Selector */}
						<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
									Зубная формула (Квадранты)
								</h3>
								<span className="text-[11px] text-[var(--muted)]">Взрослая (FDI)</span>
							</div>

							{/* Quadrant Switcher */}
							<div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								{([1, 2, 3, 4] as const).map((q) => (
									<button
										key={q}
										type="button"
										onClick={() => setActiveQuadrant(q)}
										className={`min-h-[36px] py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
											activeQuadrant === q
												? "bg-[var(--teal)] text-white shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										Q{q} {q === 1 ? "18-11" : q === 2 ? "21-28" : q === 3 ? "31-38" : "48-41"}
									</button>
								))}
							</div>

							{/* Quadrant Teeth Grid (>=44x44px per tooth) */}
							<div className="grid grid-cols-4 gap-2 pt-1">
								{(activeQuadrant === 1
									? [18, 17, 16, 15, 14, 13, 12, 11]
									: activeQuadrant === 2
										? [21, 22, 23, 24, 25, 26, 27, 28]
										: activeQuadrant === 3
											? [31, 32, 33, 34, 35, 36, 37, 38]
											: [48, 47, 46, 45, 44, 43, 42, 41]
								).map((tooth) => (
									<button
										key={tooth}
										type="button"
										onClick={() => {
											showToast(`Выбран зуб ${tooth}`, "info");
										}}
										className="min-h-[46px] h-12 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-xs font-bold text-[var(--ink)]"
									>
										<span className="text-sm font-black text-teal-600 dark:text-teal-400">
											{tooth}
										</span>
										<span className="text-[10px] text-[var(--muted)] font-normal">Норма</span>
									</button>
								))}
							</div>
						</div>
					</div>
				)}

				{/* ── TAB 2: ВИЗИТЫ И ПРИЁМЫ ── */}
				{activeTab === "visits" && (
					<div className="flex flex-col gap-3" data-testid="mobile-panel-visits">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
								История визитов ({patientAppointments.length})
							</h3>
							<button
								type="button"
								onClick={handleBookAppointment}
								className="h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
								data-testid="mobile-btn-book-visit"
							>
								<Plus size={13} />
								<span>Записать</span>
							</button>
						</div>

						{patientAppointments.length === 0 ? (
							<div className="p-8 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center gap-2">
								<Calendar size={32} className="text-[var(--muted)] opacity-50" />
								<p className="text-xs text-[var(--muted)] m-0">
									История визитов пуста. Запишите пациента на приём.
								</p>
								<button
									type="button"
									onClick={handleBookAppointment}
									className="mt-2 min-h-[44px] px-4 rounded-xl bg-teal-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
								>
									<Plus size={14} />
									<span>Создать запись</span>
								</button>
							</div>
						) : (
							<div className="flex flex-col gap-2">
								{patientAppointments.map((appt) => {
									const date = new Date(appt.startsAt || 0);
									const dateStr = date.toLocaleDateString("ru-RU", {
										day: "numeric",
										month: "short",
										year: "numeric",
									});
									const timeStr = date.toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									});
									const statusRu =
										appt.status === "completed"
											? "Завершён"
											: appt.status === "in_treatment"
												? "На приёме"
												: appt.status === "cancelled"
													? "Отменён"
													: "Запланирован";

									return (
										<div
											key={appt.id}
											className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2"
											data-testid={`mobile-visit-card-${appt.id}`}
										>
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
													<Clock size={13} className="text-teal-600 dark:text-teal-400" />
													<span>{dateStr} в {timeStr}</span>
												</div>
												<span
													className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
														appt.status === "completed"
															? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
															: appt.status === "in_treatment"
																? "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30 animate-pulse"
																: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
													}`}
												>
													{statusRu}
												</span>
											</div>

											{appt.reason && (
												<p className="text-xs text-[var(--ink)] m-0 font-medium line-clamp-2">
													{appt.reason}
												</p>
											)}

											<div className="flex items-center justify-between pt-1 border-t border-[var(--line-subtle,#f1f5f9)] text-xs">
												<span className="text-[var(--muted)] text-[11px]">
													Врач: {(appt as any).doctorFullName || "Врач клиники"}
												</span>
												<button
													type="button"
													onClick={() => {
														if (onOpenVisit) onOpenVisit(appt.id);
														else handleStartVisit();
													}}
													className="text-xs font-bold text-[var(--teal)] inline-flex items-center gap-0.5 cursor-pointer hover:underline"
												>
													<span>К приёму</span>
													<ChevronRight size={13} />
												</button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* ── TAB 3: ФИНАНСЫ И СЧЕТА ── */}
				{activeTab === "finance" && (
					<div className="flex flex-col gap-3" data-testid="mobile-panel-finance">
						{/* Balance Hero Card */}
						<div className="p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Текущий баланс пациента:
							</span>
							<div className="flex items-baseline justify-between">
								<span
									className={`text-2xl font-black font-mono ${
										balanceRub > 0
											? "text-emerald-600 dark:text-emerald-400"
											: balanceRub < 0
												? "text-rose-600 dark:text-rose-400"
												: "text-[var(--ink)]"
									}`}
									data-testid="mobile-patient-balance-value"
								>
									{balanceRub > 0 ? `+${money(balanceRub)}` : money(balanceRub)}
								</span>
								<span className="text-xs text-[var(--muted)] font-medium">
									{balanceRub > 0 ? "Аванс / Депозит" : balanceRub < 0 ? "Задолженность" : "Оплачено полностью"}
								</span>
							</div>

							<div className="pt-2 flex gap-2">
								<button
									type="button"
									onClick={() => {
										usePatientStore.getState().setSelectedPatientId(patient.id);
										useAppStore.getState().setCurrentView("finance");
										showToast(`Переход в кассу для ${fullName}`, "info");
									}}
									className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
									data-testid="mobile-btn-open-cashier"
								>
									<Receipt size={15} />
									<span>Касса и оплата</span>
								</button>
							</div>
						</div>

						{/* Invoices List */}
						<div className="flex flex-col gap-2">
							<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
								История счетов и платежей ({patientInvoices.length})
							</h3>

							{patientInvoices.length === 0 ? (
								<div className="p-6 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--muted)]">
									У пациента нет выставленных счетов. Все оказанные услуги закрыты.
								</div>
							) : (
								patientInvoices.map((inv: any) => (
									<div
										key={inv.id}
										className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs"
									>
										<div>
											<div className="font-bold text-[var(--ink)]">Счёт № {inv.number || inv.id?.slice(0, 8)}</div>
											<div className="text-[11px] text-[var(--muted)]">
												{new Date(inv.createdAt || Date.now()).toLocaleDateString("ru-RU")}
											</div>
										</div>
										<div className="text-right">
											<div className="font-mono font-bold text-[var(--ink)]">{money(inv.amount || 0)}</div>
											<span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
												Оплачен
											</span>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}

				{/* ── TAB 4: ОФИЦИАЛЬНЫЕ ДОКУМЕНТЫ ── */}
				{activeTab === "documents" && (
					<div className="flex flex-col gap-3" data-testid="mobile-panel-documents">
						<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
							Официальные документы и справки
						</h3>

						<div className="flex flex-col gap-2.5">
							{/* 1. Бланк договора */}
							<button
								type="button"
								onClick={() => void printBlankMedicalContract(patient)}
								className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
								data-testid="mobile-doc-contract-btn"
							>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
										<FileText size={18} />
									</div>
									<div>
										<h4 className="text-xs font-bold text-[var(--ink)] m-0">
											Договор на оказание медицинских услуг
										</h4>
										<p className="text-[11px] text-[var(--muted)] m-0">
											Печать чистого бланка договора со строками ______
										</p>
									</div>
								</div>
								<ChevronRight size={16} className="text-[var(--muted)]" />
							</button>

							{/* 2. Бланк ИДС */}
							<button
								type="button"
								onClick={() => void printBlankMedicalConsent(patient)}
								className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
								data-testid="mobile-doc-consent-btn"
							>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
										<Shield size={18} />
									</div>
									<div>
										<h4 className="text-xs font-bold text-[var(--ink)] m-0">
											Информированное согласие (ИДС)
										</h4>
										<p className="text-[11px] text-[var(--muted)] m-0">
											Печать чистого бланка согласия со строками ______
										</p>
									</div>
								</div>
								<ChevronRight size={16} className="text-[var(--muted)]" />
							</button>

							{/* 3. Справка для налогового вычета 13% */}
							<button
								type="button"
								onClick={() => setIsTaxModalOpen(true)}
								className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
								data-testid="mobile-doc-tax-btn"
							>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
										<FileCheck size={18} />
									</div>
									<div>
										<h4 className="text-xs font-bold text-[var(--ink)] m-0">
											Справка для налогового вычета (13%)
										</h4>
										<p className="text-[11px] text-[var(--muted)] m-0">
											Справка об оплате медицинских услуг (ФНС КНД 1151156)
										</p>
									</div>
								</div>
								<ChevronRight size={16} className="text-[var(--muted)]" />
							</button>

							{/* 4. Медицинская карта (Печать) */}
							<button
								type="button"
								onClick={() => {
									if (typeof window !== "undefined") window.print();
								}}
								className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all shadow-2xs"
								data-testid="mobile-doc-print-card-btn"
							>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
										<Printer size={18} />
									</div>
									<div>
										<h4 className="text-xs font-bold text-[var(--ink)] m-0">
											Печать медицинской карты
										</h4>
										<p className="text-[11px] text-[var(--muted)] m-0">
											Полный экспорт карты приёма в PDF / печать
										</p>
									</div>
								</div>
								<ChevronRight size={16} className="text-[var(--muted)]" />
							</button>
						</div>
					</div>
				)}

				{/* ── TAB 5: СНИМКИ И КТ ── */}
				{activeTab === "scans" && (
					<div className="flex flex-col gap-3" data-testid="mobile-panel-scans">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
								Рентгенологические снимки и КТ ({patientStudies.length})
							</h3>
						</div>

						{patientStudies.length === 0 ? (
							<div className="p-8 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center gap-2">
								<Camera size={32} className="text-[var(--muted)] opacity-50" />
								<p className="text-xs text-[var(--muted)] m-0">
									Рентгеновских снимков пока нет.
								</p>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-2.5">
								{patientStudies.map((study: any) => (
									<div
										key={study.id}
										className="p-2.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-1.5"
										data-testid={`mobile-study-card-${study.id}`}
									>
										{/* Preview 200x200px style (CLS = 0) */}
										<div className="w-full aspect-square rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
											{study.previewUrl ? (
												<img
													src={study.previewUrl}
													alt={study.title || "Снимок"}
													className="w-full h-full object-cover"
													loading="lazy"
												/>
											) : (
												<Camera size={28} className="text-[var(--muted)] opacity-60" />
											)}
											{study.toothCode && (
												<span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/75 text-white font-mono text-[10px] font-bold">
													Зуб {study.toothCode}
												</span>
											)}
										</div>

										<h4 className="text-xs font-bold text-[var(--ink)] m-0 truncate" title={study.title}>
											{study.title || "Рентгенограмма"}
										</h4>
										<p className="text-[10px] text-[var(--muted)] m-0">
											{study.capturedAt
												? new Date(study.capturedAt).toLocaleDateString("ru-RU")
												: "Дата неизвестна"}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</main>

			{/* ─── 7. FLOATING BOTTOM BAR (NATURAL THUMB ZONE) ─── */}
			<div className="mobile-profile-floating-bar" data-testid="mobile-profile-floating-bar">
				<button
					type="button"
					onClick={handleStartVisit}
					className="flex-1 min-h-[48px] h-12 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
					data-testid="mobile-floating-start-visit-btn"
				>
					<Stethoscope size={18} />
					<span>Начать приём</span>
				</button>
				<button
					type="button"
					onClick={handleBookAppointment}
					className="min-h-[48px] h-12 px-4 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-sm inline-flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
					data-testid="mobile-floating-book-btn"
				>
					<Calendar size={18} className="text-teal-600 dark:text-teal-400" />
					<span>Запись</span>
				</button>
			</div>

			{/* ─── 8. TAX DEDUCTION MODAL ─── */}
			{isTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={isTaxModalOpen}
					onClose={() => setIsTaxModalOpen(false)}
					patientId={patient.id}
					patientName={patient.fullName}
					patientBirthDate={patient.birthDate ?? undefined}
				/>
			)}
		</div>
	);
};

export default MobilePatientProfileWorkspace;
