import React, { useEffect, useId, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Play, Printer, StopCircle } from "lucide-react";
import {
	calculateChairRentalEconomics,
	type ChairRentalModel,
	type ChairRentalParams,
	type ChairRentalResult,
} from "@dental/shared";
import "../../styles/modules/chair-rental-widget.css";
import { ChairRentalModelSelector } from "./chairRentalModules/ChairRentalModelSelector";
import { ChairRentalShiftTimeSelector } from "./chairRentalModules/ChairRentalShiftTimeSelector";
import { ChairRentalRateInputs } from "./chairRentalModules/ChairRentalRateInputs";
import { ChairRentalProfitBreakdown } from "./chairRentalModules/ChairRentalProfitBreakdown";
import { ChairRentalReconciliationModal } from "./chairRentalModules/ChairRentalReconciliationModal";

export interface ChairRentalShiftWidgetProps {
	readonly doctorFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialGrossRevenueRub?: number | undefined;
	readonly initialHoursWorked?: number | undefined;
	readonly initialLabExpensesRub?: number | undefined;
	readonly initialConsumablesRub?: number | undefined;
	readonly onPrintAct?: (() => void) | undefined;
	readonly onEconomicsChange?: ((econ: ChairRentalResult) => void) | undefined;
	readonly externalOpenActTrigger?: number | undefined;
	readonly className?: string | undefined;
	readonly initialRentalActive?: boolean | undefined;
	readonly initialChairId?: string | undefined;
	readonly onRentalSessionChange?: ((session: { isActive: boolean; chairId: string; startedAt?: string }) => void) | undefined;
}

export const ChairRentalShiftWidget: React.FC<ChairRentalShiftWidgetProps> = ({
	doctorFullName = "Барабаш С.В.",
	clinicName = "ООО «Денте Стоматология»",
	initialGrossRevenueRub = 0,
	initialHoursWorked = 0,
	initialLabExpensesRub = 0,
	initialConsumablesRub = 0,
	onEconomicsChange,
	externalOpenActTrigger = 0,
	className = "",
	initialRentalActive = false,
	initialChairId = "chair-01",
	onRentalSessionChange,
}) => {
	const widgetId = useId();

	// Autonomous Chair Rental Session State (Mandates 8e, 8n)
	const [isRentalActive, setIsRentalActive] = useState<boolean>(initialRentalActive);
	const [selectedChairId, setSelectedChairId] = useState<string>(initialChairId);
	const [rentalStartedAt, setRentalStartedAt] = useState<Date | null>(null);
	const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState<number>(0);

	// Active rental model
	const [model, setModel] = useState<ChairRentalModel>("hourly");

	// Model rate states (in Rubles for user input)
	const [hourlyRateRub, setHourlyRateRub] = useState<number>(1500);
	const [shiftRateRub, setShiftRateRub] = useState<number>(4000);
	const [landlordPercent, setLandlordPercent] = useState<number>(25);
	const [monthlyRateRub, setMonthlyRateRub] = useState<number>(66000);
	const [workingDaysInMonth, setWorkingDaysInMonth] = useState<number>(22);

	// Shift clinical volume states
	const [hoursWorked, setHoursWorked] = useState<number>(initialHoursWorked);
	const [shiftsCount, setShiftsCount] = useState<number>(1);
	const [grossRevenueRub, setGrossRevenueRub] = useState<number>(initialGrossRevenueRub);
	const [labExpensesRub, setLabExpensesRub] = useState<number>(initialLabExpensesRub);
	const [consumablesRub, setConsumablesRub] = useState<number>(initialConsumablesRub);

	// Reconciliation act sheet modal
	const [isActModalOpen, setIsActModalOpen] = useState<boolean>(false);

	useEffect(() => {
		if (externalOpenActTrigger > 0) {
			setIsActModalOpen(true);
		}
	}, [externalOpenActTrigger]);

	useEffect(() => {
		if (typeof initialGrossRevenueRub === "number") {
			setGrossRevenueRub(initialGrossRevenueRub);
		}
	}, [initialGrossRevenueRub]);

	useEffect(() => {
		if (typeof initialHoursWorked === "number" && initialHoursWorked > 0) {
			setHoursWorked(initialHoursWorked);
		}
	}, [initialHoursWorked]);

	useEffect(() => {
		if (typeof initialLabExpensesRub === "number") {
			setLabExpensesRub(initialLabExpensesRub);
		}
	}, [initialLabExpensesRub]);

	useEffect(() => {
		if (typeof initialConsumablesRub === "number") {
			setConsumablesRub(initialConsumablesRub);
		}
	}, [initialConsumablesRub]);

	// Hydrate active chair rental session from /api/doctor/chair-rental/session
	useEffect(() => {
		let cancelled = false;
		async function loadRentalSession() {
			try {
				const res = await fetch("/api/doctor/chair-rental/session");
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data?.session) return;
				if (data.session.isActive) {
					setIsRentalActive(true);
					if (data.session.chairId) setSelectedChairId(data.session.chairId);
					if (data.session.startedAt) setRentalStartedAt(new Date(data.session.startedAt));
					if (typeof data.session.elapsedMinutes === "number") {
						setSessionElapsedMinutes(data.session.elapsedMinutes);
					}
				}
			} catch {
				// Offline or unit test fallback
			}
		}
		void loadRentalSession();
		return () => {
			cancelled = true;
		};
	}, []);

	// Live timer ticker for active rental session
	useEffect(() => {
		if (!isRentalActive || !rentalStartedAt) return;
		const interval = setInterval(() => {
			const now = new Date();
			const diffMins = Math.max(0, Math.floor((now.getTime() - rentalStartedAt.getTime()) / 60000));
			setSessionElapsedMinutes(diffMins);
		}, 10000);
		return () => clearInterval(interval);
	}, [isRentalActive, rentalStartedAt]);

	const handleStartRentalSession = async () => {
		const now = new Date();
		setIsRentalActive(true);
		setRentalStartedAt(now);
		setSessionElapsedMinutes(0);
		onRentalSessionChange?.({ isActive: true, chairId: selectedChairId, startedAt: now.toISOString() });

		try {
			await fetch("/api/doctor/chair-rental/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "start",
					chairId: selectedChairId,
					chairName: selectedChairId === "chair-02" ? "Кресло №2 (Planmeca Compact)" : selectedChairId === "chair-03" ? "Кресло №3 (Sirona Intego)" : "Кресло №1 (Anthos A5)",
					model,
					rateRub: model === "hourly" ? hourlyRateRub : model === "per_shift" ? shiftRateRub : 1500,
				}),
			});
		} catch {
			// Graceful fallback
		}
	};

	const handleStopRentalSession = async () => {
		setIsRentalActive(false);
		onRentalSessionChange?.({ isActive: false, chairId: selectedChairId });

		try {
			await fetch("/api/doctor/chair-rental/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "stop", chairId: selectedChairId }),
			});
		} catch {
			// Graceful fallback
		}
	};

	// Hydrate initial summary from backend API (/api/doctor/chair-rental/summary)
	useEffect(() => {
		let cancelled = false;
		async function loadSummary() {
			try {
				const res = await fetch("/api/doctor/chair-rental/summary?model=hourly");
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data?.economics) return;
				if (typeof data.hoursWorked === "number" && data.hoursWorked > 0) {
					setHoursWorked(data.hoursWorked);
				}
				if (typeof data.economics.grossRevenueRub === "number" && data.economics.grossRevenueRub > 0) {
					setGrossRevenueRub(data.economics.grossRevenueRub);
				}
				if (typeof data.economics.labExpensesRub === "number" && data.economics.labExpensesRub > 0) {
					setLabExpensesRub(data.economics.labExpensesRub);
				}
				if (typeof data.economics.consumablesRub === "number" && data.economics.consumablesRub > 0) {
					setConsumablesRub(data.economics.consumablesRub);
				}
			} catch {
				// Graceful fallback to initial props when offline or in unit test
			}
		}
		void loadSummary();
		return () => {
			cancelled = true;
		};
	}, []);

	// Precise kopeck calculation using sovereign calculateChairRentalEconomics
	const economics: ChairRentalResult = useMemo(() => {
		const params: ChairRentalParams = {
			model,
			hourlyRateKopecks: Math.round(Math.max(0, hourlyRateRub) * 100),
			hoursWorked: Math.max(0, hoursWorked),
			shiftRateKopecks: Math.round(Math.max(0, shiftRateRub) * 100),
			shiftsCount: Math.max(1, shiftsCount),
			landlordPercent: Math.min(100, Math.max(0, landlordPercent)),
			monthlyRateKopecks: Math.round(Math.max(0, monthlyRateRub) * 100),
			workingDaysInMonth: Math.max(1, workingDaysInMonth),
			grossRevenueKopecks: Math.round(Math.max(0, grossRevenueRub) * 100),
			labExpensesKopecks: Math.round(Math.max(0, labExpensesRub) * 100),
			consumablesKopecks: Math.round(Math.max(0, consumablesRub) * 100),
		};

		return calculateChairRentalEconomics(params);
	}, [
		model,
		hourlyRateRub,
		hoursWorked,
		shiftRateRub,
		shiftsCount,
		landlordPercent,
		monthlyRateRub,
		workingDaysInMonth,
		grossRevenueRub,
		labExpensesRub,
		consumablesRub,
	]);

	useEffect(() => {
		onEconomicsChange?.(economics);
	}, [economics, onEconomicsChange]);

	const formatRub = (val: number) =>
		val.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";

	const todayDateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});

	const actDocNumber = `ACT-CR-${new Date().getFullYear()}-${String(
		new Date().getMonth() + 1,
	).padStart(2, "0")}-042`;

	const modelLabels: Record<ChairRentalModel, string> = {
		hourly: "Почасовая ставка",
		per_shift: "Посменная ставка",
		revenue_percent: "Процент выручки",
		fixed_monthly: "Фикс в месяц",
	};

	return (
		<section
			className={`chair-rental-widget ${className}`}
			data-testid="chair-rental-shift-widget"
			aria-label="Субаренда кресла и доход врача"
		>
			{/* Header */}
			<div className="chair-rental-header">
				<div className="chair-rental-title-group">
					<div className="chair-rental-icon-badge" aria-hidden="true">
						<Calculator size={18} />
					</div>
					<div>
						<h3 className="chair-rental-title">Субаренда кресла и доход врача</h3>
						<p className="chair-rental-subtitle">
							{doctorFullName} · Расчет смены без скрытых комиссий
						</p>
					</div>
				</div>
			</div>

			{/* Autonomous Chair Rental Control Strip (Mandates 8e, 8n) */}
			<div
				className="chair-rental-session-strip"
				style={{
					margin: "12px 0 6px 0",
					padding: "10px 14px",
					borderRadius: "14px",
					background: isRentalActive
						? "color-mix(in srgb, var(--ok-fg, #15803d) 8%, var(--paper))"
						: "var(--paper-soft)",
					border: isRentalActive
						? "1px solid color-mix(in srgb, var(--ok-fg, #15803d) 30%, transparent)"
						: "1px solid var(--line)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "10px",
				}}
				data-testid="autonomous-chair-rental-strip"
			>
				{!isRentalActive ? (
					<>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
							<label
								htmlFor={`chair-select-${widgetId}`}
								style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}
							>
								Рабочее место:
							</label>
							<select
								id={`chair-select-${widgetId}`}
								value={selectedChairId}
								onChange={(e) => setSelectedChairId(e.target.value)}
								style={{
									height: "38px",
									padding: "0 10px",
									borderRadius: "8px",
									border: "1px solid var(--line)",
									background: "var(--paper)",
									color: "var(--ink)",
									fontSize: "12.5px",
									fontWeight: 600,
									flex: 1,
								}}
							>
								<option value="chair-01">Кресло №1 (Anthos A5)</option>
								<option value="chair-02">Кресло №2 (Planmeca Compact)</option>
								<option value="chair-03">Кресло №3 (Sirona Intego)</option>
							</select>
						</div>

						<button
							type="button"
							onClick={handleStartRentalSession}
							data-testid="btn-start-chair-rental"
							style={{
								minHeight: "44px",
								height: "44px",
								padding: "0 16px",
								borderRadius: "10px",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								border: "none",
								fontSize: "13px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								whiteSpace: "nowrap",
							}}
						>
							<Play size={15} />
							<span>Арендовать кресло и начать приём</span>
						</button>
					</>
				) : (
					<>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "220px" }}>
							<span
								style={{
									width: "10px",
									height: "10px",
									borderRadius: "50%",
									background: "var(--ok-fg, #15803d)",
									flexShrink: 0,
								}}
								aria-hidden="true"
							/>
							<div>
								<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ok-fg, #15803d)" }}>
									Кресло арендовано · Приём открыт
								</div>
								<div style={{ fontSize: "11.5px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
									<span>{selectedChairId === "chair-02" ? "Кресло №2 (Planmeca)" : selectedChairId === "chair-03" ? "Кресло №3 (Sirona)" : "Кресло №1 (Anthos)"}</span>
									<span>•</span>
									<span style={{ fontFamily: "monospace", fontWeight: 600 }}>
										Время: {String(Math.floor(sessionElapsedMinutes / 60)).padStart(2, "0")}:{String(sessionElapsedMinutes % 60).padStart(2, "0")}
									</span>
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={handleStopRentalSession}
							data-testid="btn-stop-chair-rental"
							style={{
								minHeight: "44px",
								height: "44px",
								padding: "0 14px",
								borderRadius: "10px",
								background: "var(--paper)",
								color: "var(--warn-fg, #c2410c)",
								border: "1px solid color-mix(in srgb, var(--warn-fg, #c2410c) 30%, transparent)",
								fontSize: "12.5px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								whiteSpace: "nowrap",
							}}
						>
							<StopCircle size={15} />
							<span>Завершить аренду кресла</span>
						</button>
					</>
				)}
			</div>

			{/* Model Switcher Segmented Control */}
			<ChairRentalModelSelector model={model} onSelectModel={setModel} />

			{/* Dynamic Rate & Clinical Hours Inputs */}
			<div className="chair-rental-inputs-grid">
				<ChairRentalRateInputs
					model={model}
					hourlyRateRub={hourlyRateRub}
					onChangeHourlyRateRub={setHourlyRateRub}
					shiftRateRub={shiftRateRub}
					onChangeShiftRateRub={setShiftRateRub}
					landlordPercent={landlordPercent}
					onChangeLandlordPercent={setLandlordPercent}
					monthlyRateRub={monthlyRateRub}
					onChangeMonthlyRateRub={setMonthlyRateRub}
					grossRevenueRub={grossRevenueRub}
					onChangeGrossRevenueRub={setGrossRevenueRub}
					widgetId={widgetId}
					timeSelector={
						<ChairRentalShiftTimeSelector
							model={model}
							hoursWorked={hoursWorked}
							onChangeHoursWorked={setHoursWorked}
							shiftsCount={shiftsCount}
							onChangeShiftsCount={setShiftsCount}
							workingDaysInMonth={workingDaysInMonth}
							onChangeWorkingDaysInMonth={setWorkingDaysInMonth}
							widgetId={widgetId}
						/>
					}
				/>
			</div>

			{/* Spotlight Net Income & Expense Breakdown */}
			<ChairRentalProfitBreakdown economics={economics} formatRub={formatRub} />

			{/* Footer Print CTA */}
			<div className="chair-rental-footer-actions">
				<button
					type="button"
					className="chair-rental-act-btn"
					onClick={() => setIsActModalOpen(true)}
					data-testid="btn-print-reconciliation-act"
				>
					<Printer size={16} />
					<span>Печать акта сверки субаренды</span>
				</button>
			</div>

			{/* Reconciliation Act Modal / Bottom Sheet */}
			<ChairRentalReconciliationModal
				isOpen={isActModalOpen}
				onClose={() => setIsActModalOpen(false)}
				clinicName={clinicName}
				doctorFullName={doctorFullName}
				model={model}
				hoursWorked={hoursWorked}
				economics={economics}
				formatRub={formatRub}
				modelLabels={modelLabels}
				actDocNumber={actDocNumber}
				todayDateStr={todayDateStr}
			/>
		</section>
	);
};
