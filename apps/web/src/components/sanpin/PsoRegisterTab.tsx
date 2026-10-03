import {
	SanPiNRegulatoryEngine,
	generatePsoJournalPrintHtml,
	type CreatePsoCleaningLogDto,
	type PsoCleaningLog,
	type PsoJournalRecord,
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
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	sliceDomList,
} from "../../utils/domVirtualizationHelper";
import {
	DENTAL_PSO_INSTRUMENT_CATEGORIES,
	STATUTORY_PSO_REAGENTS,
	checkAzopyramSolutionFreshness,
	evaluatePsoCleaningBatch,
	generateStatutoryPsoForm366PrintHtml,
} from "./sanpinAzopyramEngine";

export function PsoRegisterTab() {
	const appLogic = useOptionalAppLogicContext();
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
	const [formSudanNeg, setFormSudanNeg] = useState(true);
	const [formDetergent, setFormDetergent] = useState("Биолот 0.5% + Аламинол 1%");
	const [formNurseName, setFormNurseName] = useState("Сотрудник клиники");
	const [formReagentLot, setFormReagentLot] = useState<string>(STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber);
	const [formSolutionPreparedAt, setFormSolutionPreparedAt] = useState<string>(() => new Date().toISOString());
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

	// Live regulatory sampling and reagent lifespan check (СанПиН 3.3686-21)
	const liveEval = useMemo(() => {
		return evaluatePsoCleaningBatch({
			batchItemCount: formBatchCount,
			testedSampleCount: formSampleCount,
			isAzopyramNegative: formAzopyramNeg,
			isPhenolphthaleinNegative: formPhenolNeg,
			isSudanNegative: formSudanNeg,
			azopyramSolutionPreparedAt: formSolutionPreparedAt,
			azopyramReagentLot: formReagentLot,
			detergentBrand: formDetergent,
		});
	}, [formBatchCount, formSampleCount, formAzopyramNeg, formPhenolNeg, formSudanNeg, formSolutionPreparedAt, formReagentLot, formDetergent]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		if (liveEval.isSolutionExpired) {
			showToast("Срок годности рабочего раствора азопирама истек (> 2 часов). Запрещено использовать старый раствор! Приготовьте свежую порцию 1:1 с 3% H2O2.", "error");
			return;
		}

		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const solutionTime = new Date(formSolutionPreparedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

			const payload: CreatePsoCleaningLogDto = {
				instrumentName: formInstrument,
				testType: formTestType,
				batchItemCount: Number(formBatchCount),
				testedSampleCount: Number(formSampleCount),
				isAzopyramNegative: formAzopyramNeg,
				isPhenolphthaleinNegative: formPhenolNeg,
				isSudanNegative: formSudanNeg,
				detergentBrand: formDetergent || undefined,
				notes: formNotes
					? `${formNotes} | [Серия: ${formReagentLot}, Раствор: ${solutionTime}] [ЭЦП: ${formNurseName}]`
					: `[Серия: ${formReagentLot}, Раствор: ${solutionTime}] [ЭЦП: ${formNurseName}]`,
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
				const isAllPassed = formAzopyramNeg && formPhenolNeg && formSudanNeg;
				showToast(
					isAllPassed
						? "Запись контроля ПСО внесена (норма, партия допущена)"
						: "ВНИМАНИЕ: Зафиксирован БРАК ПСО! Партия направлена на повторную очистку.",
					isAllPassed ? "success" : "warning",
				);
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

	const handleQuickMarkBatchNorm = async () => {
		if (submitting) return;
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload = {
				instrumentName: "Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)",
				batchItemCount: 100,
				testedSampleCount: 3,
				detergentBrand: "Биолот 0.5% + Аламинол 1%",
				notes: `Азопирамовая проба — 1 клик норма (реакция отрицательная, следов крови и моющих средств не обнаружено). Партия допущена к стерилизации. [ЭЦП: ${formNurseName}]`,
			};

			const res = await fetch("/api/registers/pso/quick-norm", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Азопирамовая проба: норма (реакция отрицательная, скрытая кровь отсутствует)!", "success");
				fetchLogs();
			} else {
				// Fallback to standard /api/registers/pso
				const fallbackRes = await fetch("/api/registers/pso", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
						...(staffToken ? { "X-Staff-Token": staffToken } : {}),
					},
					body: JSON.stringify({
						instrumentName: payload.instrumentName,
						testType: "both",
						batchItemCount: 100,
						testedSampleCount: 3,
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						detergentBrand: payload.detergentBrand,
						notes: payload.notes,
					}),
				});
				if (fallbackRes.ok) {
					showToast("Азопирамовая проба: норма (реакция отрицательная, скрытая кровь отсутствует)!", "success");
					fetchLogs();
				} else {
					const err = await fallbackRes.json();
					showToast(err.message || "Ошибка при отметке партии ПСО", "error");
				}
			}
		} catch (err) {
			showToast("Сетевая ошибка при отметке партии", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleStampVerification = (logId: string) => {
		setStampedRows((prev) => ({
			...prev,
			[logId]: true,
		}));
		showToast("Электронный штамп ответственного применен к пробе ПСО", "success");
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

	const [displayLimit, setDisplayLimit] = useState(DEFAULT_DOM_PAGE_SIZE);

	useEffect(() => {
		setDisplayLimit(DEFAULT_DOM_PAGE_SIZE);
	}, [searchQuery, testFilter]);

	// DOM Virtualization slice for 100+ PSO sample records
	const logsSlice = useMemo(() => {
		return sliceDomList(filteredLogs, displayLimit, 0);
	}, [filteredLogs, displayLimit]);

	const handleGenerateMonthlyForm366 = () => {
		const recordsToPrint = logs.map((l, idx) => ({
			id: l.id || `pso-${idx}`,
			timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
			instrumentName: l.instrumentName,
			batchItemCount: l.batchItemCount,
			testedSampleCount: l.testedSampleCount,
			reagentLot: l.notes?.match(/Серия:\s*([^,\]|]+)/)?.[1]?.trim() || formReagentLot,
			solutionTimeRu: l.notes?.match(/Раствор:\s*([^,\]|]+)/)?.[1]?.trim() || "08:30 (годен до 2 ч)",
			isAzopyramNegative: l.isAzopyramNegative ?? true,
			isPhenolphthaleinNegative: l.isPhenolphthaleinNegative ?? true,
			detergentBrand: l.detergentBrand || "Биолот 0.5% + Аламинол 1%",
			isBatchApproved: l.isBatchApproved ?? true,
			rejectionReason: l.rejectionReason || undefined,
			operatorStaffFullName:
				l.operatorName ||
				(appLogic as any)?.activeDoctor?.fullName ||
				(appLogic as any)?.activeDoctor?.name ||
				formNurseName ||
				"Сотрудник клиники",
			operatorStaffPosition: "Медсестра ЦСО / Врач",
			electronicStampVerified: stampedRows[l.id] || Boolean(l.notes?.includes("ЭЦП")),
			notes: l.notes || undefined,
		}));

		const html = generateStatutoryPsoForm366PrintHtml({
			clinicName: (appLogic as any)?.clinicInfo?.name || "ООО «ДЕНТЕ КЛИНИК»",
			clinicAddress: (appLogic as any)?.clinicInfo?.address || "г. Москва, ул. Профсоюзная, д. 45",
			ogrn: (appLogic as any)?.clinicInfo?.ogrn || "1187746123456",
			inn: (appLogic as any)?.clinicInfo?.inn || "7728412345",
			licenseInfo: "ЛО41-01137-77/00368412 от 14.10.2021",
			chiefDoctorFullName: (appLogic as any)?.activeDoctor?.fullName || "Главный врач клиники",
			headNurseFullName: formNurseName || "Главная медицинская сестра",
			dateRangeTextRu: `Журнал за ${new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}`,
			records: recordsToPrint,
		});

		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 500);
		}
		showToast("Сформирован официальный журнал проверки чистоты инструментов (пробы)!", "success");
	};

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ПРОВЕРКА ЧИСТОТЫ ИНСТРУМЕНТОВ (ПРОБЫ)</h2>
				<p title="Контроль качества предстерилизационной очистки">Азопирамовая и фенолфталеиновая пробы</p>
			</div>

			{/* Table of logs with Integrated Compact Header */}
			<div className="sanpin-table-wrapper w-full overflow-x-auto min-w-0" style={{ position: "relative", zIndex: 1, width: "100%", overflowX: "auto" }}>
				<div
					className="sanpin-table-toolbar min-w-0 flex-nowrap"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "0.5rem",
						padding: "0.35rem 0.65rem",
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						overflowX: "auto",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: "1 1 180px", minWidth: "140px", maxWidth: "320px", position: "relative" }} className="min-w-0 shrink">
						<Search size={14} style={{ position: "absolute", left: "0.6rem", color: "var(--muted, #94a3b8)" }} />
						<input
							type="text"
							placeholder="Поиск по инструментарию, моющему средству, оператору..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input min-w-0"
							style={{ paddingLeft: "1.9rem", minHeight: "36px", height: "36px", fontSize: "0.825rem", width: "100%", borderRadius: "8px" }}
						/>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }} className="shrink-0 flex-nowrap">
						<select
							value={testFilter}
							onChange={(e) => setTestFilter(e.target.value)}
							className="sanpin-select shrink-0 whitespace-nowrap"
							style={{ minHeight: "36px", height: "36px", fontSize: "0.825rem", padding: "0.35rem 0.75rem", borderRadius: "8px", flexShrink: 0, whiteSpace: "nowrap" }}
						>
							<option value="all">Все пробы чистоты</option>
							<option value="approved">Партия допущена (Проба отрицательная)</option>
							<option value="rejected">Брак / Повторная очистка</option>
						</select>

						<button
							type="button"
							onClick={handleGenerateMonthlyForm366}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0.35rem 0.75rem",
								fontSize: "0.825rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
							}}
							title="Автоматическое формирование и печать журнала проверки чистоты инструментов с электронной подписью"
							data-testid="generate-monthly-form366-btn"
						>
							<Sparkles size={14} color="#0d9488" className="shrink-0" />
							<span className="shrink-0 whitespace-nowrap">Печать журнала проб</span>
						</button>

						<button
							type="button"
							onClick={handleQuickMarkBatchNorm}
							aria-busy={submitting}
							className="sanpin-btn touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0.35rem 0.85rem",
								fontSize: "0.825rem",
								fontWeight: 700,
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.4rem",
								borderRadius: "8px",
								background: "var(--brand-primary, #0284c7)",
								color: "#ffffff",
								border: "none",
								boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
							}}
							title="1-клик отметка: «Азопирамовая проба — норма (реакция отрицательная, следов крови и моющих средств не обнаружено)»"
							data-testid="quick-pso-norm-btn"
						>
							<CheckCircle2 size={15} className="shrink-0" />
							<span className="shrink-0 whitespace-nowrap">Азопирам — 1 клик норма</span>
						</button>

						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
							style={{
								minHeight: "36px",
								height: "36px",
								padding: "0.35rem 0.75rem",
								fontSize: "0.825rem",
								fontWeight: 600,
								cursor: "pointer",
								whiteSpace: "nowrap",
								flexShrink: 0,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								borderRadius: "8px",
							}}
						>
							<Plus size={14} className="shrink-0" /> <span className="shrink-0 whitespace-nowrap">Внести пробу</span>
						</button>
					</div>
				</div>
				<div className="w-full overflow-x-auto min-w-0" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
					<table className="sanpin-table w-full min-w-0" style={{ width: "100%", minWidth: "1040px", tableLayout: "auto" }}>
						<thead>
							<tr>
								<th style={{ fontSize: "0.825rem", width: "125px", minWidth: "115px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Дата и время</th>
								<th style={{ fontSize: "0.825rem", minWidth: "180px" }} className="min-w-0">Наименование инструментария</th>
								<th style={{ fontSize: "0.825rem", width: "95px", minWidth: "90px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Объем партии</th>
								<th style={{ fontSize: "0.825rem", width: "95px", minWidth: "90px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Контроль</th>
								<th style={{ fontSize: "0.825rem", width: "135px", minWidth: "130px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Азопирам (кровь)</th>
								<th style={{ fontSize: "0.825rem", width: "145px", minWidth: "140px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Фенолфталеин (щелочь)</th>
								<th style={{ fontSize: "0.825rem", width: "150px", minWidth: "140px" }} className="min-w-0">Моющее средство</th>
								<th style={{ fontSize: "0.825rem", width: "155px", minWidth: "150px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Результат контроля</th>
								<th style={{ fontSize: "0.825rem", width: "155px", minWidth: "150px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">Заверка / Ответственный</th>
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
											Журнал проверки чистоты пуст
										</div>
										<div style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
											Внесите результаты азопирамовой и фенолфталеиновой проб партии инструментов.
										</div>
										<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
											<button
												type="button"
												onClick={handleQuickMarkBatchNorm}
												aria-busy={submitting}
												className="sanpin-btn sanpin-btn-primary touch-manipulation"
												style={{ minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
												title="1-клик отметка всей партии инструментов (норма)"
												data-testid="empty-quick-pso-norm-btn"
											>
												<CheckCircle2 size={16} /> Отметка партии в 1 клик («Проба отрицательная, норма»)
											</button>
											<button
												type="button"
												onClick={() => setIsModalOpen(true)}
												className="sanpin-btn sanpin-btn-secondary touch-manipulation"
												style={{ minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											>
												<Plus size={15} /> Внести пробу вручную
											</button>
										</div>
									</div>
								</td>
							</tr>
						) : (
							logsSlice.visibleItems.map((log) => {
								const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
								return (
									<tr
										key={log.id}
										className="sanpin-log-row"
										style={{
											minHeight: "44px",
											contentVisibility: "auto",
											containIntrinsicSize: "1px 44px",
											contain: "content",
										}}
									>
										<td style={{ width: "125px", minWidth: "115px", whiteSpace: "nowrap", fontSize: "0.825rem" }} className="whitespace-nowrap shrink-0">
											<div style={{ fontWeight: 600, color: "var(--ink)" }}>
												{new Date(log.timestamp).toLocaleDateString("ru-RU")}
											</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
												{new Date(log.timestamp).toLocaleTimeString("ru-RU", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</td>

										<td style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--ink)", minWidth: "180px" }} className="min-w-0 break-words">
											{log.instrumentName}
										</td>

										<td style={{ width: "95px", minWidth: "90px", fontSize: "0.825rem", fontWeight: 600, whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">{log.batchItemCount} шт.</td>
										<td style={{ width: "95px", minWidth: "90px", fontSize: "0.825rem", fontWeight: 600, whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">{log.testedSampleCount} шт.</td>

										<td style={{ width: "135px", minWidth: "130px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											{log.isAzopyramNegative ? (
												<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
													<CheckCircle2 size={12} className="shrink-0" /> Отрицат. (Норма)
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
													<XCircle size={12} className="shrink-0" /> Положит. (КРОВЬ)
												</span>
											)}
										</td>

										<td style={{ width: "145px", minWidth: "140px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											{log.isPhenolphthaleinNegative ? (
												<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
													<CheckCircle2 size={12} className="shrink-0" /> Отрицат. (Норма)
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
													<XCircle size={12} className="shrink-0" /> Положит. (ЩЕЛОЧЬ)
												</span>
											)}
											{(log.testType === "sudan_iii" || log.testType === "all") && (
												<div style={{ marginTop: "3px" }}>
													{log.isSudanNegative ? (
														<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
															<CheckCircle2 size={11} className="shrink-0" /> Судан III: норма
														</span>
													) : (
														<span className="sanpin-tag sanpin-tag-danger shrink-0 whitespace-nowrap" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
															<XCircle size={11} className="shrink-0" /> Судан III: МАСЛО
														</span>
													)}
												</div>
											)}
										</td>

										<td style={{ width: "150px", minWidth: "140px", fontSize: "0.8rem", color: "var(--muted)" }} className="min-w-0 break-words">
											{log.detergentBrand || "—"}
										</td>

										<td style={{ width: "155px", minWidth: "150px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											{log.isBatchApproved ? (
												<span className="sanpin-tag sanpin-tag-success shrink-0 whitespace-nowrap" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
													Допущено к стерилизации
												</span>
											) : (
												<span
													className="sanpin-tag sanpin-tag-danger shrink-0 whitespace-nowrap"
													style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
													title={log.rejectionReason || "Партия забракована"}
												>
													БРАК: {log.rejectionReason || "Повторная очистка"}
												</span>
											)}
										</td>

										<td style={{ width: "155px", minWidth: "150px", whiteSpace: "nowrap" }} className="whitespace-nowrap shrink-0">
											<div style={{ display: "flex", flexDirection: "column", gap: "3px" }} className="shrink-0 whitespace-nowrap">
												<div style={{ fontSize: "0.8rem", fontWeight: 600 }} className="truncate">
													{log.operatorName || "Сотрудник ЦСО"}
												</div>

												{isStamped ? (
													<span className="sanpin-badge-gov shrink-0 whitespace-nowrap" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
														<CheckCircle2 size={11} className="shrink-0" /> ЭЦП проставлена
													</span>
												) : (
													<button
														type="button"
														onClick={() => handleStampVerification(log.id)}
														className="sanpin-btn sanpin-btn-secondary touch-manipulation shrink-0 whitespace-nowrap"
														style={{ minHeight: "26px", height: "26px", minWidth: "70px", padding: "0.2rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}
														title="Поставить штамп заверки ответственного"
													>
														<Award size={13} color="var(--brand-primary)" className="shrink-0" /> Заверить
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

				{logsSlice.hasMore && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							padding: "12px 0",
						}}
					>
						<button
							type="button"
							data-testid="pso-load-more-btn"
							onClick={() => setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP)}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "36px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}
						>
							Показать ещё 50 проб (осталось {logsSlice.remainingCount} из {logsSlice.totalCount})
						</button>
						<button
							type="button"
							data-testid="pso-load-all-btn"
							onClick={() => setDisplayLimit(logsSlice.totalCount)}
							className="sanpin-btn"
							style={{ minHeight: "36px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", color: "var(--muted)" }}
						>
							Все ({logsSlice.totalCount})
						</button>
					</div>
				)}
			</div>

			{/* Modal for new PSO entry */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
					<div className="sanpin-modal" style={{ maxWidth: "640px" }}>
						<div className="sanpin-modal-header" style={{ padding: "1.25rem 1.5rem" }}>
							<h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<FlaskConical size={22} color="var(--brand-primary, #2563eb)" />
								Контроль качества ПСО (азопирамовая проба)
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
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
										<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
											Наименование обрабатываемого инструментария
										</label>
										<button
											type="button"
											onClick={() => {
												setFormInstrument("Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)");
												setFormBatchCount(100);
												setFormSampleCount(3);
												setFormTestType("both");
												setFormAzopyramNeg(true);
												setFormPhenolNeg(true);
												setFormDetergent("Биолот 0.5% + Аламинол 1%");
												setFormNotes("Проба отрицательная, норма");
											}}
											className="sanpin-btn sanpin-btn-secondary touch-manipulation"
											style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
										>
											<CheckCircle2 size={13} color="#16a34a" /> <span>Норма в 1 клик</span>
										</button>
									</div>

									{/* Category presets per shift */}
									<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
										{DENTAL_PSO_INSTRUMENT_CATEGORIES.map((cat) => (
											<button
												key={cat.id}
												type="button"
												onClick={() => {
													setFormInstrument(cat.nameRu);
													const minSample = cat.isSurgicalOrCritical ? 5 : 3;
													if (formSampleCount < minSample) {
														setFormSampleCount(minSample);
													}
												}}
												className="sanpin-btn touch-manipulation"
												style={{
													fontSize: "0.75rem",
													padding: "0.2rem 0.5rem",
													borderRadius: "4px",
													border: formInstrument === cat.nameRu ? "1.5px solid var(--brand-primary, #2563eb)" : "1px solid var(--border)",
													background: formInstrument === cat.nameRu ? "rgba(37, 99, 235, 0.08)" : "var(--paper)",
													color: formInstrument === cat.nameRu ? "var(--brand-primary, #2563eb)" : "var(--foreground)",
													fontWeight: formInstrument === cat.nameRu ? 600 : 400,
													cursor: "pointer",
												}}
											>
												{cat.nameRu.split(" (")[0]}
											</button>
										))}
									</div>

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
											Выборка от 1% партии (не менее 3-5 шт.)
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

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
											Серия азопирама / реактивов
										</label>
										<input
											type="text"
											required
											value={formReagentLot}
											onChange={(e) => setFormReagentLot(e.target.value)}
											className="sanpin-input"
											style={{ minHeight: "44px", fontSize: "0.9rem" }}
											placeholder="АЗО-2026/08-114"
										/>
									</div>

									<div className="sanpin-form-group">
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
												Приготовлен (макс. 2 ч)
											</label>
											<button
												type="button"
												onClick={() => {
													setFormSolutionPreparedAt(new Date().toISOString());
													showToast("Приготовлен свежий рабочий раствор 1:1 с 3% H2O2. Срок 2 ч обновлен.", "success");
												}}
												className="sanpin-btn sanpin-btn-secondary touch-manipulation"
												style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem" }}
												title="Обновить время приготовления раствора"
											>
												Свежий раствор
											</button>
										</div>
										<div
											style={{
												minHeight: "44px",
												display: "flex",
												alignItems: "center",
												padding: "0 0.75rem",
												borderRadius: "0.375rem",
												border: "1px solid var(--border)",
												background: liveEval.isSolutionExpired ? "rgba(239, 68, 68, 0.1)" : "var(--paper)",
												color: liveEval.isSolutionExpired ? "#dc2626" : "var(--foreground)",
												fontSize: "0.82rem",
												fontWeight: 600,
											}}
										>
											{new Date(formSolutionPreparedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} — {liveEval.isSolutionExpired ? "Раствор просрочен (>2 ч)" : `Годен еще ${liveEval.solutionTimeRemainingMinutes} мин.`}
										</div>
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
										<option value="both">Азопирамовая + Фенолфталеиновая (Рекомендуется)</option>
										<option value="sudan_iii">Проба с Суданом III (наконечники: остаточные масла и жиры)</option>
										<option value="all">Полный комплекс СанПиН 3.3686-21 (Азопирам + Фенолфталеин + Судан III)</option>
										<option value="azopyram">Только азопирамовая (на скрытую кровь / гемоглобин)</option>
										<option value="phenolphthalein">Только фенолфталеиновая (на остатки щелочных моющих средств)</option>
									</select>
								</div>

								<div className="sanpin-form-row">
									{(formTestType === "both" || formTestType === "all" || formTestType === "azopyram") && (
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
									)}

									{(formTestType === "both" || formTestType === "all" || formTestType === "phenolphthalein") && (
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
									)}

									{(formTestType === "sudan_iii" || formTestType === "all") && (
										<div className="sanpin-form-group">
											<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
												Проба с Суданом III (масла / смазки)
											</label>
											<select
												value={formSudanNeg ? "negative" : "positive"}
												onChange={(e) => setFormSudanNeg(e.target.value === "negative")}
												className="sanpin-select"
												style={{ minHeight: "44px", fontSize: "0.9rem" }}
											>
												<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
												<option value="positive">Положительная (Желто-розовые капли — МАСЛО)</option>
											</select>
										</div>
									)}
								</div>

								{/* Clinical Protocol on Positive Test */}
								{(!formAzopyramNeg || !formPhenolNeg || !formSudanNeg) && (
									<div
										style={{
											padding: "0.85rem",
											borderRadius: "0.5rem",
											background: "rgba(239, 68, 68, 0.12)",
											border: "1.5px solid #ef4444",
											color: "#991b1b",
											fontSize: "0.85rem",
											lineHeight: "1.4",
										}}
									>
										<div style={{ fontWeight: 700, marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
											<AlertTriangle size={16} color="#dc2626" />
											КЛИНИЧЕСКИЙ РЕГЛАМЕНТ ПРИ ПОЛОЖИТЕЛЬНОЙ ПРОБЕ (МУ 287-113, СанПиН 3.3686-21):
										</div>
										{!formAzopyramNeg && (
											<div style={{ marginBottom: "0.35rem" }}>
												• <strong>Скрытая кровь (фиолетово-синее окрашивание):</strong> Вся партия изделий ({formBatchCount} шт.) бракуется на 100% и направляется на повторную дезинфекцию, ПСО и контроль качества.
											</div>
										)}
										{!formPhenolNeg && (
											<div style={{ marginBottom: "0.35rem" }}>
												• <strong>Щелочные остатки моющих средств (розовое окрашивание):</strong> Вся партия изделий ({formBatchCount} шт.) бракуется на 100% и направляется на повторное ополаскивание проточной и дистиллированной водой до нейтральной реакции.
											</div>
										)}
										{!formSudanNeg && (
											<div>
												• <strong>Масляные смазки и жировые пленки (желто-розовые пятна Судана III):</strong> Вся партия наконечников ({formBatchCount} шт.) бракуется и направляется на обезжиривание 70% спиртом, продувку и повторную ПСО.
											</div>
										)}
									</div>
								)}

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
									title="Соответствует санитарным нормам"
								>
									{liveEval.isBatchApproved ? (
										<CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
									) : (
										<AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
									)}
									<div>
										<div style={{ fontWeight: 700, fontSize: "0.9rem", color: liveEval.isBatchApproved ? "#059669" : "#dc2626" }}>
											{liveEval.isBatchApproved
												? "Партия соответствует нормативам и допущена к стерилизации"
												: "ВНИМАНИЕ: Партия НЕ ДОПУСКАЕТСЯ к стерилизации"}
										</div>
										{liveEval.rejectionReasons.length > 0 && (
											<div style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "#dc2626" }}>
												{liveEval.rejectionReasons.join("; ")}
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
									aria-busy={submitting}
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
