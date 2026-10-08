import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/components.css";
import "./components/telephony/telephonyFloatingWidget.css";

import { AppLogicProvider } from "./contexts/AppLogicContext";
import { IncomingCallPopup } from "./components/telephony/IncomingCallPopup";
import { IncomingCallPatientDrawer } from "./components/telephony/IncomingCallPatientDrawer";
import { TelephonyFloatingWidget } from "./components/telephony/TelephonyFloatingWidget";
import { IncomingCallQuickBooking, computeQuickBookingSlots } from "./components/telephony/IncomingCallQuickBooking";
import { useTelephonyStore } from "./store/telephonyStore";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { Phone, PhoneCall, Moon, Sun, Layers, Calendar, UserCheck, ShieldAlert } from "lucide-react";

const MOCK_PATIENT = {
	id: "pat-konst-2026",
	fullName: "Константинопольский Александр Владимирович",
	phone: "+7 (925) 876-54-32",
	birthDate: "1988-06-14",
	balanceRub: -3400,
	notes: "Аллергия на пенициллин и анестетики артикаинового ряда. Острая боль (пульпит 4.6).",
};

const MOCK_DASHBOARD: any = {
	todayIso: "2026-10-08",
	clinicSettings: {
		name: "Стоматологическая клиника «ДЕНТЕ ЭТАЛОН»",
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
				specialties: ["Терапевт", "Ортопед"],
				active: true,
				color: "#0d9488",
			},
			{
				id: "doc-2",
				fullName: "Д-р Смирнова Екатерина Павловна",
				role: "doctor",
				specialties: ["Хирург", "Имплантолог"],
				active: true,
				color: "#0284c7",
			},
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
			{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
		],
	},
	patients: [
		MOCK_PATIENT,
		{
			id: "pat-smirnova",
			fullName: "Смирнова Анна Сергеевна",
			phone: "+7 (916) 234-56-78",
			balanceRub: 12500,
			birthDate: "1994-11-03",
			notes: "Острая боль 3.6",
		},
	],
	appointments: [
		{
			id: "app-prev-01",
			patientId: "pat-konst-2026",
			doctorUserId: "doc-1",
			doctorName: "Д-р Воронов А. В.",
			startsAt: "2026-09-24T10:00:00Z",
			endsAt: "2026-09-24T11:00:00Z",
			status: "completed",
			reason: "Эндодонтическое лечение 4.6",
		},
		{
			id: "app-next-01",
			patientId: "pat-konst-2026",
			doctorUserId: "doc-1",
			doctorName: "Д-р Воронов А. В.",
			startsAt: "2026-10-12T14:30:00Z",
			endsAt: "2026-10-12T15:30:00Z",
			status: "confirmed",
			reason: "Установка коронки из диоксида циркония 4.6",
		},
	],
	patientInsights: [
		{
			patientId: "pat-konst-2026",
			riskLevel: "high",
			clinicalFlags: ["Аллергия на артикаин", "Задолженность 3 400 ₽", "Незавершённый план ортопедии"],
		},
	],
};

export function TelephonyInquisitionPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "dark";
	const initialView = params.get("view") || "popup"; // "popup" | "drawer" | "softphone"
	
	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [activeView, setActiveView] = useState<string>(initialView);
	const [isDrawerOpen, setIsDrawerOpen] = useState(initialView === "drawer");

	useEffect(() => {
		const resolved = resolveTheme(theme, theme === "dark");
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	useEffect(() => {
		// Initialize realistic active call in telephony store
		const telStore = useTelephonyStore.getState();
		telStore.setAgentState("online");
		telStore.triggerIncomingCall({
			callId: "call-live-inquisition-01",
			phone: "+7 (925) 876-54-32",
			patientId: "pat-konst-2026",
			patientName: "Константинопольский Александр Владимирович",
			status: "answered",
			durationSeconds: 38,
			recordingUrl: "https://records.dente.local/sample-call-konst.mp3",
			provider: "mango",
			utmSource: "yandex_direct",
			utmCampaign: "orthopedics_crowns_msk",
			advertisingChannel: "Яндекс.Директ (Коронки)",
			transcript: [
				{
					speaker: "operator",
					text: "Стоматология ДЕНТЕ, администратор Ольга. Чем могу помочь?",
					startTimeSeconds: 0,
					endTimeSeconds: 4,
					confidence: 0.98,
					sentiment: "neutral",
				},
				{
					speaker: "patient",
					text: "Здравствуйте! Подскажите, когда я записан к доктору Воронову на коронку?",
					startTimeSeconds: 5,
					endTimeSeconds: 11,
					confidence: 0.95,
					sentiment: "neutral",
				},
				{
					speaker: "operator",
					text: "Александр Владимирович, добрый день! Ближайший визит 12 октября в 14:30. Хотите перенести или подтвердить?",
					startTimeSeconds: 12,
					endTimeSeconds: 19,
					confidence: 0.97,
					sentiment: "positive",
				},
			],
		});

		if (initialView === "drawer") {
			telStore.openCallDrawer();
			setIsDrawerOpen(true);
		} else {
			telStore.closeCallDrawer();
			setIsDrawerOpen(false);
		}
	}, [initialView]);

	const { slots: quickSlots } = computeQuickBookingSlots(MOCK_DASHBOARD, MOCK_PATIENT.id);

	return (
		<AppLogicProvider value={{ dashboard: MOCK_DASHBOARD, currentView: "schedule" } as any}>
			<div className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] font-sans flex flex-col">
				{/* Top Control Bar for Inquisitor Audit */}
				<header className="sticky top-0 z-50 bg-[var(--paper-strong)] border-b border-[var(--line)] px-6 py-3 flex items-center justify-between shadow-xs">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-white flex items-center justify-center font-bold">
							<Phone size={18} />
						</div>
						<div>
							<h1 className="text-sm font-bold text-[var(--ink)] leading-tight">
								Телефония и Быстрый приём вызова (DENTE Red Team Audit)
							</h1>
							<p className="text-[11px] text-[var(--muted)]">
								Мандат 8e (Автономия врача) • Quiet UI • WCAG AAA • Анти-Матрёшка (глубина 1)
							</p>
						</div>
					</div>

					{/* View Switcher & Theme Selector */}
					<div className="flex items-center gap-2">
						<div className="dente-segmented-bar" role="group" aria-label="Режим инспекции">
							<button
								type="button"
								onClick={() => {
									setActiveView("popup");
									setIsDrawerOpen(false);
									useTelephonyStore.getState().closeCallDrawer();
								}}
								className={`dente-segmented-item min-h-[32px] px-3 text-xs font-semibold ${
									activeView === "popup" && !isDrawerOpen ? "is-active active" : ""
								}`}
								data-testid="inq-btn-view-popup"
							>
								Карточка звонка (Popup)
							</button>

							<button
								type="button"
								onClick={() => {
									setActiveView("drawer");
									setIsDrawerOpen(true);
									useTelephonyStore.getState().openCallDrawer();
								}}
								className={`dente-segmented-item min-h-[32px] px-3 text-xs font-semibold ${
									activeView === "drawer" || isDrawerOpen ? "is-active active" : ""
								}`}
								data-testid="inq-btn-view-drawer"
							>
								Шторка пациента (Drawer)
							</button>

							<button
								type="button"
								onClick={() => {
									setActiveView("softphone");
									setIsDrawerOpen(false);
									useTelephonyStore.getState().closeCallDrawer();
								}}
								className={`dente-segmented-item min-h-[32px] px-3 text-xs font-semibold ${
									activeView === "softphone" ? "is-active active" : ""
								}`}
								data-testid="inq-btn-view-softphone"
							>
								Софтфон (Island)
							</button>
						</div>

						{/* Theme Toggle */}
						<div className="flex items-center gap-1 bg-[var(--paper-subtle)] p-1 rounded-xl border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setTheme("light")}
								className={`min-h-[32px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all ${
									theme === "light"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="btn-toggle-theme-light"
							>
								<Sun size={14} className="text-amber-500" />
								<span>Светлая</span>
							</button>

							<button
								type="button"
								onClick={() => setTheme("dark")}
								className={`min-h-[32px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all ${
									theme === "dark"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="btn-toggle-theme-dark"
							>
								<Moon size={14} className="text-teal-400" />
								<span>Тёмная</span>
							</button>
						</div>
					</div>
				</header>

				{/* Realistic Clinical Workspace Background (Schedule & Patient Grid) */}
				<main className="flex-1 p-6 relative overflow-hidden">
					<div className="max-w-7xl mx-auto space-y-4">
						{/* Clinical Banner */}
						<div className="p-4 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xs flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Calendar className="text-[var(--teal)]" size={24} />
								<div>
									<h2 className="text-sm font-bold text-[var(--ink)]">
										Расписание приёмов клиники (8 октября 2026)
									</h2>
									<p className="text-xs text-[var(--muted)]">
										Кабинет 1 (Терапия / Д-р Воронов) • Кабинет 2 (Хирургия / Д-р Смирнова)
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
									SIP АТС онлайн: MANGO (Линия 1)
								</span>
							</div>
						</div>

						{/* Mock Schedule Grid to demonstrate zero-occlusion and Quiet UI */}
						<div className="grid grid-cols-2 gap-4">
							<div className="p-4 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] space-y-3">
								<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
									<span className="font-bold text-xs uppercase text-[var(--teal)]">Кабинет 1 — Д-р Воронов А. В.</span>
									<span className="text-xs text-[var(--muted)]">4 приёма запланировано</span>
								</div>
								<div className="space-y-2 text-xs">
									<div className="p-3 rounded-xl bg-[var(--paper-subtle)] border border-[var(--line)] flex justify-between items-center">
										<div>
											<div className="font-bold text-[var(--ink)]">09:00 - 10:00 • Смирнова А. С.</div>
											<div className="text-[var(--muted)]">Лечение кариеса 2.4, анестезия Ubistesin</div>
										</div>
										<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-[var(--teal)]">Завершён</span>
									</div>
									<div className="p-3 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex justify-between items-center">
										<div>
											<div className="font-bold text-[var(--teal-dark,var(--teal))]">14:30 - 15:30 • Свободный слот</div>
											<div className="text-[var(--muted)]">Доступен для быстрой записи из звонка в 1 клик</div>
										</div>
										<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--teal)] text-white">Свободно</span>
									</div>
								</div>
							</div>

							<div className="p-4 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] space-y-3">
								<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
									<span className="font-bold text-xs uppercase text-[var(--teal)]">Кабинет 2 — Д-р Смирнова Е. П.</span>
									<span className="text-xs text-[var(--muted)]">3 приёма запланировано</span>
								</div>
								<div className="space-y-2 text-xs">
									<div className="p-3 rounded-xl bg-[var(--paper-subtle)] border border-[var(--line)] flex justify-between items-center">
										<div>
											<div className="font-bold text-[var(--ink)]">11:00 - 12:00 • Васильев П. И.</div>
											<div className="text-[var(--muted)]">Удаление ретенированного зуба мудрости 3.8</div>
										</div>
										<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">Ожидает</span>
									</div>
									<div className="p-3 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex justify-between items-center">
										<div>
											<div className="font-bold text-[var(--teal-dark,var(--teal))]">16:00 - 17:00 • Свободный слот</div>
											<div className="text-[var(--muted)]">Консультация хирурга-имплантолога</div>
										</div>
										<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--teal)] text-white">Свободно</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* TELEPHONY UNDER TEST */}
					{/* 1. Incoming Call Popup (Dynamic Island Capsule / Expanded Card) */}
					{activeView !== "softphone" && <IncomingCallPopup />}

					{/* 2. Telephony Floating Softphone (when softphone view is selected) */}
					{activeView === "softphone" && (
						<TelephonyFloatingWidget
							defaultExpanded={true}
							showDialerDefault={false}
						/>
					)}

					{/* 3. Patient Side Drawer (Direct instantiation to guarantee 100% testable snapshot) */}
					<IncomingCallPatientDrawer
						isOpen={activeView === "drawer" || isDrawerOpen}
						onClose={() => {
							setIsDrawerOpen(false);
							setActiveView("popup");
							useTelephonyStore.getState().closeCallDrawer();
						}}
						currentCall={{
							callId: "call-live-inquisition-01",
							phone: "+7 (925) 876-54-32",
							patientId: "pat-konst-2026",
							patientName: "Константинопольский Александр Владимирович",
							status: "answered",
							durationSeconds: 38,
							recordingUrl: "https://records.dente.local/sample-call-konst.mp3",
							provider: "mango",
							utmSource: "yandex_direct",
							advertisingChannel: "Яндекс.Директ (Коронки)",
							transcript: [
								{
									speaker: "operator",
									text: "Стоматология ДЕНТЕ, администратор Ольга. Чем могу помочь?",
									startTimeSeconds: 0,
									endTimeSeconds: 4,
									confidence: 0.98,
									sentiment: "neutral",
								},
								{
									speaker: "patient",
									text: "Здравствуйте! Подскажите, когда я записан к доктору Воронову на коронку?",
									startTimeSeconds: 5,
									endTimeSeconds: 11,
									confidence: 0.97,
									sentiment: "neutral",
								},
								{
									speaker: "operator",
									text: "Александр Владимирович, добрый день! Ближайший визит 12 октября в 14:30. Хотите перенести или подтвердить?",
									startTimeSeconds: 12,
									endTimeSeconds: 19,
									confidence: 0.99,
									sentiment: "positive",
								},
							],
						}}
						callerName="Константинопольский Александр Владимирович"
						formattedPhone="+7 (925) 876-54-32"
						initials="КА"
						avatarColors={{ bg: "#0d9488", text: "#ffffff" }}
						isKnownPatient={true}
						patientCategory="Постоянный"
						resolvedPatient={MOCK_PATIENT}
						financialSummary={{
							balanceRub: -3400,
							formattedBalance: "-3 400 ₽",
							hasDebt: true,
							debtRub: 3400,
							formattedDebt: "3 400 ₽",
							hasInsurance: true,
							insuranceName: "СОГАЗ-МЕД",
							policyNumber: "СОГАЗ-МЕД-883492",
						}}
						somaticAlerts={[
							{
								id: "som-1",
								label: "Аллергия на пенициллин и артикаин",
								category: "allergy",
								severity: "high",
								icon: "alert",
							},
							{
								id: "som-2",
								label: "Острая пульсирующая боль 4.6",
								category: "pain",
								severity: "high",
								icon: "alert",
							},
						]}
						upcomingAppointment={{
							appointmentId: "app-next-01",
							startsAt: "2026-10-12T14:30:00Z",
							endsAt: "2026-10-12T15:30:00Z",
							formattedDate: "12 октября 2026",
							formattedTime: "14:30",
							doctorName: "Д-р Воронов А. В.",
							chairName: "Кабинет 1",
							reason: "Установка коронки из диоксида циркония 4.6",
							status: "confirmed",
							isToday: false,
							isTomorrow: false,
						}}
						lastVisitSummary={{
							lastVisitDate: "2026-09-24",
							formattedLastVisit: "24 сентября 2026 в 10:00",
							doctorName: "Д-р Воронов А. В.",
							doctorSpecialty: "Терапевт",
							appointmentReason: "К04.5 Хронический апикальный периодонтит",
							isNewPatient: false,
						}}
						callAttribution={{
							channelKey: "yandex_direct",
							channelLabel: "Яндекс.Директ (Коронки)",
							virtualNumberDisplay: "+7 (495) 100-20-30",
							providerLabel: "Mango Telecom",
							utmSummary: "utm_source=yandex_direct",
							notesPayload: "Лид с контекстной рекламы",
						}}
						isCapturingLead={false}
						onCaptureLead={() => {}}
						onSendWhatsApp={() => {}}
						onCopySms={() => {}}
						smsCopied={false}
						showQuickBooking={true}
						onToggleQuickBooking={() => {}}
						onQuickBook={() => {}}
						quickSlots={quickSlots}
						onOpenFullPatientView={() => {}}
						isCallAnswered={true}
						showTransferPanel={false}
						onToggleTransferPanel={() => {}}
						transferType="blind"
						onSelectTransferType={() => {}}
						onStartTransfer={() => {}}
						showOutcomePanel={false}
						onToggleOutcomePanel={() => {}}
						onRecordOutcome={() => {}}
						newPatientNameInput=""
						onChangeNewPatientNameInput={() => {}}
						isCreatingPatient={false}
						onQuickCreatePatient={() => {}}
					/>
				</main>
			</div>
		</AppLogicProvider>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TelephonyInquisitionPreviewApp />);
}
