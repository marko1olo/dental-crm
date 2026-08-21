/**
 * CashShiftWidget.tsx — Компонент управления кассовой сменой ККТ 54-ФЗ (Открытие/Закрытие, X/Z-отчеты, Сверка ящика).
 */

import React, { useState } from "react";
import {
	AlertCircle,
	ArrowDownRight,
	ArrowUpRight,
	Banknote,
	CheckCircle2,
	Clock,
	CreditCard,
	DollarSign,
	FileSpreadsheet,
	Lock,
	Printer,
	QrCode,
	RefreshCw,
	ShieldCheck,
	Unlock,
	User,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import "./CashShiftWidget.css";

export interface CashShiftWidgetProps {
	readonly initialIsOpen?: boolean;
	readonly shiftNumber?: number;
	readonly cashierName?: string;
	readonly cashInDrawerRub?: number;
	readonly cardSumRub?: number;
	readonly sbpSumRub?: number;
	readonly openedAt?: string;
	readonly onOpenShift?: () => void | Promise<void>;
	readonly onCloseShift?: () => void | Promise<void>;
	readonly onPrintXReport?: () => void | Promise<void>;
	readonly onPrintZReport?: () => void | Promise<void>;
}

function formatMoneyRu(value: number): string {
	return (
		value.toLocaleString("ru-RU", {
			minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

export const CashShiftWidget: React.FC<CashShiftWidgetProps> = ({
	initialIsOpen = true,
	shiftNumber = 42,
	cashierName = "Кассир-администратор",
	cashInDrawerRub = 24500,
	cardSumRub = 68000,
	sbpSumRub = 15400,
	openedAt = "08:00",
	onOpenShift,
	onCloseShift,
	onPrintXReport,
	onPrintZReport,
}) => {
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialIsOpen);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);

	const totalTurnoverRub = cashInDrawerRub + cardSumRub + sbpSumRub;

	const handleToggleShift = async () => {
		setIsProcessing(true);
		try {
			if (isShiftOpen) {
				if (onCloseShift) await onCloseShift();
				setIsShiftOpen(false);
				showToast(
					`Смена №${shiftNumber} успешно закрыта (Z-отчет снят). Выручка: ${formatMoneyRu(totalTurnoverRub)}`,
					"success",
					4000,
				);
			} else {
				if (onOpenShift) await onOpenShift();
				setIsShiftOpen(true);
				showToast(`Смена №${shiftNumber + 1} открыта на ККТ`, "success", 3000);
			}
		} catch {
			showToast("Ошибка связи с фискальным регистратором", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleXReport = async () => {
		setIsProcessing(true);
		try {
			if (onPrintXReport) await onPrintXReport();
			showToast(
				`X-отчет (промежуточный) напечатан: ${formatMoneyRu(totalTurnoverRub)}`,
				"info",
				3000,
			);
		} catch {
			showToast("Не удалось распечатать X-отчет", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleZReport = async () => {
		if (!isShiftOpen) {
			showToast("Смена уже закрыта", "warning");
			return;
		}
		setIsProcessing(true);
		try {
			if (onPrintZReport) await onPrintZReport();
			showToast("Итоговый Z-отчет сформирован и отправлен в ОФД", "success", 4000);
		} catch {
			showToast("Ошибка формирования Z-отчета", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="cash-shift-container" data-testid="cash-shift-widget">
			{/* Верхний заголовок и статус смены */}
			<div className="cash-shift-header">
				<div className="flex items-center gap-3">
					<div
						className={`cash-shift-status-icon ${
							isShiftOpen ? "cash-shift-status-open" : "cash-shift-status-closed"
						}`}
					>
						{isShiftOpen ? (
							<Unlock className="text-emerald-500" size={24} />
						) : (
							<Lock className="text-rose-500" size={24} />
						)}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-extrabold text-base sm:text-lg text-[var(--ink,#0f172a)]">
								Кассовая смена №{shiftNumber}
							</h3>
							<span
								className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
									isShiftOpen
										? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
										: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
								}`}
							>
								{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2 mt-0.5">
							<span>
								Кассир: <strong className="text-[var(--ink,#0f172a)]">{cashierName}</strong>
							</span>
							{isShiftOpen && (
								<>
									<span>·</span>
									<span className="flex items-center gap-1">
										<Clock size={12} /> Открыта с {openedAt}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				{/* Кнопка Открыть/Закрыть смену */}
				<button
					type="button"
					onClick={handleToggleShift}
					disabled={isProcessing}
					className={`cash-shift-btn min-h-[48px] px-5 text-sm font-bold shadow-md cursor-pointer ${
						isShiftOpen ? "cash-shift-btn-open" : "cash-shift-btn-closed"
					}`}
				>
					{isShiftOpen ? (
						<>
							<Lock size={16} />
							<span>Закрыть смену (Z-отчет)</span>
						</>
					) : (
						<>
							<Unlock size={16} />
							<span>Открыть смену</span>
						</>
					)}
				</button>
			</div>

			{/* Сетка финансовых показателей смены (54-ФЗ) */}
			<div className="cash-shift-grid">
				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<Banknote size={16} className="text-emerald-500" />
							Наличные в ящике
						</span>
						<span className="font-mono text-[10px]">Тег 1031</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
						{formatMoneyRu(cashInDrawerRub)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<CreditCard size={16} className="text-blue-500" />
							Эквайринг & Терминал
						</span>
						<span className="font-mono text-[10px]">Тег 1081</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
						{formatMoneyRu(cardSumRub)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<QrCode size={16} className="text-teal-500" />
							СБП / Плати QR
						</span>
						<span className="font-mono text-[10px]">НСПК</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
						{formatMoneyRu(sbpSumRub)}
					</div>
				</div>

				<div className="cash-shift-card">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1 font-semibold uppercase tracking-wider">
						<span className="flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-purple-500" />
							Общий оборот смены
						</span>
						<span className="font-mono text-[10px]">ОФД 54-ФЗ</span>
					</div>
					<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
						{formatMoneyRu(totalTurnoverRub)}
					</div>
				</div>
			</div>

			{/* Быстрые фискальные действия и отчеты ККТ */}
			<div className="cash-shift-actions">
				<button
					type="button"
					onClick={handleXReport}
					disabled={!isShiftOpen || isProcessing}
					className="cash-shift-actions-btn-primary min-h-[48px] text-sm font-bold cursor-pointer"
					title="Распечатать промежуточный X-отчет без гашения"
				>
					<Printer size={16} />
					<span>Печать X-отчета (без гашения)</span>
				</button>

				<button
					type="button"
					onClick={handleZReport}
					disabled={!isShiftOpen || isProcessing}
					className="cash-shift-actions-btn-icon min-h-[48px] min-w-[48px] cursor-pointer"
					title="Сформировать Z-отчет с гашением"
					aria-label="Сформировать Z-отчет с гашением"
				>
					<FileSpreadsheet size={18} />
				</button>
			</div>
		</div>
	);
};
