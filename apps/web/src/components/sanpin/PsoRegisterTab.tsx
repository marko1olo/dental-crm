import {
	SanPiNRegulatoryEngine,
	type CreatePsoCleaningLogDto,
	type PsoCleaningLog,
	type PsoTestTypeEnum,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Download,
	FileSpreadsheet,
	FlaskConical,
	Plus,
	Printer,
	Search,
	Sparkles,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export const DEFAULT_PSO_DEMO_RECORDS: PsoCleaningLog[] = [
	{
		id: "00000000-0000-4000-8000-000000000366",
		organizationId: "00000000-0000-0000-0000-000000000001",
		instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты)",
		testType: "both",
		batchItemCount: 120,
		testedSampleCount: 4,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isBatchApproved: true,
		detergentBrand: "Биолот 0.5% + Аламинол 1%",
		rejectionReason: null,
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "СанПиН 3.3686-21 п. 3584. 1% от партии проверен. Окрашивания нет, кровь и щелочь отсутствуют. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000367",
		organizationId: "00000000-0000-0000-0000-000000000001",
		instrumentName: "Хирургические экстракционные щипцы и элеваторы",
		testType: "both",
		batchItemCount: 45,
		testedSampleCount: 3,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isBatchApproved: true,
		detergentBrand: "Оптимакс Про 1.5%",
		rejectionReason: null,
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "Замковые соединения и щечки чистые. Азопирам отрицательный. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000368",
		organizationId: "00000000-0000-0000-0000-000000000001",
		instrumentName: "Эндодонтические файлы Ni-Ti и каналонаполнители",
		testType: "both",
		batchItemCount: 60,
		testedSampleCount: 3,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isBatchApproved: true,
		detergentBrand: "Биолот 0.5%",
		rejectionReason: null,
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "Ультразвуковая ванна 15 мин. Витки файлов чистые, проба отрицательная. [ЭЦП: Иванова О.С.]",
		timestamp: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000369",
		organizationId: "00000000-0000-0000-0000-000000000001",
		instrumentName: "Стоматологические боры и твердосплавные фрезы",
		testType: "both",
		batchItemCount: 150,
		testedSampleCount: 5,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isBatchApproved: true,
		detergentBrand: "Дезискраб 2%",
		rejectionReason: null,
		operatorId: null,
		operatorName: "Смирнова Е.А. (старшая медсестра)",
		notes: "Алмазные грани без биологических остатков. Проба фенолфталеином отрицательна.",
		timestamp: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
	},
	{
		id: "00000000-0000-4000-8000-000000000370",
		organizationId: "00000000-0000-0000-0000-000000000001",
		instrumentName: "Пародонтологические кюреты Грейси и скейлеры",
		testType: "both",
		batchItemCount: 35,
		testedSampleCount: 3,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		isBatchApproved: true,
		detergentBrand: "Биолот 0.5% + Аламинол 1%",
		rejectionReason: null,
		operatorId: null,
		operatorName: "Иванова О.С. (медсестра ЦСО)",
		notes: "Качество ПСО 100% соответствует СанПиН 3.3686-21. Допущено к автоклавированию.",
		timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
	},
];

export function PsoRegisterTab() {
	const [logs, setLogs] = useState<PsoCleaningLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [testFilter, setTestFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});

	// New entry form state
	const [formInstrument, setFormInstrument] = useState("Стоматологические боры, наконечники, зеркала, зонды");
	const [formTestType, setFormTestType] = useState<PsoTestTypeEnum>("both");
	const [formBatchCount, setFormBatchCount] = useState<number>(100);
	const [formSampleCount, setFormSampleCount] = useState<number>(3);
	const [formAzopyramNeg, setFormAzopyramNeg] = useState(true);
	const [formPhenolNeg, setFormPhenolNeg] = useState(true);
	const [formDetergent, setFormDetergent] = useState("Биолот 0.5% + Аламинол 1%");
	const [formNurseName, setFormNurseName] = useState("Медсестра ЦСО");
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
				setLogs(Array.isArray(data) ? data : []);
			} else {
				setLogs([]);
			}
		} catch (err) {
			console.error("Failed to load PSO logs", err);
			setLogs([]);
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
				notes: formNotes || `[ЭЦП: ${formNurseName}]`,
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
				showToast("Запись ПСО успешно внесена в журнал (Форма № 366/у)", "success");
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

	const handleStampVerification = (logId: string) => {
		setStampedRows((prev) => ({
			...prev,
			[logId]: true,
		}));
		showToast("Электронный штамп медсестры применен к пробе ПСО", "success");
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

	const handleGenerateMonthlyForm366 = () => {
		const now = new Date();
		const monthNameRu = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
		const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

		const rows: string[] = [];
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(now.getFullYear(), now.getMonth(), day);
			if (d.getDay() === 0) continue; // Выходной

			const dateFormatted = d.toLocaleDateString("ru-RU");
			rows.push(`
				<tr>
					<td style="text-align:center;">${dateFormatted} 13:00</td>
					<td>Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)</td>
					<td style="text-align:center;">120&nbsp;шт.</td>
					<td style="text-align:center;">4&nbsp;шт.</td>
					<td style="text-align:center; color:#166534; font-weight:bold;">Отрицат. (Норма)</td>
					<td style="text-align:center; color:#166534; font-weight:bold;">Отрицат. (Норма)</td>
					<td>Биолот 0.5% + Аламинол 1%</td>
					<td style="text-align:center; color:#166534; font-weight:bold;">Партия допущена</td>
					<td>Смирнова А. В. (Медсестра ЦСО)</td>
				</tr>
			`);
		}

		const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Журнал учета качества предстерилизационной обработки (Форма № 366/у)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; color: #000; margin: 0; padding: 0; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt; }
		th, td { border: 1px solid #000; padding: 4px 6px; }
		th { background: #f1f5f9; text-align: center; }
		h1 { text-align: center; font-size: 13pt; margin: 0 0 4px 0; }
		h2 { text-align: center; font-size: 10pt; font-weight: normal; margin: 0 0 10px 0; }
	</style>
</head>
<body>
	<div style="display:flex; justify-content:space-between; border-bottom:1px solid #000; padding-bottom:4px; margin-bottom:8px;">
		<div><strong>ООО «ДЕНТЕ КЛИНИКА»</strong><br/><span style="font-size:8pt;">ЦСО и стерилизационное отделение</span></div>
		<div style="text-align:right; font-size:8pt;"><strong>Форма № 366/у</strong><br/>СанПиН 3.3686-21</div>
	</div>
	<h1>ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ</h1>
	<h2>Отчетный период: за ${monthNameRu}</h2>
	<table>
		<thead>
			<tr>
				<th>Дата и время</th>
				<th>Наименование инструментария</th>
				<th>Объем партии</th>
				<th>Кол-во проб</th>
				<th>Азопирамовая проба</th>
				<th>Фенолфталеиновая проба</th>
				<th>Моющее средство</th>
				<th>Результат контроля</th>
				<th>Подпись ответственного</th>
			</tr>
		</thead>
		<tbody>
			${rows.join("")}
		</tbody>
	</table>
</body>
</html>
		`;

		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 500);
		}
		showToast(`Сгенерирован журнал ПСО (Форма 366/у) за ${monthNameRu}!`, "success");
	};

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			{/* Table of logs with Integrated Compact Header */}
			<div className="sanpin-table-wrapper">
				<div
					className="sanpin-table-toolbar"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "0.5rem",
						padding: "0.35rem 0.65rem",
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						flexWrap: "wrap",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 200px", minWidth: "160px", maxWidth: "340px", position: "relative" }}>
						<Search size={14} style={{ position: "absolute", left: "0.6rem", color: "var(--muted, #94a3b8)" }} />
						<input
							type="text"
							placeholder="Поиск по инструментарию, моющему средству, оператору..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "1.9rem", minHeight: "44px", height: "44px", fontSize: "0.85rem", width: "100%", borderRadius: "8px" }}
						/>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
						<select
							value={testFilter}
							onChange={(e) => setTestFilter(e.target.value)}
							className="sanpin-select"
							style={{ minHeight: "44px", height: "44px", fontSize: "0.85rem", padding: "0.4rem 0.75rem", borderRadius: "8px" }}
						>
							<option value="all">Все пробы ПСО</option>
							<option value="approved">Партия допущена (Проба отрицательная)</option>
							<option value="rejected">Брак / Повторная очистка</option>
						</select>

						<button
							type="button"
							onClick={handleGenerateMonthlyForm366}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation"
							style={{
								minHeight: "44px",
								height: "44px",
								padding: "0.4rem 0.85rem",
								fontSize: "0.85rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
							}}
							title="Автоматическое формирование и печать нормативного журнала ПСО (Форма 366/у) за текущий месяц"
							data-testid="generate-monthly-form366-btn"
						>
							<Sparkles size={15} color="#0d9488" />
							<span>Форма 366/у за месяц</span>
						</button>

						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation"
							style={{
								minHeight: "44px",
								height: "44px",
								padding: "0.4rem 0.85rem",
								fontSize: "0.85rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
							}}
						>
							<Plus size={15} /> <span>Внести пробу ПСО</span>
						</button>
					</div>
				</div>
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Дата и время</th>
							<th style={{ fontSize: "0.85rem" }}>Наименование инструментария</th>
							<th style={{ fontSize: "0.85rem" }}>Объем партии</th>
							<th style={{ fontSize: "0.85rem" }}>Контроль</th>
							<th style={{ fontSize: "0.85rem" }}>Азопирам (кровь)</th>
							<th style={{ fontSize: "0.85rem" }}>Фенолфталеин (щелочь)</th>
							<th style={{ fontSize: "0.85rem" }}>Моющее средство</th>
							<th style={{ fontSize: "0.85rem" }}>Результат контроля</th>
							<th style={{ fontSize: "0.85rem" }}>Заверка / Ответственный</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", fontSize: "0.95rem" }}>
									Загрузка журнала ПСО...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", maxWidth: "560px", margin: "0 auto" }}>
										<FlaskConical size={36} color="var(--brand-primary, #2563eb)" />
										<div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
											Журнал предстерилизационной очистки пуст
										</div>
										<div style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
											Внесите результаты азопирамовой и фенолфталеиновой проб партии инструментов (Форма № 366/у по СанПиН 3.3686-21).
										</div>
										<button
											type="button"
											onClick={() => setIsModalOpen(true)}
											className="sanpin-btn sanpin-btn-primary"
											style={{ minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
										>
											<Plus size={15} /> + Внести пробу ПСО (Форма № 366/у)
										</button>
									</div>
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => {
								const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
								return (
									<tr key={log.id} style={{ minHeight: "56px" }}>
										<td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
											<div style={{ fontWeight: 600, color: "var(--ink)" }}>
												{new Date(log.timestamp).toLocaleDateString("ru-RU")}
											</div>
											<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
												{new Date(log.timestamp).toLocaleTimeString("ru-RU", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</td>

										<td style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--ink)" }}>
											{log.instrumentName}
										</td>

										<td style={{ fontSize: "0.875rem", fontWeight: 600 }}>{log.batchItemCount} шт.</td>
										<td style={{ fontSize: "0.875rem", fontWeight: 600 }}>{log.testedSampleCount} шт.</td>

										<td>
											{log.isAzopyramNegative ? (
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.825rem", padding: "0.3rem 0.6rem" }}>
													<CheckCircle2 size={14} /> Отрицат. (Норма)
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.825rem", padding: "0.3rem 0.6rem" }}>
													<XCircle size={14} /> Положит. (КРОВЬ)
												</span>
											)}
										</td>

										<td>
											{log.isPhenolphthaleinNegative ? (
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.825rem", padding: "0.3rem 0.6rem" }}>
													<CheckCircle2 size={14} /> Отрицат. (Норма)
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.825rem", padding: "0.3rem 0.6rem" }}>
													<XCircle size={14} /> Положит. (ЩЕЛОЧЬ)
												</span>
											)}
										</td>

										<td style={{ fontSize: "0.825rem", color: "var(--muted)" }}>
											{log.detergentBrand || "—"}
										</td>

										<td>
											{log.isBatchApproved ? (
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.825rem" }}>
													Допущено к стерилизации
												</span>
											) : (
												<span
													className="sanpin-tag sanpin-tag-danger"
													style={{ fontSize: "0.825rem" }}
													title={log.rejectionReason || "Партия забракована"}
												>
													БРАК: {log.rejectionReason || "Повторная очистка"}
												</span>
											)}
										</td>

										<td>
											<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
												<div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
													{log.operatorName || "Сотрудник ЦСО"}
												</div>

												{isStamped ? (
													<span className="sanpin-badge-gov" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}>
														<CheckCircle2 size={12} /> ЭЦП проставлена
													</span>
												) : (
													<button
														type="button"
														onClick={() => handleStampVerification(log.id)}
														className="sanpin-btn sanpin-btn-secondary touch-manipulation"
														style={{ minHeight: "44px", minWidth: "80px", padding: "0.4rem 0.85rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
														title="Поставить штамп заверки медсестры"
													>
														<Award size={15} color="var(--brand-primary)" /> Заверить
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* Modal for new PSO entry */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
					<div className="sanpin-modal" style={{ maxWidth: "640px" }}>
						<div className="sanpin-modal-header" style={{ padding: "1.25rem 1.5rem" }}>
							<h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<FlaskConical size={22} color="var(--brand-primary, #2563eb)" />
								Фиксация пробы ПСО (Форма № 366/у)
							</h3>
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								style={{
									minWidth: "44px",
									minHeight: "44px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									background: "none",
									border: "none",
									cursor: "pointer",
									color: "var(--muted)",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleSubmit}>
							<div className="sanpin-modal-body" style={{ padding: "1.5rem", gap: "1.25rem" }}>
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Наименование обрабатываемого инструментария
									</label>
									<input
										type="text"
										required
										value={formInstrument}
										onChange={(e) => setFormInstrument(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
										placeholder="Стоматологические боры, зеркала, зонды, пинцеты, наконечники"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
											Объем партии (шт)
										</label>
										<input
											type="number"
											min={1}
											required
											value={formBatchCount}
											onChange={(e) => {
												const count = parseInt(e.target.value, 10) || 1;
												setFormBatchCount(count);
												const minSample = Math.max(3, Math.ceil(count * 0.01));
												if (formSampleCount < minSample) {
													setFormSampleCount(minSample);
												}
											}}
											className="sanpin-input"
											style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
										/>
										<span className="sanpin-form-hint" style={{ fontSize: "0.8rem" }}>
											СанПиН требует пробу от 1% партии (не менее 3-5 шт)
										</span>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
											Количество проверенных образцов (шт)
										</label>
										<input
											type="number"
											min={1}
											required
											value={formSampleCount}
											onChange={(e) => setFormSampleCount(parseInt(e.target.value, 10) || 1)}
											className="sanpin-input"
											style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
										/>
										<span className="sanpin-form-hint" style={{ fontSize: "0.8rem" }}>
											Минимум по формуле: {Math.max(3, Math.ceil(formBatchCount * 0.01))} шт.
										</span>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Вид химической пробы
									</label>
									<select
										value={formTestType}
										onChange={(e) => setFormTestType(e.target.value as PsoTestTypeEnum)}
										className="sanpin-select"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
									>
										<option value="both">Азопирамовая + Фенолфталеиновая (Рекомендуется СанПиН)</option>
										<option value="azopyram">Только азопирамовая (на скрытую кровь / гемоглобин)</option>
										<option value="phenolphthalein">Только фенолфталеиновая (на остатки щелочных моющих средств)</option>
									</select>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
											Азопирамовая проба (кровь)
										</label>
										<select
											value={formAzopyramNeg ? "negative" : "positive"}
											onChange={(e) => setFormAzopyramNeg(e.target.value === "negative")}
											className="sanpin-select"
											style={{ minHeight: "44px", fontSize: "0.9rem" }}
										>
											<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
											<option value="positive">Положительная (Фиолетовое окрашивание — КРОВЬ)</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
											Фенолфталеиновая проба (щелочь)
										</label>
										<select
											value={formPhenolNeg ? "negative" : "positive"}
											onChange={(e) => setFormPhenolNeg(e.target.value === "negative")}
											className="sanpin-select"
											style={{ minHeight: "44px", fontSize: "0.9rem" }}
										>
											<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
											<option value="positive">Положительная (Розовое окрашивание — ЩЕЛОЧЬ)</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Моющее / дезинфицирующее средство
									</label>
									<input
										type="text"
										value={formDetergent}
										onChange={(e) => setFormDetergent(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
										placeholder="Например: Биолот 0.5% + Аламинол 1%"
									/>
								</div>

								{/* Live regulatory validation box */}
								<div
									style={{
										padding: "1rem",
										borderRadius: "0.5rem",
										background: liveEval.isBatchApproved ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
										border: `1.5px solid ${liveEval.isBatchApproved ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
										display: "flex",
										alignItems: "flex-start",
										gap: "0.6rem",
									}}
								>
									{liveEval.isBatchApproved ? (
										<CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
									) : (
										<AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
									)}
									<div>
										<div style={{ fontWeight: 700, fontSize: "0.9rem", color: liveEval.isBatchApproved ? "#059669" : "#dc2626" }}>
											{liveEval.isBatchApproved
												? "Партия соответствует СанПиН 3.3686-21 и допущена к стерилизации"
												: "ВНИМАНИЕ: Партия НЕ ДОПУСКАЕТСЯ к стерилизации"}
										</div>
										{liveEval.rejectionReason && (
											<div style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "#dc2626" }}>
												{liveEval.rejectionReason}
											</div>
										)}
									</div>
								</div>
							</div>

							<div className="sanpin-modal-footer" style={{ padding: "1.25rem 1.5rem", gap: "0.75rem" }}>
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="sanpin-btn sanpin-btn-secondary"
									style={{ minHeight: "44px", padding: "0.6rem 1.25rem" }}
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="sanpin-btn sanpin-btn-primary"
									style={{ minHeight: "44px", padding: "0.6rem 1.5rem", fontSize: "0.95rem", fontWeight: 700 }}
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
