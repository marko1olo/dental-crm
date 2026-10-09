/**
 * DENTE CRM — Mobile Patient Header Card & HUD
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, 390x844 Screen Ergonomics)
 *
 * Layer 4: Patient Avatar, Full Russian Name, Age, Safety Banners,
 * 1-Tap Communications (>=44x44px), and Family Balance Switcher.
 */

import type { Appointment, Dashboard, Patient } from "@dental/shared";
import {
	AlertOctagon,
	Check,
	Clock,
	Copy,
	HeartPulse,
	MessageSquare,
	Phone,
	Send,
	ShieldCheck,
	Stethoscope,
	User,
	Users,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import {
	evaluatePatientSafetyFlags,
	isNegativeAllergyStatement,
} from "../safetyMath";
import { formatPatientBirthAndAge } from "./types";

export interface MobilePatientHeaderCardProps {
	patient: Patient;
	dashboard?: Dashboard | null | undefined;
	onBack: () => void;
	onSelectPatient: (patientId: string) => void;
	money: (amountRub: number) => string;
	patientCoreDraft?: any;
	updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
	savePatientCore?: (() => Promise<any> | void) | undefined;
	patientCoreDirty?: boolean | undefined;
	patientCoreSaveState?: ("idle" | "saving" | "saved" | "error") | undefined;
	onStartVisit: () => void;
	onOpenCardTab?: () => void;
}

export const MobilePatientHeaderCard: React.FC<MobilePatientHeaderCardProps> = ({
	patient,
	dashboard: propDashboard,
	onBack,
	onSelectPatient,
	money,
	patientCoreDraft,
	updatePatientCoreDraft,
	savePatientCore,
	patientCoreDirty = false,
	patientCoreSaveState = "idle",
	onStartVisit,
	onOpenCardTab,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const dashboard = propDashboard ?? appLogic?.dashboard;

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

	// ─── 5. ACTIONS HANDLERS ───
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

	return (
		<>
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
						onClick={onStartVisit}
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
								onOpenCardTab?.();
							}}
							className="text-xs font-bold text-[var(--teal)] underline cursor-pointer"
						>
							Создать семью
						</button>
					</div>
				)}
			</section>
		</>
	);
};
