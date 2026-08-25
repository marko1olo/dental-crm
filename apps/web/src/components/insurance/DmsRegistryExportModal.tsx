/**
 * DmsRegistryExportModal.tsx — Модальное окно экспорта ежемесячного реестра оказанных медицинских услуг по ДМС
 * в Excel/CSV и формирования печатного двустороннего акта сдачи-приемки.
 */

import {
	AlertCircle,
	ArrowDownToLine,
	Calendar,
	CheckCircle2,
	Download,
	Eye,
	FileSpreadsheet,
	FileText,
	Filter,
	Printer,
	Search,
	Shield,
	Users,
	X,
} from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import "./insurance.css";
import {
	calculateRegistryTotals,
	exportRegistryToCsv,
	formatRubKopecks,
	generateBilateralAcceptanceActHtml,
	RUSSIAN_DMS_INSURERS,
	type DmsRegistryServiceRecord,
	type DmsRegistrySummary,
} from "./insuranceMath";

export interface DmsRegistryExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly records?: readonly DmsRegistryServiceRecord[];
	readonly clinicInfo?: {
		readonly name: string;
		readonly inn: string;
		readonly kpp?: string;
		readonly ogrn?: string;
		readonly address: string;
		readonly chiefDoctor: string;
		readonly bankAccount?: string;
		readonly bic?: string;
		readonly corrAccount?: string;
	};
}

/** Демонстрационный набор оказанных услуг по ДМС для клиники */
const DEFAULT_SAMPLE_RECORDS: readonly DmsRegistryServiceRecord[] = [
	{
		id: "rec-1",
		visitId: "vis-101",
		visitDate: "2026-08-05",
		patientId: "pat-1",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "7701-982341",
		letterNumber: "ГП-44821",
		insurerName: "АО «СОГАЗ»",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		diagnosisCodeMkb10: "K02.1",
		toothNumber: 16,
		quantity: 1,
		unitPriceRub: 4500,
		totalPriceRub: 4500,
		dmsCoveredRub: 4500,
		patientPaidRub: 0,
		doctorFullName: "Петров А.В.",
		isExcluded: false,
	},
	{
		id: "rec-2",
		visitId: "vis-101",
		visitDate: "2026-08-05",
		patientId: "pat-1",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "7701-982341",
		letterNumber: "ГП-44821",
		insurerName: "АО «СОГАЗ»",
		serviceCode804n: "B01.003.004.001",
		serviceName: "Местная анестезия инфильтрационная",
		diagnosisCodeMkb10: "K02.1",
		toothNumber: 16,
		quantity: 1,
		unitPriceRub: 900,
		totalPriceRub: 900,
		dmsCoveredRub: 900,
		patientPaidRub: 0,
		doctorFullName: "Петров А.В.",
		isExcluded: false,
	},
	{
		id: "rec-3",
		visitId: "vis-102",
		visitDate: "2026-08-08",
		patientId: "pat-2",
		patientFullName: "Смирнова Елена Викторовна",
		policyNumber: "ИНГ-9921448",
		letterNumber: "ГП-88319",
		insurerName: "СПАО «Ингосстрах»",
		serviceCode804n: "A16.07.030.002",
		serviceName: "Инструментальная и медикаментозная обработка 2 каналов",
		diagnosisCodeMkb10: "K04.0",
		toothNumber: 24,
		quantity: 1,
		unitPriceRub: 5800,
		totalPriceRub: 5800,
		dmsCoveredRub: 4640,
		patientPaidRub: 1160, // Франшиза 20%
		doctorFullName: "Кузнецова М.И.",
		isExcluded: false,
	},
	{
		id: "rec-4",
		visitId: "vis-102",
		visitDate: "2026-08-08",
		patientId: "pat-2",
		patientFullName: "Смирнова Елена Викторовна",
		policyNumber: "ИНГ-9921448",
		letterNumber: "ГП-88319",
		insurerName: "СПАО «Ингосстрах»",
		serviceCode804n: "A16.07.008.002",
		serviceName: "Пломбирование 2 корневых каналов гуттаперчей",
		diagnosisCodeMkb10: "K04.0",
		toothNumber: 24,
		quantity: 1,
		unitPriceRub: 6700,
		totalPriceRub: 6700,
		dmsCoveredRub: 5360,
		patientPaidRub: 1340, // Франшиза 20%
		doctorFullName: "Кузнецова М.И.",
		isExcluded: false,
	},
	{
		id: "rec-5",
		visitId: "vis-103",
		visitDate: "2026-08-12",
		patientId: "pat-3",
		patientFullName: "Васильев Дмитрий Олегович",
		policyNumber: "РЕСО-772910",
		letterNumber: "ГП-12004",
		insurerName: "СПАО «РЕСО-Гарантия»",
		serviceCode804n: "A16.07.051",
		serviceName: "Профессиональная гигиена полости рта (комплекс AirFlow)",
		diagnosisCodeMkb10: "K05.1",
		quantity: 1,
		unitPriceRub: 6500,
		totalPriceRub: 6500,
		dmsCoveredRub: 6500,
		patientPaidRub: 0,
		doctorFullName: "Петров А.В.",
		isExcluded: false,
	},
	{
		id: "rec-6",
		visitId: "vis-104",
		visitDate: "2026-08-15",
		patientId: "pat-4",
		patientFullName: "Ковалева Анна Сергеевна",
		policyNumber: "АЛЬФА-551029",
		letterNumber: "ГП-33190",
		insurerName: "АО «АльфаСтрахование»",
		serviceCode804n: "A16.07.001.002",
		serviceName: "Сложное удаление зуба с разъединением корней",
		diagnosisCodeMkb10: "K04.5",
		toothNumber: 38,
		quantity: 1,
		unitPriceRub: 5900,
		totalPriceRub: 5900,
		dmsCoveredRub: 5900,
		patientPaidRub: 0,
		doctorFullName: "Соколов В.Д.",
		isExcluded: false,
	},
	{
		id: "rec-7",
		visitId: "vis-105",
		visitDate: "2026-08-18",
		patientId: "pat-5",
		patientFullName: "Николаев Роман Павлович",
		policyNumber: "ВСК-8812903",
		insurerName: "САО «ВСК»",
		serviceCode804n: "A16.07.004",
		serviceName: "Коронка металлокерамическая (протезирование)",
		diagnosisCodeMkb10: "K08.1",
		toothNumber: 46,
		quantity: 1,
		unitPriceRub: 18500,
		totalPriceRub: 18500,
		dmsCoveredRub: 0,
		patientPaidRub: 18500,
		doctorFullName: "Михайлов К.Е.",
		isExcluded: true,
		exclusionReason: "Ортопедическое протезирование исключено из программы ДМС",
	},
];

export function DmsRegistryExportModal({
	isOpen,
	onClose,
	records = DEFAULT_SAMPLE_RECORDS,
	clinicInfo = {
		name: 'ООО «Стоматологический Центр «ДЕНТЕ»',
		inn: "7701984210",
		kpp: "770101001",
		ogrn: "1157746890123",
		address: "г. Москва, ул. Большая Спасская, д. 12, стр. 1",
		chiefDoctor: "Д-р Смирнов А.А.",
		bankAccount: "40702810400000012345",
		bic: "044525225",
		corrAccount: "30101810400000000225",
	},
}: DmsRegistryExportModalProps) {
	const filterInsurerSelectId = useId();
	const filterPeriodSelectId = useId();
	const searchRecordInputId = useId();
	const contractNumberInputId = useId();
	const contractDateInputId = useId();
	const representativeInputId = useId();
	const actNumberInputId = useId();

	// Фильтры
	const [selectedInsurer, setSelectedInsurer] = useState<string>("all");
	const [periodFilter, setPeriodFilter] = useState<string>("current_month");
	const [searchFilter, setSearchFilter] = useState<string>("");

	// Режим предпросмотра печатного акта
	const [isPreviewActOpen, setIsPreviewActOpen] = useState<boolean>(false);
	const [actNumber, setActNumber] = useState<string>(`АКТ-${new Date().getFullYear()}-08/1`);
	const [actDate, setActDate] = useState<string>(new Date().toLocaleDateString("ru-RU"));
	const [contractNumber, setContractNumber] = useState<string>("ДМС-2026/01");
	const [contractDate, setContractDate] = useState<string>("12.01.2026");
	const [representative, setRepresentative] = useState<string>("Руководитель управления мед. страхования");

	if (!isOpen) return null;

	// Отфильтрованные записи
	const filteredRecords = records.filter((rec) => {
		if (selectedInsurer !== "all" && rec.insurerName !== selectedInsurer) {
			return false;
		}
		if (searchFilter.trim()) {
			const q = searchFilter.toLowerCase();
			const match =
				rec.patientFullName.toLowerCase().includes(q) ||
				rec.policyNumber.toLowerCase().includes(q) ||
				rec.serviceName.toLowerCase().includes(q) ||
				rec.serviceCode804n.toLowerCase().includes(q);
			if (!match) return false;
		}
		return true;
	});

	const periodDisplay =
		periodFilter === "current_month"
			? "Август 2026 г."
			: periodFilter === "prev_month"
				? "Июль 2026 г."
				: "3 квартал 2026 г.";

	const summary: DmsRegistrySummary = calculateRegistryTotals(
		filteredRecords,
		selectedInsurer === "all" ? "Все страховые компании" : selectedInsurer,
		"01.08.2026",
		"31.08.2026",
	);

	// Экспорт в CSV (Excel)
	const handleExportCsv = () => {
		if (filteredRecords.length === 0) {
			showToast("Нет записей для экспорта по выбранным фильтрам", "warning");
			return;
		}
		const csvContent = exportRegistryToCsv(
			filteredRecords,
			clinicInfo,
			selectedInsurer === "all" ? "Все компании" : selectedInsurer,
			periodDisplay,
		);

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const filename = `DMS_Registry_${selectedInsurer.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showToast(`Реестр ДМС (${filteredRecords.length} услуг) успешно экспортирован в CSV/Excel`, "success");
	};

	// Печать двустороннего акта сдачи-приемки
	const handlePrintAct = () => {
		const actHtml = generateBilateralAcceptanceActHtml({
			records: filteredRecords,
			summary,
			clinicInfo,
			insurerInfo: {
				name: selectedInsurer === "all" ? "Страховая компания ДМС" : selectedInsurer,
				contractNumber,
				contractDate,
				representative,
			},
			actNumber,
			actDate,
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(actHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 350);
		} else {
			showToast("Разрешите всплывающие окна для печати акта", "warning");
		}
	};

	return createPortal(
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div
				className="dms-modal-window"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: "1140px" }}
			>
				{/* Header */}
				<div className="dms-modal-header">
					<h2 className="dms-modal-title">
						<FileSpreadsheet className="text-[var(--ok-fg,#059669)]" size={24} />
						Реестр медицинских услуг ДМС и двусторонний акт сдачи-приемки
					</h2>
					<button
						type="button"
						className="dms-btn dms-btn-secondary dms-btn-icon"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="dms-modal-body">
					{/* Фильтры и панель управления */}
					<div className="dms-card">
						<div className="dms-grid-3">
							<div className="dms-field-group">
								<label htmlFor={filterInsurerSelectId} className="dms-label">Страховая компания (ДМС)</label>
								<select
									id={filterInsurerSelectId}
									value={selectedInsurer}
									onChange={(e) => setSelectedInsurer(e.target.value)}
									className="dms-select"
								>
									<option value="all">Все страховые компании (Сводный отчет)</option>
									{RUSSIAN_DMS_INSURERS.map((ins) => (
										<option key={ins.key} value={ins.shortName}>
											{ins.shortName}
										</option>
									))}
								</select>
							</div>

							<div className="dms-field-group">
								<label htmlFor={filterPeriodSelectId} className="dms-label">Отчетный период</label>
								<select
									id={filterPeriodSelectId}
									value={periodFilter}
									onChange={(e) => setPeriodFilter(e.target.value)}
									className="dms-select"
								>
									<option value="current_month">Текущий месяц (Август 2026)</option>
									<option value="prev_month">Предыдущий месяц (Июль 2026)</option>
									<option value="quarter">3 квартал 2026 года</option>
								</select>
							</div>

							<div className="dms-field-group">
								<label htmlFor={searchRecordInputId} className="dms-label">Поиск по пациенту, полису или услуге</label>
								<div style={{ position: "relative" }}>
									<Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "var(--muted, #64748b)" }} />
									<input
										id={searchRecordInputId}
										type="text"
										placeholder="ФИО, полис, код 804н..."
										value={searchFilter}
										onChange={(e) => setSearchFilter(e.target.value)}
										className="dms-input"
										style={{ paddingLeft: "42px" }}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Сводные финансовые показатели (Summary Cards) */}
					<div className="dms-stats-row">
						<div className="dms-stat-card">
							<span className="dms-stat-label">Всего услуг в реестре</span>
							<span className="dms-stat-value">{summary.totalServicesCount}</span>
							<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Пациентов: {summary.uniquePatientsCount}
							</span>
						</div>

						<div className="dms-stat-card">
							<span className="dms-stat-label">Общая стоимость (Всего)</span>
							<span className="dms-stat-value">{formatRubKopecks(summary.totalAmountRub)}</span>
							<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								По тарифам клиники
							</span>
						</div>

						<div className="dms-stat-card" style={{ borderColor: "#10b981", background: "rgba(16, 185, 129, 0.04)" }}>
							<span className="dms-stat-label">К оплате страховой (ДМС)</span>
							<span className="dms-stat-value text-[var(--ok-fg,#059669)]">
								{formatRubKopecks(summary.totalDmsCoveredRub)}
							</span>
							<span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
								Покрыто по договорам ДМС
							</span>
						</div>

						<div className="dms-stat-card" style={{ borderColor: "#f59e0b", background: "rgba(245, 158, 11, 0.04)" }}>
							<span className="dms-stat-label">Оплачено пациентами (Copay)</span>
							<span className="dms-stat-value text-[var(--warn-fg,#d97706)]">
								{formatRubKopecks(summary.totalPatientPaidRub)}
							</span>
							<span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600 }}>
								Франшизы и исключения
							</span>
						</div>
					</div>

					{/* Балансовая проверка */}
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: "12px", background: summary.isBalanced ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${summary.isBalanced ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}` }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<CheckCircle2 size={18} className={summary.isBalanced ? "text-[var(--ok-fg,#059669)]" : "text-[var(--bad-fg,#dc2626)]"} />
							<span style={{ fontSize: "0.875rem", fontWeight: 700, color: summary.isBalanced ? "#059669" : "#dc2626" }}>
								{summary.isBalanced
									? `Копеечный баланс сошелся на 100%: ${formatRubKopecks(summary.totalDmsCoveredRub)} (ДМС) + ${formatRubKopecks(summary.totalPatientPaidRub)} (Пациенты) = ${formatRubKopecks(summary.totalAmountRub)} (Итого)`
									: "Внимание: Обнаружено расхождение в распределении копеек!"}
							</span>
						</div>
						<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
							Период: {periodDisplay}
						</div>
					</div>

					{/* Таблица реестра */}
					<div className="dms-table-container">
						<table className="dms-table">
							<thead>
								<tr>
									<th>№</th>
									<th>Дата</th>
									<th>Пациент</th>
									<th>Полис / ГП</th>
									<th>Страховщик</th>
									<th>Код 804н</th>
									<th>Услуга / Зуб</th>
									<th style={{ textAlign: "right" }}>Сумма всего</th>
									<th style={{ textAlign: "right" }}>Покрыто ДМС</th>
									<th style={{ textAlign: "right" }}>Доплата (Copay)</th>
									<th>Статус</th>
								</tr>
							</thead>
							<tbody>
								{filteredRecords.map((r, i) => (
									<tr key={r.id}>
										<td>{i + 1}</td>
										<td style={{ whiteSpace: "nowrap" }}>{r.visitDate}</td>
										<td style={{ fontWeight: 600 }}>{r.patientFullName}</td>
										<td>
											<div style={{ fontSize: "0.8125rem" }}>{r.policyNumber}</div>
											{r.letterNumber && (
												<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{r.letterNumber}</div>
											)}
										</td>
										<td style={{ fontSize: "0.8125rem" }}>{r.insurerName}</td>
										<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }}>
											{r.serviceCode804n}
										</td>
										<td>
											<div>{r.serviceName}</div>
											{r.toothNumber && (
												<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Зуб {r.toothNumber}</span>
											)}
										</td>
										<td style={{ textAlign: "right", fontWeight: 600 }}>
											{formatRubKopecks(r.totalPriceRub)}
										</td>
										<td style={{ textAlign: "right", fontWeight: 700, color: "#10b981" }}>
											{formatRubKopecks(r.dmsCoveredRub)}
										</td>
										<td style={{ textAlign: "right", fontWeight: 600, color: r.patientPaidRub > 0 ? "#f59e0b" : "var(--muted, #64748b)" }}>
											{formatRubKopecks(r.patientPaidRub)}
										</td>
										<td>
											{r.isExcluded ? (
												<span className="dms-badge dms-badge-expired" title={r.exclusionReason}>
													Исключение
												</span>
											) : (
												<span className="dms-badge dms-badge-active">
													Покрыто
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="dms-table-totals">
									<td colSpan={7} style={{ textAlign: "right", fontWeight: 700 }}>ИТОГО К ВЗАИМОРАСЧЕТАМ:</td>
									<td style={{ textAlign: "right", fontWeight: 800 }}>{formatRubKopecks(summary.totalAmountRub)}</td>
									<td style={{ textAlign: "right", fontWeight: 800, color: "#10b981", fontSize: "0.9375rem" }}>
										{formatRubKopecks(summary.totalDmsCoveredRub)}
									</td>
									<td style={{ textAlign: "right", fontWeight: 800, color: "#f59e0b" }}>
										{formatRubKopecks(summary.totalPatientPaidRub)}
									</td>
									<td></td>
								</tr>
							</tfoot>
						</table>
					</div>

					{/* Настройки двустороннего акта сдачи-приемки */}
					<div className="dms-card">
						<h3 className="dms-card-title">
							<FileText size={18} className="text-sky-600" />
							Параметры двустороннего акта сдачи-приемки по ДМС
						</h3>

						<div className="dms-grid-3">
							<div className="dms-field-group">
								<label htmlFor={actNumberInputId} className="dms-label">Номер акта сдачи-приемки</label>
								<input
									id={actNumberInputId}
									type="text"
									value={actNumber}
									onChange={(e) => setActNumber(e.target.value)}
									className="dms-input"
								/>
							</div>

							<div className="dms-field-group">
								<label htmlFor={contractNumberInputId} className="dms-label">Номер договора ДМС со страховой</label>
								<input
									id={contractNumberInputId}
									type="text"
									value={contractNumber}
									onChange={(e) => setContractNumber(e.target.value)}
									className="dms-input"
								/>
							</div>

							<div className="dms-field-group">
								<label htmlFor={contractDateInputId} className="dms-label">Дата договора ДМС</label>
								<input
									id={contractDateInputId}
									type="text"
									value={contractDate}
									onChange={(e) => setContractDate(e.target.value)}
									className="dms-input"
								/>
							</div>
						</div>

						<div className="dms-grid-2" style={{ marginTop: "12px" }}>
							<div className="dms-field-group">
								<label htmlFor={representativeInputId} className="dms-label">Представитель страховой компании (для подписи)</label>
								<input
									id={representativeInputId}
									type="text"
									value={representative}
									onChange={(e) => setRepresentative(e.target.value)}
									className="dms-input"
								/>
							</div>

							<div className="dms-field-group">
								<span className="dms-label">Реквизиты клиники (Исполнитель)</span>
								<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", padding: "10px", background: "var(--paper, #fff)", borderRadius: "10px", border: "1px solid var(--line, #cbd5e1)" }}>
									{clinicInfo.name} &bull; ИНН: {clinicInfo.inn} &bull; Гл. врач: {clinicInfo.chiefDoctor}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="dms-modal-footer" style={{ justifyContent: "space-between" }}>
					<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
						Строк в реестре: <strong>{filteredRecords.length}</strong>
					</div>

					<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
						<button
							type="button"
							className="dms-btn dms-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>

						<button
							type="button"
							className="dms-btn dms-btn-secondary"
							onClick={handleExportCsv}
							title="1-клик экспорт в CSV/Excel (с кодировкой UTF-8 BOM и точкой с запятой)"
						>
							<Download size={18} />
							Экспорт в Excel (CSV)
						</button>

						<button
							type="button"
							className="dms-btn dms-btn-primary"
							onClick={handlePrintAct}
							title="Сформировать печатный двусторонний акт сдачи-приемки оказанных услуг"
						>
							<Printer size={18} />
							Печать Двустороннего Акта
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
