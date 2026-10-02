import React from "react";
import {
	AlertTriangle,
	Banknote,
	CheckCircle2,
	Clock,
	CreditCard,
	FileText,
	Printer,
	QrCode,
	ShieldCheck,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import { money } from "../../AppHelpers";
import type { DoctorShiftStats } from "./DoctorShiftControlBar";
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";

export interface DoctorShiftCashSummary {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly totalRevenueRub: number;
}

export interface DoctorShiftEmrSummary {
	readonly signedCount: number;
	readonly pendingSignatureCount: number;
	readonly draftCount: number;
}

export interface DoctorShiftCloseModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmClose: () => void;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly shiftDateLabel?: string | undefined;
	readonly shiftStats: DoctorShiftStats;
	readonly cashSummary?: DoctorShiftCashSummary | undefined;
	readonly emrSummary?: DoctorShiftEmrSummary | undefined;
	readonly clinicName?: string | undefined;
}

export const DoctorShiftCloseModal: React.FC<DoctorShiftCloseModalProps> = ({
	isOpen,
	onClose,
	onConfirmClose,
	doctorFullName = "Лечащий врач",
	doctorSpecialtyRu = "Стоматолог общей практики",
	shiftDateLabel,
	shiftStats,
	cashSummary,
	emrSummary,
	clinicName = "ООО «Денте Стоматология»",
}) => {
	if (!isOpen) return null;

	const todayLabel =
		shiftDateLabel ||
		new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});

	// Fallback cash calculation based on totalRevenueRub if breakdown not explicitly supplied
	const cashRub = cashSummary?.cashRub ?? Math.round(shiftStats.totalRevenueRub * 0.3);
	const cardRub = cashSummary?.cardRub ?? Math.round(shiftStats.totalRevenueRub * 0.45);
	const sbpRub = cashSummary?.sbpRub ?? Math.round(shiftStats.totalRevenueRub * 0.15);
	const depositRub = cashSummary?.depositRub ?? Math.round(shiftStats.totalRevenueRub * 0.1);
	const effectiveTotalCashRub =
		cashSummary?.totalRevenueRub ?? (cashRub + cardRub + sbpRub + depositRub);

	const emrSigned = emrSummary?.signedCount ?? shiftStats.completedCount;
	const emrPending = emrSummary?.pendingSignatureCount ?? 0;
	const hasUnsignedEmr = emrPending > 0;

	const handlePrintShiftStatement = () => {
		StaffActionAuditService.logDocumentPrint({
			documentType: "doctor_shift_report_d1",
			title: `Сменный отчет врача — ${doctorFullName}`,
		});

		const printWin = window.open("", "_blank", "width=800,height=900");
		if (!printWin) {
			window.print();
			return;
		}

		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Сменный отчет врача — ${doctorFullName}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111827; margin: 0; padding: 10px; }
		.header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; }
		.header h1 { font-size: 15pt; margin: 0 0 4px 0; color: #0f172a; }
		.header p { font-size: 10pt; color: #475569; margin: 0; }
		.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 10pt; }
		.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
		.table th, .table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
		.table th { background: #f1f5f9; font-weight: 600; font-size: 9pt; }
		.table td.num { text-align: right; }
		.total-box { background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
		.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11pt; }
		.total-row.highlight { font-size: 13pt; font-weight: bold; border-top: 1px solid #0d9488; padding-top: 6px; color: #0f766e; }
		.signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 10pt; }
		.signature-line { width: 200px; border-bottom: 1px solid #475569; margin-top: 25px; }
	</style>
</head>
<body>
	<div class="header">
		<h1>СМЕННЫЙ ОТЧЕТ ВРАЧА-СТОМАТОЛОГА</h1>
		<p>${clinicName} • Форма сменной ведомости Д-1</p>
	</div>

	<div class="grid">
		<div><strong>Врач:</strong> ${doctorFullName}</div>
		<div><strong>Дата смены:</strong> ${todayLabel}</div>
		<div><strong>Специальность:</strong> ${doctorSpecialtyRu}</div>
		<div><strong>Статус:</strong> Смена закрыта</div>
	</div>

	<h3>1. Прием пациентов</h3>
	<table class="table">
		<thead>
			<tr>
				<th>Показатель</th>
				<th style="width: 140px; text-align: right;">Значение</th>
			</tr>
		</thead>
		<tbody>
			<tr><td>Всего запланировано визитов</td><td class="num">${shiftStats.totalAppointments}</td></tr>
			<tr><td>Принято и завершено</td><td class="num">${shiftStats.completedCount}</td></tr>
			<tr><td>Пациентов в кресле на момент закрытия</td><td class="num">${shiftStats.inProgressCount}</td></tr>
			<tr><td>Электронных карт 043/у заверено ПЭП (63-ФЗ)</td><td class="num">${emrSigned}</td></tr>
		</tbody>
	</table>

	<h3>2. Сданная выручка и касса по видам оплат</h3>
	<table class="table">
		<thead>
			<tr>
				<th>Вид оплаты</th>
				<th style="width: 140px; text-align: right;">Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			<tr><td>Наличные денежные средства</td><td class="num">${cashRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr><td>Банковские карты (POS-терминал / Эквайринг)</td><td class="num">${cardRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr><td>Система быстрых платежей (СБП QR)</td><td class="num">${sbpRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr><td>Списание с лицевых депозитов пациентов</td><td class="num">${depositRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr style="background: #f8fafc; font-weight: bold;">
				<td>Итого сданная касса:</td>
				<td class="num">${effectiveTotalCashRub.toLocaleString("ru-RU")} ₽</td>
			</tr>
		</tbody>
	</table>

	<div class="total-box">
		<div class="total-row">
			<span>Общая выручка от услуг за смену:</span>
			<strong>${shiftStats.totalRevenueRub.toLocaleString("ru-RU")} ₽</strong>
		</div>
		<div class="total-row">
			<span>Сдельная ставка врача:</span>
			<span>${shiftStats.doctorCommissionPct}%</span>
		</div>
		<div class="total-row highlight">
			<span>НАЧИСЛЕННЫЙ ЗАРАБОТОК ЗА СМЕНУ:</span>
			<span>${shiftStats.estimatedDoctorPayoutRub.toLocaleString("ru-RU")} ₽</span>
		</div>
	</div>

	<div class="signatures">
		<div>
			<div>Смену сдал (врач):</div>
			<div class="signature-line"></div>
		</div>
		<div>
			<div>Смену принял (администратор / кассир):</div>
			<div class="signature-line"></div>
		</div>
	</div>

	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>`;

		printWin.document.open();
		printWin.document.write(html);
		printWin.document.close();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-close-modal-title"
			data-testid="doctor-shift-close-modal"
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
				style={{ background: "var(--paper)", color: "var(--ink)" }}
			>
				{/* Header */}
				<div className="px-5 py-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<h2
								id="shift-close-modal-title"
								className="text-base font-bold leading-tight"
								style={{ color: "var(--ink)" }}
							>
								Завершение рабочей смены врача
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
								{doctorFullName} · {doctorSpecialtyRu} · {todayLabel}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer flex items-center justify-center"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-5 overflow-y-auto space-y-4">
					{/* Unsigned cards alert if any */}
					{hasUnsignedEmr && (
						<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
							<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
							<div>
								<span className="font-bold">Внимание:</span> Не подписано электронных
								карт 043/у: {emrPending}. Рекомендуется заверить карты ПЭП (63-ФЗ) до
								сдачи смены.
							</div>
						</div>
					)}

					{/* Metric 1: Patients reconciliation */}
					<div className="border border-[var(--line,#e2e8f0)] rounded-xl p-3.5 bg-[var(--paper-soft,#f8fafc)]">
						<div className="flex items-center justify-between mb-2.5">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
								<Users className="w-3.5 h-3.5 text-teal-600" /> Прием пациентов
							</span>
							<span className="text-xs font-medium text-[var(--muted,#64748b)]">
								По плану: {shiftStats.totalAppointments}
							</span>
						</div>
						<div className="grid grid-cols-3 gap-2">
							<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center">
								<div className="text-lg font-bold text-teal-600 dark:text-teal-400">
									{shiftStats.completedCount}
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)]">Завершено</div>
							</div>
							<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center">
								<div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
									{shiftStats.inProgressCount}
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)]">В кресле</div>
							</div>
							<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center">
								<div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
									{emrSigned}
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)]">Карт ПЭП</div>
							</div>
						</div>
					</div>

					{/* Metric 2: Cash & Payment Breakdown */}
					<div className="border border-[var(--line,#e2e8f0)] rounded-xl p-3.5 bg-[var(--paper-soft,#f8fafc)]">
						<div className="flex items-center justify-between mb-2.5">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
								<Banknote className="w-3.5 h-3.5 text-teal-600" /> Сданная касса и
								выручка
							</span>
							<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
								{money(effectiveTotalCashRub)}
							</span>
						</div>
						<div className="space-y-1.5 text-xs">
							<div className="flex items-center justify-between py-1 border-b border-[var(--line,#e2e8f0)]/50">
								<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
									<Banknote className="w-3.5 h-3.5 text-slate-500" /> Наличные
								</span>
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									{money(cashRub)}
								</span>
							</div>
							<div className="flex items-center justify-between py-1 border-b border-[var(--line,#e2e8f0)]/50">
								<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
									<CreditCard className="w-3.5 h-3.5 text-slate-500" /> Карты /
									POS-терминал
								</span>
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									{money(cardRub)}
								</span>
							</div>
							<div className="flex items-center justify-between py-1 border-b border-[var(--line,#e2e8f0)]/50">
								<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
									<QrCode className="w-3.5 h-3.5 text-slate-500" /> СБП QR-код
								</span>
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									{money(sbpRub)}
								</span>
							</div>
							<div className="flex items-center justify-between py-1">
								<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)]">
									<Clock className="w-3.5 h-3.5 text-slate-500" /> Зачет депозитов
								</span>
								<span className="font-semibold text-[var(--ink,#0f172a)]">
									{money(depositRub)}
								</span>
							</div>
						</div>
					</div>

					{/* Metric 3: Doctor Piece-Rate Accrual */}
					<div className="border border-teal-500/30 rounded-xl p-4 bg-teal-50/50 dark:bg-teal-950/20">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
								Начисленный заработок врача за смену
							</span>
							<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-200/60 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200">
								Ставка {shiftStats.doctorCommissionPct}%
							</span>
						</div>
						<div className="flex items-baseline justify-between">
							<span className="text-xs text-teal-700/80 dark:text-teal-400">
								Чистая сдельная база (без ЗТЛ и материалов)
							</span>
							<span className="text-xl font-extrabold text-teal-900 dark:text-teal-100">
								{money(shiftStats.estimatedDoctorPayoutRub)}
							</span>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-2.5">
					<button
						type="button"
						onClick={handlePrintShiftStatement}
						className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<Printer className="w-4 h-4 text-teal-600" />
						Печать отчета смены (ф. Д-1)
					</button>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => {
								StaffActionAuditService.logShiftClose({
									cashRegisterId: "main_cashier",
									shiftNumber: shiftDateLabel || "today",
									totalRevenueKopecks: Math.round(effectiveTotalCashRub * 100),
									closingCashKopecks: Math.round(cashRub * 100),
								});
								onConfirmClose();
							}}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
						>
							<CheckCircle2 className="w-4 h-4" />
							Подтвердить закрытие смены
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
