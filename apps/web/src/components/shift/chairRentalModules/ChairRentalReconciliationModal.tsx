import React from "react";
import { Printer, X } from "lucide-react";
import type { ChairRentalModel, ChairRentalResult } from "@dental/shared";

export interface ChairRentalReconciliationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName: string;
	readonly doctorFullName: string;
	readonly model: ChairRentalModel;
	readonly hoursWorked: number;
	readonly economics: ChairRentalResult;
	readonly formatRub: (val: number) => string;
	readonly modelLabels: Record<ChairRentalModel, string>;
	readonly actDocNumber: string;
	readonly todayDateStr: string;
}

export const ChairRentalReconciliationModal: React.FC<ChairRentalReconciliationModalProps> = ({
	isOpen,
	onClose,
	clinicName,
	doctorFullName,
	model,
	hoursWorked,
	economics,
	formatRub,
	modelLabels,
	actDocNumber,
	todayDateStr,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="chair-rental-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Акт сверки взаиморасчетов по субаренде кресла"
			data-testid="reconciliation-act-modal"
		>
			<div className="chair-rental-modal-container">
				<div className="chair-rental-modal-drag-handle" aria-hidden="true" />

				<div className="chair-rental-modal-header">
					<div>
						<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
							Акт сверки взаиморасчетов
						</h4>
						<span style={{ fontSize: "12px", color: "var(--muted)" }}>
							{actDocNumber} · {todayDateStr}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="chair-rental-act-btn"
						style={{ minWidth: "44px", minHeight: "44px", padding: 0 }}
						aria-label="Закрыть окно акта"
						data-testid="btn-close-act-modal"
					>
						<X size={18} />
					</button>
				</div>

				<div className="chair-rental-modal-body">
					{/* Printable Document Sheet (Zero Patient PII per 152-FZ) */}
					<div className="chair-rental-act-sheet" data-testid="printable-act-sheet">
						<div className="chair-rental-act-header-doc">
							<h2 className="chair-rental-act-title-doc">
								АКТ СВЕРКИ ВЗАИМОРАСЧЕТОВ ПО СУБАРЕНДЕ КРЕСЛА
							</h2>
							<div className="chair-rental-act-meta-row">
								<span>
									<strong>Арендодатель:</strong> {clinicName}
								</span>
								<span>
									<strong>Дата:</strong> {todayDateStr}
								</span>
							</div>
							<div className="chair-rental-act-meta-row" style={{ marginTop: "4px" }}>
								<span>
									<strong>Врач-субарендатор:</strong> {doctorFullName}
								</span>
								<span>
									<strong>Модель:</strong> {modelLabels[model]}
								</span>
							</div>
						</div>

						<div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
							Настоящий акт удостоверяет взаимные расчеты между клиникой и врачом-стоматологом за смену. Документ обезличен и не содержит персональных данных пациентов (ст. 7 Федерального закона № 152-ФЗ).
						</div>

						<table className="chair-rental-act-table">
							<thead>
								<tr>
									<th>Наименование статьи</th>
									<th>База / Параметр</th>
									<th style={{ textAlign: "right" }}>Сумма</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>Валовая выручка от оказанных услуг</td>
									<td>За смену ({hoursWorked} ч.)</td>
									<td className="amount">{formatRub(economics.grossRevenueRub)}</td>
								</tr>
								<tr>
									<td>Субаренда стоматологического кресла</td>
									<td>Модель: {modelLabels[model]}</td>
									<td className="amount amount-expense" style={{ color: "#e11d48" }}>
										−{formatRub(economics.rentExpenseRub)}
									</td>
								</tr>
								<tr>
									<td>Услуги зуботехнической лаборатории (ЗТЛ)</td>
									<td>Лабораторные наряды смены</td>
									<td className="amount amount-expense" style={{ color: "#e11d48" }}>
										−{formatRub(economics.labExpensesRub)}
									</td>
								</tr>
								<tr>
									<td>Расходные стоматологические материалы</td>
									<td>Прямое клиническое списание</td>
									<td className="amount amount-expense" style={{ color: "#e11d48" }}>
										−{formatRub(economics.consumablesRub)}
									</td>
								</tr>
								{economics.sterilizationExpensesRub > 0 && (
									<tr>
										<td>Стерилизация и крафт-пакеты (СанПиН 3.3686-21)</td>
										<td>Стерилизационный цикл инструментов</td>
										<td className="amount amount-expense" style={{ color: "#e11d48" }}>
											−{formatRub(economics.sterilizationExpensesRub)}
										</td>
									</tr>
								)}
								<tr className="total-row">
									<td colSpan={2}>ИТОГО К ВЫПЛАТЕ ВРАЧУ (ЧИСТЫЙ ДОХОД)</td>
									<td className="amount amount-profit" style={{ color: "#0f766e" }}>
										{formatRub(economics.netProfitRub)}
									</td>
								</tr>
							</tbody>
						</table>

						<div className="chair-rental-act-signatures">
							<div className="chair-rental-act-sign-box">
								<span>От Клиники-Арендодателя:</span>
								<div className="chair-rental-act-sign-line" />
								<span>М.П. / Главный врач</span>
							</div>
							<div className="chair-rental-act-sign-box">
								<span>Врач (субарендатор):</span>
								<div className="chair-rental-act-sign-line" />
								<span>{doctorFullName} / Подпись</span>
							</div>
						</div>
					</div>
				</div>

				<div className="chair-rental-modal-footer">
					<button
						type="button"
						className="chair-rental-act-btn"
						onClick={onClose}
						data-testid="btn-cancel-act-sheet"
					>
						<span>Закрыть</span>
					</button>

					<button
						type="button"
						className="chair-rental-act-btn"
						style={{
							background: "var(--teal)",
							color: "#fff",
							borderColor: "var(--teal)",
						}}
						onClick={() => {
							if (typeof window !== "undefined") {
								window.print();
							}
						}}
						data-testid="btn-confirm-print-act"
					>
						<Printer size={16} />
						<span>Печать акта на принтер</span>
					</button>
				</div>
			</div>
		</div>
	);
};
