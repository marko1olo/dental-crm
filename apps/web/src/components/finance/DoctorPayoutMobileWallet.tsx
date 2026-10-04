import React, { useId, useMemo, useState } from "react";
import { countLabel, money } from "../../AppHelpers";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
	Wallet,
	Calendar,
	ChevronRight,
	X,
	FileSpreadsheet,
	Sparkles,
	Layers,
	Scissors,
	TrendingUp,
	CheckCircle2,
	RefreshCw,
	AlertCircle,
	Package,
	User,
} from "lucide-react";
import type {
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
} from "../../pages/DoctorPayoutDashboard";
import {
	mapRoleToSpecialtyId,
	inferServiceCategory,
} from "../../pages/DoctorPayoutDashboard";

export interface DoctorPayoutMobileWalletProps {
	readonly report: DoctorPayoutReport | null;
	readonly month: string;
	readonly onMonthChange: (newMonth: string) => void;
	readonly onRefresh: () => void;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
	readonly canEditRates: boolean;
	readonly onEditRate?: (doctorUserId: string) => void;
	readonly isLoading: boolean;
}

interface CategoryCardItem {
	readonly id: string;
	readonly name: string;
	readonly iconType: "therapy" | "ortho" | "surgery" | "orthodontics" | "hygiene" | "deduction";
	readonly badge?: string;
	readonly ratePct: number | null;
	readonly grossRevenueRub: number;
	readonly amountRub: number;
	readonly isDeduction?: boolean;
}

interface ShiftSummaryItem {
	readonly date: string;
	readonly formattedDate: string;
	readonly dayOfWeek: string;
	readonly visits: readonly DoctorPayoutVisit[];
	readonly patientCount: number;
	readonly estimatedHours: number;
	readonly shiftRevenueRub: number;
	readonly shiftEarnedRub: number;
}

/** Demo showcase row strictly for Demo Showcase Mode when database has 0 payout rows. */
const DEMO_SHOWCASE_DOCTOR: DoctorPayoutRow = {
	doctorUserId: "demo_doc_sokolov",
	doctorName: "Д-р Соколов А. В.",
	role: "Стоматолог-терапевт, ортопед",
	isActive: true,
	revenueRub: 348000,
	paymentCount: 14,
	materialCostRub: 2800,
	materialMovements: 14,
	materialMovementsUnpriced: 0,
	materialsState: "counted",
	labCostRub: 14000,
	labOrdersCount: 2,
	withheldLabRub: 14000,
	commissionPct: 40,
	materialDeductionPct: 25,
	labDeductionPct: 100,
	rateEffectiveFrom: "2026-01-01",
	rateRowCount: 1,
	state: "computed",
	accruedRub: 139200,
	withheldMaterialRub: 700,
	payoutRub: 124500,
	note: "Расчёт по согласованной ставке 40% с удержанием ЗТЛ и части материалов",
	visits: [
		{
			visitId: "v-demo-1",
			appointmentId: "app-1",
			paidAt: "2026-10-12T14:30:00.000Z",
			visitDate: "2026-10-12",
			patientId: "p-1",
			patientName: "Иванова Мария Сергеевна",
			medicalCardNumber: "1042/26",
			revenueRub: 82000,
			paymentCount: 1,
			services: [
				{
					id: "s-1",
					title: "Эндодонтическое лечение 3-канального зуба",
					order804nCode: "A16.07.030",
					toothCode: "1.6",
					priceRub: 32000,
					quantity: 1,
				},
				{
					id: "s-2",
					title: "Установка металлокерамической коронки",
					order804nCode: "A16.07.004",
					toothCode: "2.4",
					priceRub: 50000,
					quantity: 1,
				},
			],
			materials: [
				{
					id: "m-1",
					name: "Гуттаперчевые штифты Meta Biomed",
					quantity: 3,
					unit: "шт",
					unitCostRub: 150,
					totalCostRub: 450,
				},
			],
		},
		{
			visitId: "v-demo-2",
			appointmentId: "app-2",
			paidAt: "2026-10-12T17:00:00.000Z",
			visitDate: "2026-10-12",
			patientId: "p-2",
			patientName: "Петров Константин Евгеньевич",
			medicalCardNumber: "1088/26",
			revenueRub: 18000,
			paymentCount: 1,
			services: [
				{
					id: "s-3",
					title: "Художественная реставрация зуба Estelite",
					order804nCode: "A16.07.002",
					toothCode: "1.1",
					priceRub: 18000,
					quantity: 1,
				},
			],
			materials: [],
		},
		{
			visitId: "v-demo-3",
			appointmentId: "app-3",
			paidAt: "2026-10-15T11:15:00.000Z",
			visitDate: "2026-10-15",
			patientId: "p-3",
			patientName: "Смирнов Виктор Игоревич",
			medicalCardNumber: "1105/26",
			revenueRub: 95000,
			paymentCount: 1,
			services: [
				{
					id: "s-4",
					title: "Керамическая коронка E.max CAD",
					order804nCode: "A16.07.004.001",
					toothCode: "2.1",
					priceRub: 65000,
					quantity: 1,
				},
				{
					id: "s-5",
					title: "Сложное удаление ретинированного зуба",
					order804nCode: "A16.07.001.002",
					toothCode: "3.8",
					priceRub: 30000,
					quantity: 1,
				},
			],
			materials: [
				{
					id: "m-2",
					name: "Шовный материал Vicryl 4-0",
					quantity: 1,
					unit: "шт",
					unitCostRub: 350,
					totalCostRub: 350,
				},
			],
		},
		{
			visitId: "v-demo-4",
			appointmentId: "app-4",
			paidAt: "2026-10-18T15:45:00.000Z",
			visitDate: "2026-10-18",
			patientId: "p-4",
			patientName: "Васильева Татьяна Алексеевна",
			medicalCardNumber: "1140/26",
			revenueRub: 85000,
			paymentCount: 1,
			services: [
				{
					id: "s-6",
					title: "Культевая вкладка из диоксида циркония",
					order804nCode: "A16.07.003",
					toothCode: "1.4",
					priceRub: 45000,
					quantity: 1,
				},
				{
					id: "s-7",
					title: "Комплексная профгигиена полости рта Air Flow",
					order804nCode: "A16.07.051",
					toothCode: null,
					priceRub: 40000,
					quantity: 1,
				},
			],
			materials: [],
		},
		{
			visitId: "v-demo-5",
			appointmentId: "app-5",
			paidAt: "2026-10-22T12:00:00.000Z",
			visitDate: "2026-10-22",
			patientId: "p-5",
			patientName: "Козлов Дмитрий Николаевич",
			medicalCardNumber: "1182/26",
			revenueRub: 68000,
			paymentCount: 1,
			services: [
				{
					id: "s-8",
					title: "Керамический винир E.max",
					order804nCode: "A16.07.004",
					toothCode: "1.2",
					priceRub: 48000,
					quantity: 1,
				},
				{
					id: "s-9",
					title: "Лечение глубокого кариеса",
					order804nCode: "A16.07.002",
					toothCode: "4.5",
					priceRub: 20000,
					quantity: 1,
				},
			],
			materials: [],
		},
	],
	labOrders: [
		{
			id: "lab-demo-1",
			orderNumber: "1042",
			toothFdi: "2.1",
			restorationType: "Коронка E.max CAD",
			material: "Дисиликат лития",
			patientName: "Смирнов Виктор Игоревич",
			status: "completed",
			completedAt: "2026-10-14T10:00:00.000Z",
			priceRub: 8000,
			withheldRub: 8000,
			deductionPct: 100,
		},
		{
			id: "lab-demo-2",
			orderNumber: "1058",
			toothFdi: "1.4",
			restorationType: "Культевая вкладка циркон",
			material: "Диоксид циркония",
			patientName: "Васильева Татьяна Алексеевна",
			status: "completed",
			completedAt: "2026-10-17T11:00:00.000Z",
			priceRub: 6000,
			withheldRub: 6000,
			deductionPct: 100,
		},
	],
};

function formatMonthLabel(monthValue: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return monthValue;
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return monthValue;
	return new Date(Number(match[1]), monthIndex, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});
}

function formatShiftDate(dateStr: string): { formatted: string; dayOfWeek: string } {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
	if (!match) return { formatted: dateStr, dayOfWeek: "" };
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const d = new Date(year, month, day);
	const formatted = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
	const dayOfWeek = d.toLocaleDateString("ru-RU", { weekday: "short" });
	return {
		formatted: `${formatted}, ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}`,
		dayOfWeek,
	};
}

export function DoctorPayoutMobileWallet({
	report,
	month,
	onMonthChange,
	onRefresh,
	onOpenPayrollModal,
	isLoading,
}: DoctorPayoutMobileWalletProps) {
	const monthInputId = useId();
	const isDemo = isDemoShowcaseMode();

	// Active doctors list from report or fallback demo
	const availableDoctors: readonly DoctorPayoutRow[] = useMemo(() => {
		if (report && report.rows.length > 0) {
			return report.rows;
		}
		if (isDemo) {
			return [DEMO_SHOWCASE_DOCTOR];
		}
		return [];
	}, [report, isDemo]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
		return availableDoctors[0]?.doctorUserId ?? "";
	});

	// Currently active doctor row
	const currentDoctor: DoctorPayoutRow | null = useMemo(() => {
		if (availableDoctors.length === 0) return null;
		const found = availableDoctors.find((d) => d.doctorUserId === selectedDoctorId);
		return found ?? availableDoctors[0] ?? null;
	}, [availableDoctors, selectedDoctorId]);

	// Shift bottom sheet drawer state
	const [activeShiftDate, setActiveShiftDate] = useState<string | null>(null);

	// Group visits into shifts for current doctor
	const shifts: readonly ShiftSummaryItem[] = useMemo(() => {
		if (!currentDoctor || !currentDoctor.visits || currentDoctor.visits.length === 0) {
			return [];
		}

		const map = new Map<string, DoctorPayoutVisit[]>();
		for (const v of currentDoctor.visits) {
			const d = v.visitDate || v.paidAt.slice(0, 10);
			const list = map.get(d) ?? [];
			list.push(v);
			map.set(d, list);
		}

		const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
		const commissionRate = (currentDoctor.commissionPct ?? 0) / 100;

		return sortedDates.map((dateStr) => {
			const vList = map.get(dateStr) ?? [];
			const rev = vList.reduce((acc, v) => acc + v.revenueRub, 0);
			const earned = Math.round(rev * commissionRate);
			const { formatted, dayOfWeek } = formatShiftDate(dateStr);
			// T-13 estimated hours based on patient visits
			const estimatedHours = Math.min(12, Math.max(4, Math.round(vList.length * 1.5)));

			return {
				date: dateStr,
				formattedDate: formatted,
				dayOfWeek,
				visits: vList,
				patientCount: vList.length,
				estimatedHours,
				shiftRevenueRub: rev,
				shiftEarnedRub: earned,
			};
		});
	}, [currentDoctor]);

	// Currently inspected shift for Bottom Sheet
	const activeShift = useMemo(() => {
		if (!activeShiftDate) return null;
		return shifts.find((s) => s.date === activeShiftDate) ?? null;
	}, [shifts, activeShiftDate]);

	// Categories breakdown calculation
	const categoryCards: readonly CategoryCardItem[] = useMemo(() => {
		if (!currentDoctor) return [];
		const specialtyId = mapRoleToSpecialtyId(currentDoctor.role);
		const commRate = (currentDoctor.commissionPct ?? 0) / 100;

		const catSums: Record<
			string,
			{ gross: number; earned: number; count: number; name: string; icon: CategoryCardItem["iconType"] }
		> = {
			therapy: {
				gross: 0,
				earned: 0,
				count: 0,
				name: "Терапия",
				icon: "therapy",
			},
			orthopedics: {
				gross: 0,
				earned: 0,
				count: 0,
				name: "Ортопедия",
				icon: "ortho",
			},
			surgery: {
				gross: 0,
				earned: 0,
				count: 0,
				name: "Хирургия",
				icon: "surgery",
			},
			orthodontics: {
				gross: 0,
				earned: 0,
				count: 0,
				name: "Ортодонтия",
				icon: "orthodontics",
			},
			hygiene: {
				gross: 0,
				earned: 0,
				count: 0,
				name: "Профгигиена",
				icon: "hygiene",
			},
		};

		if (currentDoctor.visits) {
			for (const v of currentDoctor.visits) {
				if (!v.services || v.services.length === 0) {
					const c = inferServiceCategory("Стоматологические услуги", specialtyId);
					const bucket = c === "retail_hygiene" ? "hygiene" : c;
					if (catSums[bucket]) {
						catSums[bucket].gross += v.revenueRub;
						catSums[bucket].earned += Math.round(v.revenueRub * commRate);
						catSums[bucket].count += 1;
					}
				} else {
					for (const s of v.services) {
						const c = inferServiceCategory(s.title, specialtyId);
						const bucket = c === "retail_hygiene" ? "hygiene" : c;
						const sRev = s.priceRub * s.quantity;
						if (catSums[bucket]) {
							catSums[bucket].gross += sRev;
							catSums[bucket].earned += Math.round(sRev * commRate);
							catSums[bucket].count += 1;
						}
					}
				}
			}
		}

		const result: CategoryCardItem[] = [];

		// Push positive service categories
		for (const [key, data] of Object.entries(catSums)) {
			if (data.gross > 0 || data.count > 0) {
				result.push({
					id: `cat-${key}`,
					name: data.name,
					iconType: data.icon,
					ratePct: currentDoctor.commissionPct,
					grossRevenueRub: data.gross,
					amountRub: data.earned,
					isDeduction: false,
				});
			}
		}

		// Push Lab deduction card if present
		const labWithheld = currentDoctor.withheldLabRub ?? (currentDoctor.labCostRub ?? 0);
		if (labWithheld > 0) {
			result.push({
				id: "cat-lab-deduction",
				name: "Лаборатория (ЗТЛ)",
				iconType: "deduction",
				badge: "Удержание",
				ratePct: currentDoctor.labDeductionPct ?? 100,
				grossRevenueRub: labWithheld,
				amountRub: labWithheld,
				isDeduction: true,
			});
		}

		// Push Material deduction card if present
		const matWithheld = currentDoctor.withheldMaterialRub ?? (currentDoctor.materialCostRub ?? 0);
		if (matWithheld > 0) {
			result.push({
				id: "cat-material-deduction",
				name: "Материалы",
				iconType: "deduction",
				badge: "Расходники",
				ratePct: currentDoctor.materialDeductionPct ?? 0,
				grossRevenueRub: currentDoctor.materialCostRub ?? matWithheld,
				amountRub: matWithheld,
				isDeduction: true,
			});
		}

		return result;
	}, [currentDoctor]);

	const monthLabel = formatMonthLabel(month);

	// Total deductions
	const totalWithheld = useMemo(() => {
		if (!currentDoctor) return 0;
		const lab = currentDoctor.withheldLabRub ?? 0;
		const mat = currentDoctor.withheldMaterialRub ?? 0;
		return lab + mat;
	}, [currentDoctor]);

	// Render empty state if no doctor exists and not in demo
	if (!currentDoctor) {
		return (
			<div className="doctor-wallet-container">
				<header className="doctor-wallet-header">
					<div className="doctor-wallet-title-wrap">
						<h2 className="doctor-wallet-title">Выплаты врачам</h2>
						<span className="doctor-wallet-subtitle">Расчётный кошелёк сотрудника</span>
					</div>
					<label htmlFor={monthInputId} className="doctor-wallet-month-badge">
						<Calendar size={16} />
						<span>{monthLabel}</span>
						<input
							id={monthInputId}
							type="month"
							className="doctor-wallet-month-input"
							value={month}
							onChange={(e) => onMonthChange(e.target.value)}
						/>
					</label>
				</header>

				<div className="doctor-wallet-empty">
					<div className="doctor-wallet-empty-icon">
						<Wallet size={24} />
					</div>
					<h3 className="doctor-wallet-empty-title">Нет начислений за выбранный месяц</h3>
					<p className="doctor-wallet-empty-sub">
						В периоде {monthLabel} отсутствуют закрытые приёмы или наряды лаборатории.
					</p>
					<button
						type="button"
						className="doctor-wallet-primary-cta"
						onClick={onRefresh}
						disabled={isLoading}
					>
						<RefreshCw size={16} />
						<span>Обновить данные</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="doctor-wallet-container">
			{/* Top Header */}
			<header className="doctor-wallet-header">
				<div className="doctor-wallet-title-wrap">
					<h2 className="doctor-wallet-title">Выплаты врачам</h2>
					<span className="doctor-wallet-subtitle">Кресельный расчётный листок</span>
				</div>

				<label htmlFor={monthInputId} className="doctor-wallet-month-badge" title="Сменить зарплатный месяц">
					<Calendar size={16} />
					<span>{monthLabel}</span>
					<input
						id={monthInputId}
						type="month"
						className="doctor-wallet-month-input"
						value={month}
						onChange={(e) => onMonthChange(e.target.value)}
					/>
				</label>
			</header>

			{/* Doctor Selector Chips Scroller (if multi-doctor) */}
			{availableDoctors.length > 1 && (
				<nav className="doctor-wallet-chips-scroller" aria-label="Выбор врача">
					{availableDoctors.map((doc) => {
						const isSelected = doc.doctorUserId === currentDoctor.doctorUserId;
						return (
							<button
								key={doc.doctorUserId}
								type="button"
								className={`doctor-wallet-chip ${isSelected ? "doctor-wallet-chip--active" : ""}`}
								onClick={() => setSelectedDoctorId(doc.doctorUserId)}
							>
								<User size={14} />
								<span>{doc.doctorName}</span>
							</button>
						);
					})}
				</nav>
			)}

			{/* ── Apple Wallet Hero Card ── */}
			<article className="doctor-wallet-card" aria-label="Карточка начислений врача">
				<div className="doctor-wallet-card-top">
					<span className="doctor-wallet-card-brand">DENTE • PAYOUT</span>
					<span className="doctor-wallet-card-status">
						<Sparkles size={12} />
						<span>К ВЫПЛАТЕ</span>
					</span>
				</div>

				<h3 className="doctor-wallet-card-doctor">{currentDoctor.doctorName}</h3>
				<p className="doctor-wallet-card-role">{currentDoctor.role}</p>

				<div className="doctor-wallet-card-center">
					<div className="doctor-wallet-card-amount">
						{money(currentDoctor.payoutRub ?? currentDoctor.accruedRub ?? 0)}
					</div>
					<div className="doctor-wallet-card-amount-sub">
						Начислено за {monthLabel}
					</div>
				</div>

				<div className="doctor-wallet-card-stats">
					<div className="doctor-wallet-card-stat">
						<span className="doctor-wallet-card-stat-label">Касса</span>
						<span className="doctor-wallet-card-stat-val">
							{money(currentDoctor.revenueRub)}
						</span>
					</div>

					<div className="doctor-wallet-card-stat">
						<span className="doctor-wallet-card-stat-label">Удержано</span>
						<span className={`doctor-wallet-card-stat-val ${totalWithheld > 0 ? "doctor-wallet-card-stat-val--danger" : ""}`}>
							{totalWithheld > 0 ? `−${money(totalWithheld)}` : money(0)}
						</span>
					</div>

					<div className="doctor-wallet-card-stat">
						<span className="doctor-wallet-card-stat-label">Ставка</span>
						<span className="doctor-wallet-card-stat-val">
							{currentDoctor.commissionPct !== null ? `${currentDoctor.commissionPct}%` : "—"}
						</span>
					</div>
				</div>
			</article>

			{/* ── Category Breakdown Cards ── */}
			<section aria-labelledby="wallet-categories-heading">
				<div className="doctor-wallet-section-header">
					<h4 id="wallet-categories-heading" className="doctor-wallet-section-title">
						Структура начислений
					</h4>
					<span className="doctor-wallet-section-count">
						{countLabel(categoryCards.length, "статья", "статьи", "статей")}
					</span>
				</div>

				<div className="doctor-wallet-categories-grid">
					{categoryCards.map((cat) => (
						<div
							key={cat.id}
							className={`doctor-wallet-cat-card ${cat.isDeduction ? "doctor-wallet-cat-card--deduction" : ""}`}
						>
							<div className="doctor-wallet-cat-left">
								<div
									className={`doctor-wallet-cat-icon doctor-wallet-cat-icon--${cat.iconType}`}
								>
									{cat.iconType === "therapy" && <Sparkles size={18} />}
									{cat.iconType === "ortho" && <Layers size={18} />}
									{cat.iconType === "surgery" && <Scissors size={18} />}
									{cat.iconType === "orthodontics" && <TrendingUp size={18} />}
									{cat.iconType === "hygiene" && <CheckCircle2 size={18} />}
									{cat.iconType === "deduction" && <AlertCircle size={18} />}
								</div>

								<div className="doctor-wallet-cat-info">
									<div className="doctor-wallet-cat-name-row">
										<span className="doctor-wallet-cat-name">{cat.name}</span>
										{cat.badge && (
											<span className="doctor-wallet-cat-badge">{cat.badge}</span>
										)}
									</div>
									<span className="doctor-wallet-cat-rate">
										{cat.isDeduction
											? `Вычет: ${cat.ratePct}%`
											: `Ставка: ${cat.ratePct !== null ? `${cat.ratePct}%` : "—"}`}
									</span>
								</div>
							</div>

							<div className="doctor-wallet-cat-right">
								<span
									className={`doctor-wallet-cat-amount ${
										cat.isDeduction
											? "doctor-wallet-cat-amount--minus"
											: "doctor-wallet-cat-amount--plus"
									}`}
								>
									{cat.isDeduction ? `−${money(cat.amountRub)}` : `+${money(cat.amountRub)}`}
								</span>
								<span className="doctor-wallet-cat-subrev">
									касса: {money(cat.grossRevenueRub)}
								</span>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ── Shift & Appointment History (Grouped Inset Cards) ── */}
			<section aria-labelledby="wallet-shifts-heading">
				<div className="doctor-wallet-section-header">
					<h4 id="wallet-shifts-heading" className="doctor-wallet-section-title">
						История смен и табель Т-13
					</h4>
					<span className="doctor-wallet-section-count">
						{countLabel(shifts.length, "смена", "смены", "смен")}
					</span>
				</div>

				{shifts.length === 0 ? (
					<div className="doctor-wallet-empty">
						<Calendar size={20} className="doctor-wallet-empty-icon" />
						<p className="doctor-wallet-empty-sub">
							В этом месяце нет зафиксированных приёмов врача.
						</p>
					</div>
				) : (
					<div className="doctor-wallet-shifts-group">
						{shifts.map((shift) => (
							<div
								key={shift.date}
								className="doctor-wallet-shift-row"
								onClick={() => setActiveShiftDate(shift.date)}
								role="button"
								tabIndex={0}
								aria-label={`Смена ${shift.formattedDate}`}
							>
								<div className="doctor-wallet-shift-left">
									<div className="doctor-wallet-shift-cal-icon">
										<Calendar size={18} />
									</div>
									<div className="doctor-wallet-shift-details">
										<span className="doctor-wallet-shift-date">
											{shift.formattedDate}
										</span>
										<span className="doctor-wallet-shift-meta">
											{shift.estimatedHours} ч смены • {countLabel(shift.patientCount, "пациент", "пациента", "пациентов")}
										</span>
									</div>
								</div>

								<div className="doctor-wallet-shift-right">
									<span className="doctor-wallet-shift-amount">
										+{money(shift.shiftEarnedRub)}
									</span>
									<ChevronRight size={18} className="doctor-wallet-shift-chevron" />
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* ── Native iOS Bottom Sheet Drawer for Shift Drill-Down ── */}
			{activeShift && (
				<div
					className="doctor-wallet-sheet-backdrop"
					onClick={() => setActiveShiftDate(null)}
					role="dialog"
					aria-modal="true"
					aria-label={`Детализация смены ${activeShift.formattedDate}`}
				>
					<div
						className="doctor-wallet-sheet-surface"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="doctor-wallet-sheet-handle-wrap">
							<div className="doctor-wallet-sheet-handle" />
						</div>

						<div className="doctor-wallet-sheet-header">
							<h3 className="doctor-wallet-sheet-title">
								Смена {activeShift.formattedDate}
							</h3>
							<button
								type="button"
								className="doctor-wallet-sheet-close"
								onClick={() => setActiveShiftDate(null)}
								aria-label="Закрыть детализацию смены"
							>
								<X size={20} />
							</button>
						</div>

						{/* Shift summary metrics */}
						<div className="doctor-wallet-sheet-summary-badge">
							<div className="doctor-wallet-sheet-summary-item">
								<span className="doctor-wallet-sheet-summary-lbl">Пациенты</span>
								<span className="doctor-wallet-sheet-summary-val">{activeShift.patientCount}</span>
							</div>
							<div className="doctor-wallet-sheet-summary-item">
								<span className="doctor-wallet-sheet-summary-lbl">Касса смены</span>
								<span className="doctor-wallet-sheet-summary-val">{money(activeShift.shiftRevenueRub)}</span>
							</div>
							<div className="doctor-wallet-sheet-summary-item">
								<span className="doctor-wallet-sheet-summary-lbl">К начислению</span>
								<span className="doctor-wallet-sheet-summary-val">{money(activeShift.shiftEarnedRub)}</span>
							</div>
						</div>

						{/* Itemized visits scroll */}
						<div className="doctor-wallet-sheet-scroll">
							{activeShift.visits.map((v) => {
								const visitEarned = Math.round(v.revenueRub * ((currentDoctor.commissionPct ?? 0) / 100));
								return (
									<div key={v.visitId} className="doctor-wallet-visit-item">
										<div className="doctor-wallet-visit-top">
											<div>
												<h5 className="doctor-wallet-visit-patient">{v.patientName}</h5>
												<span className="doctor-wallet-visit-cardno">
													Карта № {v.medicalCardNumber}
												</span>
											</div>
											<div>
												<div className="doctor-wallet-visit-revenue">
													{money(v.revenueRub)}
												</div>
												<div className="doctor-wallet-visit-earned">
													+{money(visitEarned)}
												</div>
											</div>
										</div>

										{/* Services in this visit */}
										{v.services.map((srv) => (
											<div key={srv.id} className="doctor-wallet-service-row">
												<div className="doctor-wallet-service-name">
													{srv.toothCode && (
														<span className="doctor-wallet-tooth-badge">
															{srv.toothCode}
														</span>
													)}
													{srv.order804nCode && (
														<span className="doctor-wallet-service-code">
															{srv.order804nCode}
														</span>
													)}
													<span>{srv.title}</span>
												</div>
												<span className="doctor-wallet-service-price">
													{money(srv.priceRub * srv.quantity)}
												</span>
											</div>
										))}

										{/* Deductible materials if any */}
										{v.materials && v.materials.length > 0 && (
											<div className="doctor-wallet-service-row">
												<div className="doctor-wallet-service-name">
													<Package size={12} />
													<span>Материалы ({v.materials.length})</span>
												</div>
												<span className="doctor-wallet-service-price">
													−{money(v.materials.reduce((acc, m) => acc + m.totalCostRub, 0))}
												</span>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Sheet footer CTA */}
						<div className="doctor-wallet-sheet-footer">
							<button
								type="button"
								className="doctor-wallet-primary-cta"
								onClick={() => setActiveShiftDate(null)}
							>
								<span>Закрыть детализацию</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Sticky Bottom Thumb Zone Action Bar ── */}
			<div className="doctor-wallet-bottom-bar">
				<button
					type="button"
					className="doctor-wallet-primary-cta"
					onClick={() => onOpenPayrollModal(currentDoctor)}
					aria-label="Открыть расчётную ведомость Т-51"
				>
					<FileSpreadsheet size={18} />
					<span>Ведомость Т-51</span>
				</button>

				<button
					type="button"
					className="doctor-wallet-sec-cta"
					onClick={onRefresh}
					disabled={isLoading}
					aria-label="Обновить расчёт выплат"
					title="Обновить"
				>
					<RefreshCw size={18} />
				</button>
			</div>
		</div>
	);
}
