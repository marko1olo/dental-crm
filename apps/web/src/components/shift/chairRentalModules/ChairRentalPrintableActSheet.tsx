import React from "react";
import type { ChairRentalModel, ChairRentalResult } from "@dental/shared";

export interface ChairRentalPrintableActSheetProps {
	readonly clinicName: string;
	readonly doctorFullName: string;
	readonly model: ChairRentalModel;
	readonly hoursWorked: number;
	readonly economics: ChairRentalResult;
	readonly formatRub: (val: number) => string;
	readonly modelLabels: Record<ChairRentalModel, string>;
	readonly todayDateStr: string;
}

export const ChairRentalPrintableActSheet: React.FC<ChairRentalPrintableActSheetProps> = ({
	clinicName,
	doctorFullName,
	model,
	hoursWorked,
	economics,
	formatRub,
	modelLabels,
	todayDateStr,
}) => (
	<div className="chair-rental-act-sheet" data-testid="printable-act-sheet">
		<div className="chair-rental-act-header-doc">
			<h2 className="chair-rental-act-title-doc">АКТ СВЕРКИ ВЗАИМОРАСЧЕТОВ ПО СУБАРЕНДЕ КРЕСЛА</h2>
			<div className="chair-rental-act-meta-row">
				<span><strong>Арендодатель:</strong> {clinicName}</span>
				<span><strong>Дата:</strong> {todayDateStr}</span>
			</div>
			<div className="chair-rental-act-meta-row" style={{ marginTop: "4px" }}>
				<span><strong>Врач-субарендатор:</strong> {doctorFullName}</span>
				<span><strong>Модель:</strong> {modelLabels[model]}</span>
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
					<td className="amount amount-expense" style={{ color: "#e11d48" }}>−{formatRub(economics.rentExpenseRub)}</td>
				</tr>
				<tr>
					<td>Услуги зуботехнической лаборатории (ЗТЛ)</td>
					<td>Лабораторные наряды смены</td>
					<td className="amount amount-expense" style={{ color: "#e11d48" }}>−{formatRub(economics.labExpensesRub)}</td>
				</tr>
				<tr>
					<td>Расходные стоматологические материалы</td>
					<td>Прямое клиническое списание</td>
					<td className="amount amount-expense" style={{ color: "#e11d48" }}>−{formatRub(economics.consumablesRub)}</td>
				</tr>
				{economics.sterilizationExpensesRub > 0 && (
					<tr>
						<td>Стерилизация и крафт-пакеты (СанПиН 3.3686-21)</td>
						<td>Стерилизационный цикл инструментов</td>
						<td className="amount amount-expense" style={{ color: "#e11d48" }}>−{formatRub(economics.sterilizationExpensesRub)}</td>
					</tr>
				)}
				<tr className="total-row">
					<td colSpan={2}>ИТОГО К ВЫПЛАТЕ ВРАЧУ (ЧИСТЫЙ ДОХОД)</td>
					<td className="amount amount-profit" style={{ color: "#0f766e" }}>{formatRub(economics.netProfitRub)}</td>
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
);
