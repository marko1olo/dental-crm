/**
 * apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx
 *
 * Компактный журнал стерилизации и крафт-пакетов (СанПиН 3.3686-21, Форма 257/у).
 * - Учет циклов автоклавирования: 134°C, 2.1 бар, 5 мин (Режим B).
 * - Химический индикатор 4/5 класса с визуальным доказательством изменения цвета (бежевый -> темно-коричневый, Норма).
 * - Быстрый вызов сканера крафт-пакетов у кресла (SterilizationScanner).
 * - Экспорт и печать официальной Формы 257/у (А4).
 * - Запрет на «детские» эмодзи, строгий клинический дизайн, плотность 32-36px.
 */

import React, { useState, useMemo } from "react";
import {
	Printer,
	QrCode,
	Search,
	FileText,
	CheckCircle2,
	AlertTriangle,
	Sparkles,
	Filter,
	Download,
	Calendar,
	Thermometer,
	Gauge,
	Timer,
	X,
	ArrowRight,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { SterilizationScanner } from "./SterilizationScanner";
import {
	handleGenerateMonthlyForm257,
	handlePrintSinglePouch,
} from "./AutoclavePrintHelpers";
import { loadSavedClinicAutoclaves } from "./AutoclaveEquipmentModal";
import type { SterilizationLogRecord } from "@dental/shared";

export interface SanPinCycleEntry {
	id: string;
	date: string;
	time: string;
	cycleNumber: number;
	autoclaveCode: string;
	autoclaveModel: string;
	temperatureC: number;
	pressureBar: number;
	durationMin: number;
	regimeName: string;
	indicatorClass: "4" | "5" | "6";
	colorBefore: string;
	colorBeforeHex: string;
	colorAfter: string;
	colorAfterHex: string;
	isIndicatorNorm: boolean;
	pouchCodes: string[];
	itemsSummary: string;
	operatorName: string;
	status: "passed" | "warning" | "failed";
}

const DEFAULT_CYCLES: SanPinCycleEntry[] = [
	{
		id: "cyc-2026-10-08-03",
		date: "2026-10-08",
		time: "08:30",
		cycleNumber: 3,
		autoclaveCode: "АК-01",
		autoclaveModel: "Melag Vacuklav 23B+",
		temperatureC: 134.4,
		pressureBar: 2.15,
		durationMin: 5,
		regimeName: "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: "5",
		colorBefore: "Бежевый",
		colorBeforeHex: "#d4b896",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
		isIndicatorNorm: true,
		pouchCodes: ["KP-84920", "KP-84921", "KB2608250001"],
		itemsSummary: "Наконечники турбинные NSK Ti-Max, лотки терапевтические, боры",
		operatorName: "Иванова А. С. (ЦСО)",
		status: "passed",
	},
	{
		id: "cyc-2026-10-08-02",
		date: "2026-10-08",
		time: "07:45",
		cycleNumber: 2,
		autoclaveCode: "АК-01",
		autoclaveModel: "Melag Vacuklav 23B+",
		temperatureC: 134.1,
		pressureBar: 2.12,
		durationMin: 5,
		regimeName: "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: "5",
		colorBefore: "Бежевый",
		colorBeforeHex: "#d4b896",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
		isIndicatorNorm: true,
		pouchCodes: ["КП-0925-14", "КП-0925-15"],
		itemsSummary: "Хирургические элеваторы, пинцеты, шприцы карпульные стерильные",
		operatorName: "Иванова А. С. (ЦСО)",
		status: "passed",
	},
	{
		id: "cyc-2026-10-07-04",
		date: "2026-10-07",
		time: "17:15",
		cycleNumber: 4,
		autoclaveCode: "АК-02",
		autoclaveModel: "W&H Lina 17",
		temperatureC: 134.2,
		pressureBar: 2.14,
		durationMin: 5,
		regimeName: "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: "4",
		colorBefore: "Светло-желтый",
		colorBeforeHex: "#fff9c4",
		colorAfter: "Темно-коричневый",
		colorAfterHex: "#3e2723",
		isIndicatorNorm: true,
		pouchCodes: ["KP-84880", "KP-84881", "KP-84882"],
		itemsSummary: "Ортодонтические щипцы, зеркала для фотопротокола, лотки",
		operatorName: "Петрова Е. В. (ЦСО)",
		status: "passed",
	},
];

export interface SanPinSterilizationJournalProps {
	readonly onAttachPouchToVisit?: ((pouchCode: string, snippet: string) => void) | undefined;
	readonly initialFilterAutoclave?: string | undefined;
	readonly className?: string | undefined;
}

export const SanPinSterilizationJournal: React.FC<SanPinSterilizationJournalProps> = ({
	onAttachPouchToVisit,
	initialFilterAutoclave = "all",
	className = "",
}) => {
	const [cycles, setCycles] = useState<SanPinCycleEntry[]>(DEFAULT_CYCLES);
	const [selectedAutoclave, setSelectedAutoclave] = useState<string>(initialFilterAutoclave);
	const [searchQuery, setSearchQuery] = useState("");
	const [showScannerModal, setShowScannerModal] = useState(false);

	const devices = useMemo(() => {
		try {
			return loadSavedClinicAutoclaves();
		} catch {
			return [];
		}
	}, []);

	const filteredCycles = useMemo(() => {
		return cycles.filter((cyc) => {
			if (selectedAutoclave !== "all" && cyc.autoclaveCode !== selectedAutoclave) {
				return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchQuery =
					cyc.pouchCodes.some((code) => code.toLowerCase().includes(query)) ||
					cyc.itemsSummary.toLowerCase().includes(query) ||
					cyc.operatorName.toLowerCase().includes(query) ||
					cyc.autoclaveCode.toLowerCase().includes(query);
				if (!matchQuery) return false;
			}
			return true;
		});
	}, [cycles, selectedAutoclave, searchQuery]);

	const handlePrint257 = () => {
		try {
			handleGenerateMonthlyForm257(selectedAutoclave, devices);
			showToast("Официальная Форма 257/у сформирована для печати (А4)", "success");
		} catch (err) {
			showToast("Ошибка при формировании Формы 257/у", "error");
		}
	};

	const handleExportCsv = () => {
		const header = "Дата,Время,Цикл,Автоклав,Температура C,Давление бар,Экспозиция мин,Индикатор,Результат,Крафт-пакеты,Оператор\n";
		const rows = filteredCycles.map((c) =>
			`"${c.date}","${c.time}","№${c.cycleNumber}","${c.autoclaveCode} (${c.autoclaveModel})",${c.temperatureC},${c.pressureBar},${c.durationMin},"${c.indicatorClass} класс","${c.isIndicatorNorm ? "Норма" : "Брак"}","${c.pouchCodes.join("; ")}","${c.operatorName}"`
		).join("\n");
		const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `SanPiN_Form257u_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast("Журнал стерилизации экспортирован в CSV", "success");
	};

	return (
		<div className={`sanpin-sterilization-journal ${className}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			{/* Top Toolstrip */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
					padding: "8px 12px",
					borderRadius: 8,
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					<span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink, #1e293b)" }}>
						Журнал стерилизации (СанПиН 3.3686-21, Форма 257/у)
					</span>

					{/* Autoclave filter */}
					<select
						value={selectedAutoclave}
						onChange={(e) => setSelectedAutoclave(e.target.value)}
						style={{
							height: 32,
							padding: "0 8px",
							borderRadius: 6,
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #fff)",
							fontSize: "0.8125rem",
							color: "var(--ink, #1e293b)",
						}}
					>
						<option value="all">Все автоклавы</option>
						<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
						<option value="АК-02">АК-02 (W&H Lina 17)</option>
					</select>

					{/* Search */}
					<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
						<Search size={14} style={{ position: "absolute", left: 8, color: "var(--muted, #64748b)" }} />
						<input
							type="text"
							placeholder="Поиск по крафт-пакету..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{
								height: 32,
								paddingLeft: 28,
								paddingRight: 8,
								borderRadius: 6,
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #fff)",
								fontSize: "0.8125rem",
								color: "var(--ink, #1e293b)",
								width: 240,
							}}
						/>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					{/* Chairside scanner trigger */}
					<button
						type="button"
						onClick={() => setShowScannerModal(true)}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							height: 32,
							padding: "0 12px",
							borderRadius: 6,
							border: "1px solid var(--primary, #0284c7)",
							background: "var(--primary, #0284c7)",
							color: "#ffffff",
							fontSize: "0.8125rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						<QrCode size={14} />
						<span>Сканер крафт-пакетов</span>
					</button>

					{/* Print Form 257/u */}
					<button
						type="button"
						onClick={handlePrint257}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							height: 32,
							padding: "0 12px",
							borderRadius: 6,
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #1e293b)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						<Printer size={14} />
						<span>Печать Формы 257/у</span>
					</button>

					{/* Export CSV */}
					<button
						type="button"
						onClick={handleExportCsv}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							height: 32,
							padding: "0 10px",
							borderRadius: 6,
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #fff)",
							color: "var(--muted, #64748b)",
							fontSize: "0.8125rem",
							cursor: "pointer",
						}}
						title="Экспорт в CSV"
					>
						<Download size={14} />
						<span>Экспорт</span>
					</button>
				</div>
			</div>

			{/* Cycles & Packages Table */}
			<div
				style={{
					borderRadius: 8,
					border: "1px solid var(--line, #e2e8f0)",
					overflowX: "auto",
					background: "var(--paper, #ffffff)",
				}}
			>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
					<thead>
						<tr style={{ background: "var(--paper-soft, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Дата / Цикл</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Автоклав</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Параметры цикла</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Химический индикатор (4/5 кл.)</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Крафт-пакеты / Содержимое</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Ответственный</th>
							<th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Статус</th>
						</tr>
					</thead>
					<tbody>
						{filteredCycles.length === 0 ? (
							<tr>
								<td colSpan={7} style={{ padding: "24px 12px", textAlign: "center", color: "var(--muted, #64748b)" }}>
									Записи циклов стерилизации не найдены
								</td>
							</tr>
						) : (
							filteredCycles.map((cyc) => (
								<tr
									key={cyc.id}
									style={{
										borderBottom: "1px solid var(--line-subtle, #f1f5f9)",
										verticalAlign: "top",
									}}
								>
									{/* Date & Cycle */}
									<td style={{ padding: "10px 12px" }}>
										<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.date}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
											{cyc.time} • Цикл №{cyc.cycleNumber}
										</div>
									</td>

									{/* Autoclave */}
									<td style={{ padding: "10px 12px" }}>
										<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.autoclaveCode}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{cyc.autoclaveModel}</div>
									</td>

									{/* Regime Parameters */}
									<td style={{ padding: "10px 12px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
											<Thermometer size={13} style={{ color: "var(--primary, #0284c7)" }} />
											<span>{cyc.temperatureC}°C</span>
											<span style={{ color: "var(--line, #cbd5e1)" }}>|</span>
											<Gauge size={13} style={{ color: "var(--primary, #0284c7)" }} />
											<span>{cyc.pressureBar} бар</span>
											<span style={{ color: "var(--line, #cbd5e1)" }}>|</span>
											<Timer size={13} style={{ color: "var(--primary, #0284c7)" }} />
											<span>{cyc.durationMin} мин</span>
										</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: 2 }}>
											{cyc.regimeName}
										</div>
									</td>

									{/* Chemical Indicator Visual Proof */}
									<td style={{ padding: "10px 12px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
											<div
												title={`До: ${cyc.colorBefore}`}
												style={{
													width: 14,
													height: 14,
													borderRadius: "50%",
													background: cyc.colorBeforeHex,
													border: "1px solid rgba(0,0,0,0.15)",
												}}
											/>
											<ArrowRight size={12} style={{ color: "var(--muted, #64748b)" }} />
											<div
												title={`После: ${cyc.colorAfter} (Норма)`}
												style={{
													width: 14,
													height: 14,
													borderRadius: "50%",
													background: cyc.colorAfterHex,
													border: "1px solid rgba(0,0,0,0.25)",
												}}
											/>
											<span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--emerald-600, #059669)" }}>
												{cyc.colorAfter} (Норма)
											</span>
										</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
											Индикатор {cyc.indicatorClass} класса (химический интегратор)
										</div>
									</td>

									{/* Pouch Codes & Items */}
									<td style={{ padding: "10px 12px", maxWidth: 280 }}>
										<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
											{cyc.pouchCodes.map((code) => (
												<span
													key={code}
													style={{
														display: "inline-block",
														padding: "1px 6px",
														borderRadius: 4,
														fontSize: "0.75rem",
														fontFamily: "monospace",
														fontWeight: 600,
														background: "var(--paper-soft, #f1f5f9)",
														border: "1px solid var(--line, #cbd5e1)",
														color: "var(--ink, #1e293b)",
													}}
												>
													{code}
												</span>
											))}
										</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", lineHeight: 1.3 }}>
											{cyc.itemsSummary}
										</div>
									</td>

									{/* Operator */}
									<td style={{ padding: "10px 12px" }}>
										<div style={{ fontSize: "0.8125rem", color: "var(--ink, #1e293b)" }}>{cyc.operatorName}</div>
									</td>

									{/* Status */}
									<td style={{ padding: "10px 12px", textAlign: "center" }}>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												padding: "3px 8px",
												borderRadius: 12,
												fontSize: "0.75rem",
												fontWeight: 600,
												background: "rgba(16, 185, 129, 0.12)",
												color: "var(--emerald-600, #059669)",
												border: "1px solid rgba(16, 185, 129, 0.25)",
											}}
										>
											<CheckCircle2 size={12} />
											<span>Стерильно</span>
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Chairside Scanner Modal */}
			{showScannerModal && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: "rgba(15, 23, 42, 0.6)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						padding: 16,
					}}
					onClick={() => setShowScannerModal(false)}
				>
					<div
						style={{
							background: "var(--paper, #fff)",
							borderRadius: 12,
							width: "100%",
							maxWidth: 680,
							maxHeight: "90vh",
							overflowY: "auto",
							boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
							position: "relative",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<SterilizationScanner
							onAttachToVisit={(code, snippet) => {
								if (onAttachPouchToVisit) {
									onAttachPouchToVisit(code, snippet);
								}
								showToast(`Крафт-пакет №${code} прикреплен`, "success");
								setShowScannerModal(false);
							}}
							onClose={() => setShowScannerModal(false)}
						/>
					</div>
				</div>
			)}
		</div>
	);
};
