import React, { useState } from "react";
import {
	Banknote,
	CheckCircle2,
	Coins,
	CreditCard,
	FileText,
	Lock,
	Printer,
	QrCode,
	Receipt,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import { money } from "../../AppHelpers";
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";
import { showToast } from "../GlobalToast";
import type { DoctorShiftCashSummary } from "./DoctorShiftCloseModal";
import { printEncashmentStatement } from "./shiftPrintStatements";

export interface DoctorShiftCashSectionProps {
	readonly cashSummary?: DoctorShiftCashSummary | undefined;
	readonly totalRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly doctorFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly onPrintStatement?: (() => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * DoctorShiftCashSection — Кассовый срез смены и инкассация (Мандат 54-ФЗ & 8e).
 *
 * Инварианты:
 * 1. Прозрачный кассовый срез по видам оплат: Наличные, Терминал (POS), СБП QR, Зачёт депозитов.
 * 2. Быстрая инкассация выручки в главную кассу/сейф клиники (100% или с сохранением размена).
 * 3. 0% эмодзи в кассовых и финансовых отчетах (Мандат 8e, Правило 7).
 * 4. Автономия врача: отсутствие искусственных блокировок, печать ведомости в 1 клик.
 */
export const DoctorShiftCashSection: React.FC<DoctorShiftCashSectionProps> = ({
	cashSummary,
	totalRevenueRub,
	doctorCommissionPct,
	estimatedDoctorPayoutRub,
	doctorFullName = "Лечащий врач",
	clinicName = "ООО «Денте Стоматология»",
	onPrintStatement,
	className = "",
}) => {
	// Fallback расчёт долей выручки при отсутствии детализированного среза
	const cashRub =
		cashSummary?.cashRub ?? Math.round(totalRevenueRub * 0.3);
	const cardRub =
		cashSummary?.cardRub ?? Math.round(totalRevenueRub * 0.45);
	const sbpRub =
		cashSummary?.sbpRub ?? Math.round(totalRevenueRub * 0.15);
	const depositRub =
		cashSummary?.depositRub ?? Math.round(totalRevenueRub * 0.1);
	const effectiveTotalRub =
		cashSummary?.totalRevenueRub ?? (cashRub + cardRub + sbpRub + depositRub);

	const [encashmentAmount, setEncashmentAmount] = useState<number>(cashRub);
	const [encashmentCompleted, setEncashmentCompleted] = useState<boolean>(false);
	const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

	const handleFullEncashment = () => {
		setEncashmentAmount(cashRub);
		setIsCustomMode(false);
	};

	const handleKeepFloat = (floatRub: number) => {
		const amt = Math.max(0, cashRub - floatRub);
		setEncashmentAmount(amt);
		setIsCustomMode(false);
	};

	const handleExecuteEncashment = () => {
		if (encashmentAmount <= 0) {
			showToast("Сумма инкассации должна быть больше 0 ₽", "warning");
			return;
		}

		StaffActionAuditService.logShiftClose({
			cashRegisterId: "main_cashier",
			shiftNumber: new Date().toLocaleDateString("ru-RU"),
			totalRevenueKopecks: Math.round(effectiveTotalRub * 100),
			closingCashKopecks: Math.round(encashmentAmount * 100),
		});

		setEncashmentCompleted(true);
		showToast(
			`Инкассация ${encashmentAmount.toLocaleString("ru-RU")} ₽ зафиксирована в кассовом журнале`,
			"info",
		);
	};

	const handleDefaultPrint = () => {
		if (onPrintStatement) {
			onPrintStatement();
			return;
		}

		printEncashmentStatement({
			doctorFullName,
			clinicName: clinicName || "Стоматологическая клиника",
			encashmentAmount,
			effectiveTotalRub,
			cashRub,
			cardRub,
			sbpRub,
			depositRub,
			doctorCommissionPct,
			estimatedDoctorPayoutRub,
		});
	};

	return (
		<section
			className={`doctor-shift-cash-section ${className}`.trim()}
			aria-label="Касса смены и инкассация"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				padding: "16px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
			data-testid="doctor-shift-cash-section"
		>
			{/* Top Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
					<div
						style={{
							width: "34px",
							height: "34px",
							borderRadius: "8px",
							background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
							color: "var(--teal-dark, #0f766e)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<Receipt size={17} aria-hidden="true" />
					</div>
					<div style={{ minWidth: 0 }}>
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--ink)",
								lineHeight: 1.25,
							}}
						>
							Касса смены и инкассация
						</h3>
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "12px",
								color: "var(--muted)",
								lineHeight: 1.35,
							}}
						>
							Сверка выручки по способам оплаты, выемка наличности в сейф и отчёт за смену
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					<span
						className="status-pill status-in_treatment"
						style={{
							fontSize: "11px",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<ShieldCheck size={12} aria-hidden="true" />
						Касса онлайн
					</span>
					<button
						type="button"
						onClick={handleDefaultPrint}
						className="secondary-button"
						style={{
							fontSize: "12px",
							fontWeight: 600,
							padding: "0 10px",
							height: "32px",
							borderRadius: "8px",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
						title="Распечатать сменную ведомость инкассации"
						data-testid="btn-print-cash-statement"
					>
						<Printer size={14} aria-hidden="true" />
						Ведомость смены
					</button>
				</div>
			</div>

			{/* 4 Payment Channel Metric Cards (Monochrome Luxury Base with 1 Brand Accent) */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
					gap: "8px",
				}}
			>
				{[
					{ label: "Наличные в кассе", amount: cashRub, hint: "Денежный ящик", icon: Banknote },
					{ label: "Банковские карты", amount: cardRub, hint: "POS-эквайринг", icon: CreditCard },
					{ label: "СБП по QR-коду", amount: sbpRub, hint: "Комиссия 0.4%", icon: QrCode },
					{ label: "Списание депозитов", amount: depositRub, hint: "Авансы пациентов", icon: Coins },
				].map((chan) => {
					const Icon = chan.icon;
					return (
						<div
							key={chan.label}
							style={{
								padding: "10px 12px",
								borderRadius: "8px",
								background: "var(--paper-soft)",
								border: "1px solid var(--line)",
								display: "flex",
								flexDirection: "column",
								gap: "2px",
							}}
						>
							<span
								style={{
									fontSize: "11px",
									fontWeight: 600,
									color: "var(--muted)",
									display: "flex",
									alignItems: "center",
									gap: "5px",
								}}
							>
								<Icon size={13} style={{ color: "var(--teal-dark, #0f766e)" }} aria-hidden="true" />
								{chan.label}
							</span>
							<strong style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
								{money(chan.amount)}
							</strong>
							<span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{chan.hint}</span>
						</div>
					);
				})}
			</div>

			{/* Encashment Action Row (Zero Nested Card-in-Card) */}
			<div
				style={{
					paddingTop: "12px",
					borderTop: "1px solid var(--line)",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Wallet size={15} className="text-teal-600" />
						<span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
							Инкассация наличной выручки в сейф / банк:
						</span>
						<strong style={{ fontSize: "14px", fontWeight: 800, color: "var(--teal-dark)" }}>
							{money(encashmentAmount)}
						</strong>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
						<button
							type="button"
							style={{
								fontSize: "11.5px",
								padding: "0 10px",
								height: "30px",
								borderRadius: "8px",
								fontWeight: encashmentAmount === cashRub && !isCustomMode ? 700 : 500,
								background: encashmentAmount === cashRub && !isCustomMode ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
								border: encashmentAmount === cashRub && !isCustomMode ? "1px solid var(--teal)" : "1px solid var(--line)",
								color: encashmentAmount === cashRub && !isCustomMode ? "var(--teal-dark, #0f766e)" : "var(--ink)",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								transition: "all 0.15s ease",
							}}
							onClick={handleFullEncashment}
						>
							100% наличности
						</button>
						<button
							type="button"
							style={{
								fontSize: "11.5px",
								padding: "0 10px",
								height: "30px",
								borderRadius: "8px",
								fontWeight: 500,
								background: "var(--paper)",
								border: "1px solid var(--line)",
								color: "var(--ink)",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								transition: "all 0.15s ease",
							}}
							onClick={() => handleKeepFloat(5000)}
						>
							Размен 5 000 ₽
						</button>
						<button
							type="button"
							style={{
								fontSize: "11.5px",
								padding: "0 10px",
								height: "30px",
								borderRadius: "8px",
								fontWeight: 500,
								background: "var(--paper)",
								border: "1px solid var(--line)",
								color: "var(--ink)",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								transition: "all 0.15s ease",
							}}
							onClick={() => handleKeepFloat(10000)}
						>
							Размен 10 000 ₽
						</button>
						<button
							type="button"
							style={{
								fontSize: "11.5px",
								padding: "0 10px",
								height: "30px",
								borderRadius: "8px",
								fontWeight: 600,
								background: isCustomMode ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
								border: isCustomMode ? "1px solid var(--teal)" : "1px solid var(--line)",
								color: isCustomMode ? "var(--teal-dark, #0f766e)" : "var(--ink)",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								transition: "all 0.15s ease",
							}}
							onClick={() => setIsCustomMode((v) => !v)}
						>
							{isCustomMode ? "Скрыть ввод" : "Другая сумма"}
						</button>
					</div>
				</div>

				{isCustomMode && (
					<div style={{ display: "flex", alignItems: "center", gap: "8px", maxWidth: "280px" }}>
						<label htmlFor="custom-encashment-input" className="sr-only">
							Сумма инкассации в рублях
						</label>
						<input
							id="custom-encashment-input"
							type="number"
							min={0}
							max={cashRub}
							step={100}
							value={encashmentAmount}
							onChange={(e) => setEncashmentAmount(Math.max(0, Number(e.target.value) || 0))}
							className="dente-input"
							style={{
								fontSize: "12px",
								padding: "4px 8px",
								height: "30px",
								width: "120px",
							}}
						/>
						<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
							из {money(cashRub)} доступных
						</span>
					</div>
				)}

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "10px",
						flexWrap: "wrap",
						paddingTop: "6px",
						borderTop: "1px solid var(--line)",
					}}
				>
					<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
						Остаток в денежном ящике на утро:{" "}
						<strong style={{ color: "var(--ink)" }}>
							{money(Math.max(0, cashRub - encashmentAmount))}
						</strong>
					</span>

					<button
						type="button"
						onClick={handleExecuteEncashment}
						className={`primary-button ${encashmentCompleted ? "secondary-button" : ""}`}
						style={{
							fontSize: "12px",
							padding: "5px 14px",
							minHeight: "32px",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
						data-testid="btn-execute-encashment"
					>
						{encashmentCompleted ? (
							<>
								<CheckCircle2 size={14} className="text-emerald-600" />
								<span>Инкассация зафиксирована</span>
							</>
						) : (
							<>
								<Lock size={14} />
								<span>Провести инкассацию {money(encashmentAmount)}</span>
							</>
						)}
					</button>
				</div>
			</div>
		</section>
	);
};
