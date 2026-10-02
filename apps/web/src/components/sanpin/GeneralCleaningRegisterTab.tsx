import {
	type CreateGeneralCleaningLogDto,
	type GeneralCleaningLog,
} from "@dental/shared";
import {
	Calculator,
	Download,
	MoreHorizontal,
	Plus,
	Printer,
	Search,
	Sparkles,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";
import { GeneralCleaningModal } from "./disinfection/GeneralCleaningModal";
import { GeneralCleaningAddLogModal } from "./GeneralCleaningAddLogModal";
import { GeneralCleaningLogTable } from "./GeneralCleaningLogTable";
import {
	exportGeneralCleaningLogsCsv,
	printGeneralCleaningJournal,
} from "./generalCleaningPrintHelpers";
import { GeneralCleaningSchedule } from "./GeneralCleaningSchedule";

export function GeneralCleaningRegisterTab() {
	const appLogic = useOptionalAppLogicContext();
	const [logs, setLogs] = useState<GeneralCleaningLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDisinfectionModalOpen, setIsDisinfectionModalOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"table" | "schedule">("table");
	const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);
	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOptionsClickOutside = (event: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOptionsClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleOptionsClickOutside);
	}, [isOptionsMenuOpen]);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/cleaning", {
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
			console.error("Failed to load cleaning logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	// 1-Клик автопилот графика генеральных уборок на месяц (по СанПиН каждые 7 дней)
	const handleAutopilotMonth = async () => {
		if (isAutopilotLoading) return;
		try {
			setIsAutopilotLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/cleaning/autopilot-month", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({}),
			});
			if (res.ok) {
				const data = await res.json().catch(() => ({}));
				showToast(
					`График генеральных уборок на месяц успешно заполнен (${data.count || 20} уборок, интервал 7 дней)`,
					"success",
				);
				await fetchLogs();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при генерации графика", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при генерации графика", "error");
		} finally {
			setIsAutopilotLoading(false);
		}
	};

	// 1-Клик фиксация генеральной уборки по норме (Мандаты 8e, 8k)
	const handleQuickRecordNormCleaning = async () => {
		if (submitting) return;
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const todayStr = new Date().toISOString().slice(0, 10);
			const nowStr = new Date().toISOString();

			const payload: CreateGeneralCleaningLogDto = {
				cleaningType: "general",
				scheduledDate: todayStr,
				actualDateTime: nowStr,
				roomName: "Операционная / Хирургический кабинет №1",
				treatedAreaM2: 32.5,
				disinfectantName: "Аламинол 5%",
				activeIngredient: "Алкилдиметилбензиламмоний хлорид + Глутаровый альдегид",
				solutionConcentrationPercent: 5.0,
				applicationMethod: "wiping",
				exposureTimeMinutes: 60,
				uvIrradiationMinutes: 120,
				ventilationMinutes: 15,
				status: "completed",
				notes: "Уборка по графику выполнена: Дезсредство Аламинол 5%, экспозиция 60 мин, УФ 120 мин, проветривание 15 мин. Поверхности чистые.",
			};

			const res = await fetch("/api/registers/cleaning", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Уборка по норме успешно зафиксирована (Аламинол 5%, 60 мин, УФ 120 мин)", "success");
				await fetchLogs();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при фиксации уборки", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при фиксации уборки", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleVerify = async (id: string) => {
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch(`/api/registers/cleaning/${id}/verify`, {
				method: "PUT",
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});
			if (res.ok) {
				showToast("Качество уборки заверено ответственным лицом", "success");
				fetchLogs();
			}
		} catch (err) {
			showToast("Ошибка при подтверждении", "error");
		}
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.disinfectantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchType =
				typeFilter === "all" || log.cleaningType === typeFilter;

			return matchSearch && matchType;
		});
	}, [logs, searchQuery, typeFilter]);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ ГЕНЕРАЛЬНЫХ УБОРОК</h2>
				<p title="СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»">График и журнал проведения генеральных уборок и заключительной дезинфекции</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={16} style={{ position: "absolute", left: "0.6rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по кабинету, дезсредству..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2rem", minWidth: "240px", height: "36px" }}
						/>
					</div>
					<select
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						className="sanpin-select"
						style={{ height: "36px" }}
					>
						<option value="all">Все виды уборок</option>
						<option value="general">Генеральные уборки</option>
						<option value="current_routine">Текущая дезинфекция</option>
					</select>
				</div>

				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
					<div style={{ display: "inline-flex", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", overflow: "hidden", height: "36px" }}>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							style={{
								padding: "0.35rem 0.75rem",
								minHeight: "36px",
								fontSize: "0.825rem",
								fontWeight: 700,
								border: "none",
								cursor: "pointer",
								background: viewMode === "table" ? "var(--teal-soft, #f0fdfa)" : "var(--paper, #ffffff)",
								color: viewMode === "table" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)",
							}}
						>
							Таблица
						</button>
						<button
							type="button"
							onClick={() => setViewMode("schedule")}
							style={{
								padding: "0.35rem 0.75rem",
								minHeight: "36px",
								fontSize: "0.825rem",
								fontWeight: 700,
								border: "none",
								borderLeft: "1px solid var(--line, #cbd5e1)",
								cursor: "pointer",
								background: viewMode === "schedule" ? "var(--teal-soft, #f0fdfa)" : "var(--paper, #ffffff)",
								color: viewMode === "schedule" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)",
							}}
						>
							График (7 дн.)
						</button>
					</div>

					<button
						type="button"
						onClick={() => setIsDisinfectionModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ height: "36px", minHeight: "36px", padding: "0 0.85rem", fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
						title="Честный расчет концентрации, расхода дезраствора и график генеральной уборки (СанПиН 3.3686-21)"
					>
						<Calculator size={15} className="text-[var(--teal,#0d9488)]" /> Расчет дезсредства
					</button>

					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{ height: "36px", minHeight: "36px", padding: "0 0.85rem", fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
					>
						<Plus size={15} /> Зафиксировать уборку
					</button>

					<div style={{ position: "relative" }} ref={optionsMenuRef}>
						<button
							type="button"
							onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ height: "36px", minHeight: "36px", padding: "0 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.825rem" }}
							title="Дополнительные опции: автопилот графика, норма СанПиН, экспорт, печать"
							aria-label="Опции журнала"
						>
							<MoreHorizontal size={16} />
							<span>Опции</span>
						</button>

						{isOptionsMenuOpen && (
							<div
								style={{
									position: "absolute",
									right: 0,
									top: "100%",
									marginTop: "4px",
									zIndex: 40,
									width: "280px",
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "8px",
									boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
									padding: "0.35rem",
									display: "flex",
									flexDirection: "column",
									gap: "0.25rem",
								}}
							>
								<button
									type="button"
									onClick={() => {
										setIsOptionsMenuOpen(false);
										handleAutopilotMonth();
									}}
									aria-busy={isAutopilotLoading}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.45rem 0.65rem",
										fontSize: "0.78rem",
										textAlign: "left",
										background: "none",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer",
										color: "var(--teal, #0d9488)",
										fontWeight: 700,
										opacity: isAutopilotLoading ? 0.7 : 1,
									}}
									className="hover:bg-[var(--paper-soft,#f1f5f9)]"
									data-testid="nurse-cleaning-monthly-autopilot-btn"
								>
									<Sparkles size={14} />
									<span>
										{isAutopilotLoading
											? "Формирование графика..."
											: "Заполнить график уборок на месяц (7 дн.)"}
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsOptionsMenuOpen(false);
										handleQuickRecordNormCleaning();
									}}
									aria-busy={submitting}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.45rem 0.65rem",
										fontSize: "0.78rem",
										textAlign: "left",
										background: "none",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer",
										color: "var(--ink)",
										opacity: submitting ? 0.7 : 1,
									}}
									className="hover:bg-[var(--paper-soft,#f1f5f9)]"
									data-testid="nurse-1click-norm-cleaning-btn"
								>
									<Sparkles size={14} color="var(--teal, #0d9488)" />
									<span>1-Клик норма (Аламинол 5%)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsOptionsMenuOpen(false);
										exportGeneralCleaningLogsCsv(filteredLogs);
									}}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.45rem 0.65rem",
										fontSize: "0.78rem",
										textAlign: "left",
										background: "none",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer",
										color: "var(--ink)",
									}}
									className="hover:bg-[var(--paper-soft,#f1f5f9)]"
								>
									<Download size={14} />
									<span>Экспорт журнала в CSV</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsOptionsMenuOpen(false);
										printGeneralCleaningJournal(logs, appLogic);
									}}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.45rem 0.65rem",
										fontSize: "0.78rem",
										textAlign: "left",
										background: "none",
										border: "none",
										borderRadius: "4px",
										cursor: "pointer",
										color: "var(--ink)",
									}}
									className="hover:bg-[var(--paper-soft,#f1f5f9)]"
									data-testid="print-general-cleaning-journal-btn"
								>
									<Printer size={14} />
									<span>Печать журнала / PDF</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{viewMode === "schedule" ? (
				<GeneralCleaningSchedule logs={logs} onScheduleUpdated={fetchLogs} />
			) : (
				<GeneralCleaningLogTable
					logs={filteredLogs}
					loading={loading}
					onVerify={handleVerify}
				/>
			)}

			<GeneralCleaningAddLogModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={fetchLogs}
			/>

			<GeneralCleaningModal
				isOpen={isDisinfectionModalOpen}
				onClose={() => setIsDisinfectionModalOpen(false)}
				onSuccess={fetchLogs}
			/>
		</div>
	);
}

export * from "./GeneralCleaningAddLogModal";
export * from "./GeneralCleaningLogTable";
export * from "./generalCleaningPrintHelpers";
