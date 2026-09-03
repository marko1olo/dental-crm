import {
	type CreateMedicalWasteLogDto,
	type MedicalWasteClass,
	type MedicalWasteDisinfectionMethod,
	type MedicalWasteLog,
	type MedicalWasteOperationType,
	type MedicalWastePackageType,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowUpRight,
	CheckCircle2,
	FileSpreadsheet,
	Filter,
	Plus,
	Printer,
	Search,
	ShieldAlert,
	Tag,
	Trash2,
	Truck,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { MedicalWasteJournalModal } from "./waste/MedicalWasteJournalModal";
import { generateWasteThermalStickerHtml, type MedicalWasteJournalRecord } from "./waste/medicalWasteEngine";

export function MedicalWasteRegisterTab() {
	const [logs, setLogs] = useState<MedicalWasteLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [classFilter, setClassFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isWasteJournalModalOpen, setIsWasteJournalModalOpen] = useState(false);

	const handlePrintStickerForLog = (log: MedicalWasteLog) => {
		const rec: MedicalWasteJournalRecord = {
			id: log.id,
			timestamp: log.logDate || new Date().toISOString().slice(0, 16),
			// biome-ignore lint/suspicious/noExplicitAny: mapping
			wasteClass: (log.wasteClass as any) || "class_B",
			departmentNameRu: "Стоматологическое отделение",
			// biome-ignore lint/suspicious/noExplicitAny: mapping
			packageType: (log.packageType as any) || "yellow_bag",
			packageCount: log.packageCount || 1,
			grossWeightKg: Math.round(((log.weightKg || 1) + 0.1) * 100) / 100,
			tareWeightKg: 0.1,
			netWeightKg: log.weightKg || 1,
			sealNumber: `ПЛ-Б-${new Date().getFullYear()}-001`,
			barcode: `WASTE-${log.wasteClass?.toUpperCase() || "CLASS_B"}-DENT-${log.id.slice(0, 6)}`,
			decontaminationMethod: "physical_autoclave_134",
			storageLocation: "cabinet_room_temp",
			operatorStaffFullName: log.responsibleStaffName || "Старшая медсестра",
			operatorStaffPosition: "Медсестра",
			status: log.operationType === "transfer_to_disposal_company" ? "transferred_for_disposal" : "accumulating",
		};
		const html = generateWasteThermalStickerHtml(rec, {
			clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
			disposalContractNo: log.contractNumber || "ДОГ-МЕД-2026/04",
		});
		const printWin = window.open("", "_blank", "width=450,height=350");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
		}
	};

	// Form state
	const [formOpType, setFormOpType] = useState<MedicalWasteOperationType>("accumulation");
	const [formLogDate, setFormLogDate] = useState(new Date().toISOString().slice(0, 16));
	const [formWasteClass, setFormWasteClass] = useState<MedicalWasteClass>("class_B");
	const [formDescription, setFormDescription] = useState("Использованные ватные валики, салфетки, перчатки, карпулы, удаленные зубы");
	const [formPackageType, setFormPackageType] = useState<MedicalWastePackageType>("yellow_bag");
	const [formPackageCount, setFormPackageCount] = useState<number>(2);
	const [formWeightKg, setFormWeightKg] = useState<number>(2.45);
	const [formDisinfection, setFormDisinfection] = useState<MedicalWasteDisinfectionMethod>("chemical_soaking");
	const [formDisinfectant, setFormDisinfectant] = useState("Бриллиант Классик 2%");
	const [formDisposalCompany, setFormDisposalCompany] = useState("ООО «ЭкоМедУтилизация»");
	const [formContractNo, setFormContractNo] = useState("ДОГ-МЕД-2026/04");
	const [formActNo, setFormActNo] = useState("АКТ-ВЫВОЗ-182");
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/medical-waste", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});
			if (res.ok) {
				const data = await res.json();
				setLogs(data);
			}
		} catch (err) {
			console.error("Failed to load waste logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	// Calculate summary stats
	const summaryStats = useMemo(() => {
		let totalKg = 0;
		let classAKg = 0;
		let classBKg = 0;
		let classGKg = 0;

		logs.forEach((l) => {
			const w = Number(l.weightKg) || 0;
			totalKg += w;
			if (l.wasteClass === "class_A") classAKg += w;
			if (l.wasteClass === "class_B") classBKg += w;
			if (l.wasteClass === "class_G") classGKg += w;
		});

		return {
			totalKg: totalKg.toFixed(2),
			classAKg: classAKg.toFixed(2),
			classBKg: classBKg.toFixed(2),
			classGKg: classGKg.toFixed(2),
			totalRecords: logs.length,
		};
	}, [logs]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateMedicalWasteLogDto = {
				operationType: formOpType,
				logDate: new Date(formLogDate).toISOString(),
				wasteClass: formWasteClass,
				wasteDescription: formDescription,
				packageType: formPackageType,
				packageCount: Number(formPackageCount),
				weightKg: Number(formWeightKg),
				disinfectionMethod: formDisinfection,
				disinfectantUsed: formDisinfectant || undefined,
				disposalCompany: formOpType === "transfer_to_disposal_company" ? formDisposalCompany : undefined,
				contractNumber: formOpType === "transfer_to_disposal_company" ? formContractNo : undefined,
				transferActNumber: formOpType === "transfer_to_disposal_company" ? formActNo : undefined,
				notes: formNotes || undefined,
			};

			const res = await fetch("/api/registers/medical-waste", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Запись движения отходов внесена в журнал (СанПиН 2.1.3684-21)", "success");
				setIsModalOpen(false);
				fetchLogs();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при сохранении", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.wasteDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.disposalCompany?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.responsibleStaffName?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchClass = classFilter === "all" || log.wasteClass === classFilter;

			return matchSearch && matchClass;
		});
	}, [logs, searchQuery, classFilter]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ТЕХНОЛОГИЧЕСКИЙ ЖУРНАЛ УЧЕТА МЕДИЦИНСКИХ ОТХОДОВ КЛАССОВ А, Б, В, Г</h2>
				<p>СанПиН 2.1.3684-21 «Санитарно-эпидемиологические требования к обращению с медицинскими отходами»</p>
			</div>

			{/* Mini summary cards for waste categories */}
			<div className="sanpin-kpi-grid">
				<div className="sanpin-kpi-card">
					<span className="sanpin-kpi-label">Всего отходов</span>
					<span className="sanpin-kpi-value">{summaryStats.totalKg} кг</span>
					<span className="sanpin-kpi-subtext">{summaryStats.totalRecords} операций учета</span>
				</div>
				<div className="sanpin-kpi-card" style={{ borderLeft: "4px solid #f59e0b" }}>
					<span className="sanpin-kpi-label">Класс Б (Опасные)</span>
					<span className="sanpin-kpi-value" style={{ color: "#d97706" }}>{summaryStats.classBKg} кг</span>
					<span className="sanpin-kpi-subtext">Желтые пакеты / контейнеры игл</span>
				</div>
				<div className="sanpin-kpi-card" style={{ borderLeft: "4px solid #64748b" }}>
					<span className="sanpin-kpi-label">Класс А (Безопасные)</span>
					<span className="sanpin-kpi-value">{summaryStats.classAKg} кг</span>
					<span className="sanpin-kpi-subtext">Белые пакеты / бытовой мусор</span>
				</div>
				<div className="sanpin-kpi-card" style={{ borderLeft: "4px solid #dc2626" }}>
					<span className="sanpin-kpi-label">Класс Г (Токсичные)</span>
					<span className="sanpin-kpi-value" style={{ color: "#dc2626" }}>{summaryStats.classGKg} кг</span>
					<span className="sanpin-kpi-subtext">Ртутные лампы / дезсредства</span>
				</div>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={16} style={{ position: "absolute", left: "0.6rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по описанию, компании утилизатору..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2rem", minWidth: "260px" }}
						/>
					</div>
					<select
						value={classFilter}
						onChange={(e) => setClassFilter(e.target.value)}
						className="sanpin-select"
					>
						<option value="all">Все классы отходов</option>
						<option value="class_B">Класс Б (Эпидемически опасные)</option>
						<option value="class_A">Класс А (Эпидемически безопасные)</option>
						<option value="class_G">Класс Г (Токсикологически опасные)</option>
						<option value="class_V">Класс В (Чрезвычайно опасные)</option>
					</select>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => setIsWasteJournalModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1.1rem", fontSize: "0.92rem", fontWeight: 800, background: "#0d9488" }}
						title="Интерактивный технологический журнал учета отходов СанПиН 2.1.3684-21 и печать термоэтикеток"
						data-testid="open-waste-journal-modal-btn"
					>
						<Tag size={16} /> <span>Термоэтикетка 58x40 мм / Журнал СанПиН</span>
					</button>
					<button type="button" onClick={() => window.print()} className="sanpin-btn sanpin-btn-secondary">
						<Printer size={15} /> Печать журнала отходов
					</button>
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ fontWeight: 700 }}
					>
						<Plus size={15} /> Зафиксировать отходы
					</button>
				</div>
			</div>

			{/* Table of Waste Movements */}
			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>Дата операции</th>
							<th>Класс отходов</th>
							<th>Состав / Описание</th>
							<th>Упаковка (тип/кол-во)</th>
							<th>Масса (кг)</th>
							<th>Обеззараживание на месте</th>
							<th>Вывоз / Организация</th>
							<th>Ответственный</th>
							<th style={{ textAlign: "center" }}>Этикетка</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала отходов...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Записи движения отходов не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td style={{ whiteSpace: "nowrap" }}>
										{new Date(log.logDate).toLocaleString("ru-RU", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
									<td>
										{log.wasteClass === "class_B" ? (
											<span className="sanpin-tag sanpin-tag-warning">Класс Б (Опасные)</span>
										) : log.wasteClass === "class_A" ? (
											<span className="sanpin-tag sanpin-tag-neutral">Класс А (Безопасные)</span>
										) : log.wasteClass === "class_G" ? (
											<span className="sanpin-tag sanpin-tag-danger">Класс Г (Токсичные)</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">Класс В</span>
										)}
									</td>
									<td style={{ fontWeight: 500 }}>{log.wasteDescription}</td>
									<td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
										{log.packageType === "yellow_bag"
											? "Желтый пакет"
											: log.packageType === "yellow_sharps_container"
												? "Непрокалываемый контейнер игл"
												: log.packageType === "white_bag"
													? "Белый пакет"
													: "Контейнер Класса Г"}{" "}
										({log.packageCount} шт.)
									</td>
									<td style={{ fontWeight: 700 }}>{log.weightKg} кг</td>
									<td>
										<div style={{ fontSize: "0.8rem" }}>
											{log.disinfectionMethod === "chemical_soaking"
												? "Хим. замачивание"
												: log.disinfectionMethod === "steam_autoclave"
													? "Автоклавирование"
													: "Централизованно"}
										</div>
										{log.disinfectantUsed && (
											<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
												{log.disinfectantUsed}
											</div>
										)}
									</td>
									<td>
										{log.disposalCompany ? (
											<div>
												<div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{log.disposalCompany}</div>
												<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
													{log.contractNumber && `Договор: ${log.contractNumber}`}
													{log.transferActNumber && ` (Акт ${log.transferActNumber})`}
												</div>
											</div>
										) : (
											<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Накопление в ЦСО</span>
										)}
									</td>
									<td style={{ fontSize: "0.8rem" }}>{log.responsibleStaffName || "Медсестра ЦСО"}</td>
									<td style={{ textAlign: "center" }}>
										<button
											type="button"
											onClick={() => handlePrintStickerForLog(log)}
											className="sanpin-btn sanpin-btn-secondary touch-manipulation"
											style={{ minHeight: "44px", padding: "0.45rem 0.85rem", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											title="Печать термоэтикетки 58x40 мм со штрихкодом"
											data-testid={`print-waste-sticker-${log.id}`}
										>
											<Printer size={15} /> 58x40 мм
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal for new Waste Entry */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Регистрация медицинских отходов (СанПиН 2.1.3684-21)</h3>
							<button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }} aria-label="Закрыть"><X size={18} /></button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Тип операции</label>
										<select
											value={formOpType}
											onChange={(e) => setFormOpType(e.target.value as MedicalWasteOperationType)}
											className="sanpin-select"
										>
											<option value="accumulation">Накопление / Образование отходов в кабинете</option>
											<option value="disinfection_on_site">Обеззараживание на месте в клинике</option>
											<option value="transfer_to_disposal_company">Вывоз специализированной компанией</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Класс отходов</label>
										<select
											value={formWasteClass}
											onChange={(e) => {
												const c = e.target.value as MedicalWasteClass;
												setFormWasteClass(c);
												if (c === "class_B") {
													setFormPackageType("yellow_bag");
													setFormDescription("Использованные ватные валики, салфетки, перчатки, карпулы, удаленные зубы");
												} else if (c === "class_A") {
													setFormPackageType("white_bag");
													setFormDescription("Упаковочные коробки, бумага, бытовой мусор");
												} else if (c === "class_G") {
													setFormPackageType("hazard_g_container");
													setFormDescription("Отработанные ртутные бактерицидные лампы / просроченные медикаменты");
												}
											}}
											className="sanpin-select"
										>
											<option value="class_B">Класс Б — Эпидемически опасные (Желтый цвет)</option>
											<option value="class_A">Класс А — Безопасные (Белый цвет)</option>
											<option value="class_G">Класс Г — Токсичные (Ртутные лампы, дезсредства)</option>
											<option value="class_V">Класс В — Чрезвычайно опасные (Красный цвет)</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Описание состава отходов</label>
									<input
										type="text"
										required
										value={formDescription}
										onChange={(e) => setFormDescription(e.target.value)}
										className="sanpin-input"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Тип упаковочной тары</label>
										<select
											value={formPackageType}
											onChange={(e) => setFormPackageType(e.target.value as MedicalWastePackageType)}
											className="sanpin-select"
										>
											<option value="yellow_bag">Желтый пакет Класса Б</option>
											<option value="yellow_sharps_container">Желтый непрокалываемый контейнер (для игл и боров)</option>
											<option value="white_bag">Белый пакет Класса А</option>
											<option value="hazard_g_container">Спецконтейнер для ртутьсодержащих ламп Класса Г</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Количество упаковок (шт)</label>
										<input
											type="number"
											min={1}
											required
											value={formPackageCount}
											onChange={(e) => setFormPackageCount(parseInt(e.target.value) || 1)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Масса отходов (кг)</label>
										<input
											type="number"
											step="0.01"
											min={0.01}
											required
											value={formWeightKg}
											onChange={(e) => setFormWeightKg(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Метод обеззараживания</label>
										<select
											value={formDisinfection}
											onChange={(e) => setFormDisinfection(e.target.value as MedicalWasteDisinfectionMethod)}
											className="sanpin-select"
										>
											<option value="chemical_soaking">Химическое замачивание в дезрастворе</option>
											<option value="steam_autoclave">Аппаратное обеззараживание (автоклавирование)</option>
											<option value="none_centralized">Централизованный вывоз без предварит. обеззараживания</option>
										</select>
									</div>
								</div>

								{formOpType === "transfer_to_disposal_company" && (
									<div className="sanpin-form-row">
										<div className="sanpin-form-group">
											<label className="sanpin-form-label">Утилизирующая организация</label>
											<input
												type="text"
												required
												value={formDisposalCompany}
												onChange={(e) => setFormDisposalCompany(e.target.value)}
												className="sanpin-input"
											/>
										</div>

										<div className="sanpin-form-group">
											<label className="sanpin-form-label">Номер акта передачи / вывоза</label>
											<input
												type="text"
												required
												value={formActNo}
												onChange={(e) => setFormActNo(e.target.value)}
												className="sanpin-input"
											/>
										</div>
									</div>
								)}
							</div>
							<div className="sanpin-modal-footer">
								<button type="button" onClick={() => setIsModalOpen(false)} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
								<button type="submit" disabled={submitting} className="sanpin-btn sanpin-btn-primary">Зафиксировать в журнале</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Full Interactive Medical Waste Accounting & Thermal Label Modal */}
			<MedicalWasteJournalModal
				isOpen={isWasteJournalModalOpen}
				onClose={() => setIsWasteJournalModalOpen(false)}
			/>
		</div>
	);
}
