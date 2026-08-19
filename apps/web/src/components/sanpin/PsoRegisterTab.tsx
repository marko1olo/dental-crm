import {
	SanPiNRegulatoryEngine,
	type CreatePsoCleaningLogDto,
	type PsoCleaningLog,
	type PsoTestTypeEnum,
} from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FlaskConical,
	Plus,
	Printer,
	Search,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export function PsoRegisterTab() {
	const [logs, setLogs] = useState<PsoCleaningLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [testFilter, setTestFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);

	// New entry form state
	const [formInstrument, setFormInstrument] = useState("Стоматологические боры и наконечники");
	const [formTestType, setFormTestType] = useState<PsoTestTypeEnum>("both");
	const [formBatchCount, setFormBatchCount] = useState<number>(100);
	const [formSampleCount, setFormSampleCount] = useState<number>(3);
	const [formAzopyramNeg, setFormAzopyramNeg] = useState(true);
	const [formPhenolNeg, setFormPhenolNeg] = useState(true);
	const [formDetergent, setFormDetergent] = useState("Биолот 0.5% + Аламинол 1%");
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/pso", {
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
			console.error("Failed to load PSO logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	// Live regulatory sampling check
	const liveEval = useMemo(() => {
		return SanPiNRegulatoryEngine.evaluatePsoSampling(
			formBatchCount,
			formSampleCount,
			formAzopyramNeg,
			formPhenolNeg,
		);
	}, [formBatchCount, formSampleCount, formAzopyramNeg, formPhenolNeg]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreatePsoCleaningLogDto = {
				instrumentName: formInstrument,
				testType: formTestType,
				batchItemCount: Number(formBatchCount),
				testedSampleCount: Number(formSampleCount),
				isAzopyramNegative: formAzopyramNeg,
				isPhenolphthaleinNegative: formPhenolNeg,
				detergentBrand: formDetergent || undefined,
				notes: formNotes || undefined,
			};

			const res = await fetch("/api/registers/pso", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Запись ПСО успешно добавлена в журнал", "success");
				setIsModalOpen(false);
				fetchLogs();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении ПСО", "error");
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
				log.instrumentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.detergentBrand?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchTest =
				testFilter === "all" ||
				(testFilter === "approved" && log.isBatchApproved) ||
				(testFilter === "rejected" && !log.isBatchApproved);

			return matchSearch && matchTest;
		});
	}, [logs, searchQuery, testFilter]);

	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={16} style={{ position: "absolute", left: "0.6rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по инструментарию, моющему средству..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2rem", minWidth: "260px" }}
						/>
					</div>
					<select
						value={testFilter}
						onChange={(e) => setTestFilter(e.target.value)}
						className="sanpin-select"
					>
						<option value="all">Все записи</option>
						<option value="approved">Партия допущена</option>
						<option value="rejected">Брак / Повторная очистка</option>
					</select>
				</div>

				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button type="button" onClick={handlePrint} className="sanpin-btn sanpin-btn-secondary">
						<Printer size={15} /> Печать формы 366/у
					</button>
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
					>
						<Plus size={15} /> Внести пробу ПСО
					</button>
				</div>
			</div>

			{/* Table of logs */}
			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>Дата и время</th>
							<th>Наименование инструментария</th>
							<th>Объем партии (шт)</th>
							<th>Контроль (шт)</th>
							<th>Азопирам (кровь)</th>
							<th>Фенолфталеин (щелочь)</th>
							<th>Моющее средство</th>
							<th>Результат контроля</th>
							<th>Ответственное лицо</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала ПСО...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Записи предстерилизационной очистки не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td style={{ whiteSpace: "nowrap" }}>
										{new Date(log.timestamp).toLocaleString("ru-RU", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
									<td style={{ fontWeight: 600 }}>{log.instrumentName}</td>
									<td>{log.batchItemCount}</td>
									<td>{log.testedSampleCount}</td>
									<td>
										{log.isAzopyramNegative ? (
											<span className="sanpin-tag sanpin-tag-success">
												<CheckCircle2 size={12} /> Отрицат.
											</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">
												<XCircle size={12} /> Положит. (!)
											</span>
										)}
									</td>
									<td>
										{log.isPhenolphthaleinNegative ? (
											<span className="sanpin-tag sanpin-tag-success">
												<CheckCircle2 size={12} /> Отрицат.
											</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">
												<XCircle size={12} /> Положит. (!)
											</span>
										)}
									</td>
									<td style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
										{log.detergentBrand || "—"}
									</td>
									<td>
										{log.isBatchApproved ? (
											<span className="sanpin-tag sanpin-tag-success">Допущено к стерилизации</span>
										) : (
											<span
												className="sanpin-tag sanpin-tag-danger"
												title={log.rejectionReason || "Партия забракована"}
											>
												БРАК: {log.rejectionReason || "Повторная очистка"}
											</span>
										)}
									</td>
									<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Сотрудник ЦСО"}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal for new PSO entry */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Фиксация пробы ПСО (Форма № 366/у)</h3>
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--muted)" }}
							>
								✕
							</button>
						</div>
						<form onSubmit={handleSubmit}>
							<div className="sanpin-modal-body">
								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Наименование инструментария</label>
									<input
										type="text"
										required
										value={formInstrument}
										onChange={(e) => setFormInstrument(e.target.value)}
										className="sanpin-input"
										placeholder="Например: Стоматологические боры, зеркала, зонды, пинцеты"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Объем партии (шт)</label>
										<input
											type="number"
											min={1}
											required
											value={formBatchCount}
											onChange={(e) => {
												const count = parseInt(e.target.value) || 1;
												setFormBatchCount(count);
												// Auto-adjust sample count to 1% (min 3)
												const minSample = Math.max(3, Math.ceil(count * 0.01));
												if (formSampleCount < minSample) {
													setFormSampleCount(minSample);
												}
											}}
											className="sanpin-input"
										/>
										<span className="sanpin-form-hint">СанПиН требует пробу от 1% партии</span>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Количество образцов (шт)</label>
										<input
											type="number"
											min={1}
											required
											value={formSampleCount}
											onChange={(e) => setFormSampleCount(parseInt(e.target.value) || 1)}
											className="sanpin-input"
										/>
										<span className="sanpin-form-hint">
											Минимум: {Math.max(3, Math.ceil(formBatchCount * 0.01))} шт.
										</span>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Вид химической пробы</label>
									<select
										value={formTestType}
										onChange={(e) => setFormTestType(e.target.value as PsoTestTypeEnum)}
										className="sanpin-select"
									>
										<option value="both">Азопирамовая + Фенолфталеиновая (Рекомендуется)</option>
										<option value="azopyram">Только азопирамовая (на скрытую кровь)</option>
										<option value="phenolphthalein">Только фенолфталеиновая (на остатки моющих средств)</option>
									</select>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Азопирамовая проба</label>
										<select
											value={formAzopyramNeg ? "negative" : "positive"}
											onChange={(e) => setFormAzopyramNeg(e.target.value === "negative")}
											className="sanpin-select"
										>
											<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
											<option value="positive">Положительная (Фиолетовое окрашивание — КРОВЬ)</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Фенолфталеиновая проба</label>
										<select
											value={formPhenolNeg ? "negative" : "positive"}
											onChange={(e) => setFormPhenolNeg(e.target.value === "negative")}
											className="sanpin-select"
										>
											<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
											<option value="positive">Положительная (Розовое окрашивание — ЩЕЛОЧЬ)</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Моющее / дезинфицирующее средство</label>
									<input
										type="text"
										value={formDetergent}
										onChange={(e) => setFormDetergent(e.target.value)}
										className="sanpin-input"
										placeholder="Например: Биолот 0.5% + Аламинол 1%"
									/>
								</div>

								{/* Live regulatory validation box */}
								<div
									style={{
										padding: "0.75rem",
										borderRadius: "0.375rem",
										background: liveEval.isBatchApproved ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
										border: `1px solid ${liveEval.isBatchApproved ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
										display: "flex",
										alignItems: "flex-start",
										gap: "0.5rem",
									}}
								>
									{liveEval.isBatchApproved ? (
										<CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
									) : (
										<AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
									)}
									<div style={{ fontSize: "0.8rem" }}>
										<div style={{ fontWeight: 600, color: liveEval.isBatchApproved ? "#059669" : "#dc2626" }}>
											{liveEval.isBatchApproved
												? "Партия соответствует СанПиН 3.3686-21 и допущена к стерилизации"
												: "ВНИМАНИЕ: Партия НЕ ДОПУСКАЕТСЯ к стерилизации"}
										</div>
										{liveEval.rejectionReason && (
											<div style={{ marginTop: "0.25rem", color: "#dc2626" }}>
												{liveEval.rejectionReason}
											</div>
										)}
									</div>
								</div>
							</div>

							<div className="sanpin-modal-footer">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="sanpin-btn sanpin-btn-secondary"
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="sanpin-btn sanpin-btn-primary"
								>
									{submitting ? "Сохранение..." : "Зафиксировать пробу в журнале"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
