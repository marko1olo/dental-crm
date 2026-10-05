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
import "./components/billing/paymentModalStudio.css";
import "./components/payments/checkout/fastCheckout.css";
import "./components/visit/mobile-chairside-visit.css";
import "./components/schedule/scheduleMobileAgenda.css";
import "./components/mobile/mobileHigPrimitives.css";

import { AppointmentModal } from "./components/schedule/AppointmentModal";
import { EmkToolbar } from "./components/visit/emk/EmkToolbar";
import { MobileChairsideVisitWorkspace } from "./components/visit/MobileChairsideVisitWorkspace";
import { FastCheckoutModal } from "./components/finance/FastCheckoutModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import type { Appointment, Dashboard } from "@dental/shared";
import { Check, ShieldCheck, Calendar, Clock, User, FileCheck, DollarSign, Smartphone } from "lucide-react";

const todayIso = new Date().toISOString().slice(0, 10);

const mockDashboard: Dashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso,
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
			timezone: "Europe/Moscow",
			phone: "+7 (495) 123-45-67",
			address: "Москва, Столярный переулок, 14",
			inn: "7701234567",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "doc-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
				specialties: ["therapist", "orthopedist"],
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "doc-2",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Смирнова Елена Павловна",
				role: "doctor",
				specialties: ["surgeon", "implantologist"],
				active: true,
				color: "#2563eb",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		chairs: [
			{
				id: "chair-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кресло 1 (Терапия/Ортопедия)",
				roomNumber: "101",
				color: "#0d9488",
				sortOrder: 1,
				active: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "chair-2",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кресло 2 (Хирургия/Имплантация)",
				roomNumber: "102",
				color: "#2563eb",
				sortOrder: 2,
				active: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		branches: [],
		roles: [],
	},
	patients: [
		{
			id: "pat-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Алексеева Виктория Игоревна",
			phone: "+7 (916) 555-01-99",
			birthDate: "1992-04-12",
			status: "active",
			balanceRub: 0,
			allergies: ["Лидокаин", "Новокаин"],
			notes: "Аллергия на лидокаин. Острая реакция на амидные анестетики.",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			id: "pat-2",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Кузнецов Дмитрий Сергеевич",
			phone: "+7 (926) 777-88-99",
			birthDate: "1988-11-20",
			status: "active",
			balanceRub: -12500,
			notes: "Лечение пульпита 16 зуба, второй этап.",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	appointments: [
		{
			id: "appt-express-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: `${todayIso}T10:00:00.000Z`,
			endsAt: `${todayIso}T10:30:00.000Z`,
			status: "planned",
			reason: "CITO! Острая боль в области зуба 46",
			comment: "[CITO: экстренное обращение с острой болью]",
			source: "phone",
			isCito: true,
			history: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	bills: [],
	patientInsights: [],
	daySummary: {
		occupancyPercent: 75,
		expectedRevenueRub: 42000,
		arrivedCount: 1,
		inTreatmentCount: 1,
		completedCount: 0,
		cancelledCount: 0,
	},
} as any;

const appointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтверждён",
	arrived: "Пациент в клинике",
	in_treatment: "В кресле у врача",
	completed: "Приём завершён",
	cancelled: "Отменён",
	no_show: "Не явился",
};

export function DoctorAutonomyPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const viewParam = (params.get("view") || "schedule_modal") as
		| "schedule_modal"
		| "emk_toolbar"
		| "mobile_chairside"
		| "fast_checkout";

	const [activeView, setActiveView] = useState(viewParam);
	const [theme, setTheme] = useState<ThemeMode>(rawTheme);
	const [normApplied, setNormApplied] = useState(false);
	const [activeEmkTab, setActiveEmkTab] = useState("all");

	useEffect(() => {
		const updateTheme = () => {
			const currentTheme = (document.documentElement.getAttribute("data-theme") || rawTheme) as ThemeMode;
			setTheme(currentTheme);
			const resolved = resolveTheme(currentTheme, false);
			applyThemeToRoot(document.documentElement, resolved);
			const isDark = currentTheme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", currentTheme);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
			{/* Top Navigation Strip */}
			<div className="h-12 border-b border-[var(--line)] bg-[var(--paper-strong)] px-4 flex items-center justify-between gap-3 text-xs shrink-0 select-none">
				<div className="flex items-center gap-2">
					<ShieldCheck size={18} className="text-teal-600 dark:text-teal-400" />
					<strong className="font-bold text-[var(--ink)]">
						DENTE — Мандат 8e (Автономия врача и персонала)
					</strong>
				</div>

				<div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
					<button
						type="button"
						onClick={() => setActiveView("schedule_modal")}
						className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
							activeView === "schedule_modal"
								? "bg-[var(--teal)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-schedule-modal"
					>
						1. Экспресс-запись
					</button>
					<button
						type="button"
						onClick={() => setActiveView("emk_toolbar")}
						className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
							activeView === "emk_toolbar"
								? "bg-[var(--teal)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-emk-toolbar"
					>
						2. Норма ЭМК 1-клик
					</button>
					<button
						type="button"
						onClick={() => setActiveView("mobile_chairside")}
						className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
							activeView === "mobile_chairside"
								? "bg-[var(--teal)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-mobile-chairside"
					>
						3. Мобильный приём
					</button>
					<button
						type="button"
						onClick={() => setActiveView("fast_checkout")}
						className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
							activeView === "fast_checkout"
								? "bg-[var(--teal)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-fast-checkout"
					>
						4. Касса 54-ФЗ без ИНН
					</button>
				</div>

				<button
					type="button"
					onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
					className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer font-bold"
					data-testid="theme-toggle-btn"
				>
					{theme === "light" ? "🌙 Dark" : "☀️ Light"}
				</button>
			</div>

			{/* Main Workspace Area */}
			<div className="flex-1 p-4 flex items-center justify-center overflow-auto">
				{/* 1. SCHEDULE APPOINTMENT MODAL (EXPRESS CITO & ANONYMOUS) */}
				{activeView === "schedule_modal" && (
					<div className="w-full max-w-4xl bg-[var(--paper)] rounded-2xl shadow-xl border border-[var(--line)] p-4">
						<AppointmentModal
							isOpen={true}
							appointment={mockDashboard.appointments[0] || null}
							dashboard={mockDashboard}
							onClose={() => {}}
							onSave={async () => true}
							patientName={(_pats, id) => {
								const pat = mockDashboard.patients.find((p) => p.id === id);
								return pat ? pat.fullName : "Пациент";
							}}
							formatTime={(iso) => iso.slice(11, 16)}
							toDateTimeLocalValue={(iso) => iso.replace("Z", "").slice(0, 16)}
							fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
							appointmentLabels={appointmentLabels}
							activeVisitLockedAppointmentStatuses={new Set(["in_treatment", "completed"])}
						/>
					</div>
				)}

				{/* 2. CHAIRSIDE EMK WORKSPACE WITH 1-CLICK PHYSIOLOGICAL NORM */}
				{activeView === "emk_toolbar" && (
					<div className="w-full max-w-5xl bg-[var(--paper)] rounded-2xl shadow-xl border border-[var(--line)] p-5 space-y-4">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
							<div>
								<h2 className="text-base font-bold text-[var(--ink)] m-0">
									Электронная медицинская карта — Форма 043/у
								</h2>
								<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
									Пациент: <strong>Алексеева Виктория Игоревна (32 года)</strong> | Врач: Д-р Воронов А. В.
								</p>
							</div>
							<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
								<Check size={14} />
								<span>Автосохранение: активно (debounced 600мс)</span>
							</div>
						</div>

						{/* Prominent EmkToolbar */}
						<EmkToolbar
							activeEmkTab={activeEmkTab}
							setActiveEmkTab={setActiveEmkTab}
							onApplyPhysiologicalNorm={() => setNormApplied(true)}
							onApplyNorm={() => setNormApplied(true)}
							onOpenProtocolsCatalog={() => {}}
							hasUnsavedChanges={false}
							noteForm={{
								complaints: normApplied ? "Жалоб на момент осмотра не предъявляет." : "",
								anamnesis: normApplied ? "Соматически здоров. Аллергологический анамнез не отягощен." : "",
								objectiveStatus: normApplied ? "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Прикус ортогнатический. Зубные ряды интактны." : "",
								diagnosis: normApplied ? "Z01.2 Стоматологическое обследование (Здоров)" : "",
							}}
						/>

						{/* Mock Clinical SOAP Protocol Cards */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
							<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-[var(--ink)] uppercase">
										Жалобы и Анамнез
									</label>
									{normApplied && (
										<span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
											✓ Норма
										</span>
									)}
								</div>
								<textarea
									rows={3}
									readOnly
									value={
										normApplied
											? "Жалоб на момент осмотра не предъявляет. Соматически здоров. Физиологическая норма."
											: "Нажмите кнопку «✓ Соматически здоров / Норма» в тулбаре выше для экспресс-заполнения нормы в 1 клик."
									}
									className="w-full text-xs p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-none"
								/>
							</div>

							<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-[var(--ink)] uppercase">
										Объективный статус и Диагноз
									</label>
									{normApplied && (
										<span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
											Z01.2
										</span>
									)}
								</div>
								<textarea
									rows={3}
									readOnly
									value={
										normApplied
											? "СОПР бледно-розовая, влажная, без патологических элементов. КПУ = 0. Прикус физиологический. Диагноз: Z01.2 Стоматологическое обследование."
											: "Заполняется врачом вручную или автоматически по протоколам СтАР."
									}
									className="w-full text-xs p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-none"
								/>
							</div>
						</div>

						{/* Action Buttons Strip */}
						<div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
							<span className="text-xs text-[var(--muted)]">
								Мандат 8e: Кнопка «Завершить приём» никогда не блокируется серым цветом
							</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]/50 cursor-pointer"
								>
									Сохранить черновик
								</button>
								<button
									type="button"
									className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[var(--ok-fg)] text-white shadow-sm hover:opacity-90 cursor-pointer flex items-center gap-1.5"
									data-testid="btn-complete-visit-emk-preview"
								>
									<Check size={16} />
									<span>Завершить приём и чек</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* 3. MOBILE CHAIRSIDE VISIT WORKSPACE (390x844 SIMULATION) */}
				{activeView === "mobile_chairside" && (
					<div
						className="mobile-chairside-container w-[390px] h-[844px] max-h-[844px] bg-[var(--paper)] border-4 border-slate-700 dark:border-slate-800 rounded-[44px] shadow-2xl overflow-hidden flex flex-col relative"
						style={{ minHeight: "844px" }}
						data-testid="mobile-chairside-workspace"
					>
						{/* iOS Dynamic Island & Status Bar */}
						<div className="h-10 bg-[var(--paper-strong)] border-b border-[var(--line)] px-6 flex items-center justify-between text-[11px] font-bold text-[var(--ink)] shrink-0">
							<span>09:41</span>
							<div className="w-20 h-4 bg-black rounded-full" />
							<span>5G 100%</span>
						</div>

						{/* Mobile Workspace Content */}
						<div className="flex-1 overflow-hidden flex flex-col">
							<MobileChairsideVisitWorkspace
								activePatient={{
									id: "pat-1",
									fullName: "Алексеева Виктория Игоревна",
									phone: "+7 (916) 555-01-99",
									birthDate: "1992-04-12",
									allergies: ["Лидокаин", "Новокаин"],
								}}
								activeAppointment={{
									id: "apt-1",
									startTime: new Date().toISOString(),
									status: "in_progress",
								}}
								activeDoctor={{
									id: "doc-1",
									name: "Д-р Воронов Алексей",
									specialty: "Стоматолог-терапевт",
								}}
								updateVisitNoteField={() => {}}
								handleFinishVisitAction={() => {}}
								handleApplySomaticNormQuick={() => {}}
								flushPendingVisitSaves={() => {}}
							/>
						</div>
					</div>
				)}

				{/* 4. FAST CHECKOUT 54-FZ MODAL (NO INN FOR INDIVIDUALS, 100% WARRANTY) */}
				{activeView === "fast_checkout" && (
					<div className="w-full max-w-xl">
						<FastCheckoutModal
							isOpen={true}
							onClose={() => {}}
							patientId="pat-1"
							visitId="vis-1"
							patientName="Алексеева Виктория Игоревна"
							patientPhone="+7 (916) 555-01-99"
							patientEmail="alekseeva@example.com"
							totalBillRub={8500}
							patientDepositRub={2000}
							onPaymentComplete={() => {}}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<DoctorAutonomyPreviewApp />);
}
