import {
	type SterilizationLogRecord,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Clock,
	FileBadge,
	FileText,
	Flame,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { SanpinCycleModal } from "./SanpinCycleModal";

export function AutoclaveRegisterTab() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceFilter, setDeviceFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/sterilization", {
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
			console.error("Failed to load sterilization logs", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, []);

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const matchSearch =
				!searchQuery ||
				log.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.itemsDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchDevice =
				deviceFilter === "all" ||
				(deviceFilter === "passed" && log.status === "passed") ||
				(deviceFilter === "failed" && log.status === "failed");

			return matchSearch && matchDevice;
		});
	}, [logs, searchQuery, deviceFilter]);

	const handleStampVerification = (logId: string) => {
		setStampedRows((prev) => ({
			...prev,
			[logId]: true,
		}));
		showToast("Электронный штамп медсестры ЦСО успешно применен к записи", "success");
	};

	const handlePrintSinglePouch = (log: SterilizationLogRecord) => {
		const printWin = window.open("", "_blank", "width=400,height=300");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати этикетки", "error");
			return;
		}
		const expFormatted = log.expiresAt
			? new Date(log.expiresAt).toLocaleDateString("ru-RU")
			: "Вскрыть сразу";

		printWin.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Бирка стерилизации: ${log.barcode || "Пакет"}</title>
				<style>
					body { font-family: monospace; padding: 10px; font-size: 11pt; color: #000; }
					.border-box { border: 2px solid #000; padding: 8px; border-radius: 4px; }
					.title { font-weight: bold; font-size: 13pt; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
					.row { display: flex; justify-content: space-between; margin-bottom: 4px; }
					.barcode { font-size: 14pt; font-weight: bold; text-align: center; letter-spacing: 2px; margin: 8px 0; background: #eee; padding: 4px; }
					.stamp { font-size: 9pt; text-align: center; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; }
				</style>
			</head>
			<body>
				<div class="border-box">
					<div class="title">СТЕРИЛЬНО / ФОРМА № 257/у</div>
					<div class="row"><span>Аппарат:</span> <strong>${log.deviceName}</strong></div>
					<div class="row"><span>Цикл:</span> <strong>№ ${log.cycleNumber} (${log.temperatureCelsius || 134}°C / ${log.durationMin || 5} мин)</strong></div>
					<div class="row"><span>Дата стерилизации:</span> <strong>${new Date(log.timestamp).toLocaleDateString("ru-RU")}</strong></div>
					<div class="row"><span>Годен до:</span> <strong>${expFormatted}</strong></div>
					<div class="row"><span>Содержимое:</span> <span>${(log.itemsDescription || "Стоматологический лоток").slice(0, 32)}</span></div>
					<div class="barcode">*${log.barcode || `STER-${log.id.slice(0, 8).toUpperCase()}`}*</div>
					<div class="stamp">МЕДСЕСТРА ЦСО: ${log.operatorName || "Сотрудник ЦСО"} | СТАТУС: СТЕРИЛЬНО</div>
				</div>
				<script>window.print(); setTimeout(() => window.close(), 500);</script>
			</body>
			</html>
		`);
		printWin.document.close();
	};

	const nextCycleNumber = useMemo(() => {
		if (logs.length === 0) return 1;
		const first = logs[0];
		return (first?.cycleNumber || 0) + 1;
	}, [logs]);

	return (
		<div className="sanpin-tab-content">
			{/* Official Form Header for Print */}
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ И СУХОЖАРОВЫХ ШКАФОВ (ФОРМА № 257/у)</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			{/* Control Bar: Filters, Search, Actions */}
			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={18} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по аппарату, лотку, штрихкоду, оператору..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2.3rem", minWidth: "300px", minHeight: "44px", fontSize: "0.9rem" }}
						/>
					</div>

					<select
						value={deviceFilter}
						onChange={(e) => setDeviceFilter(e.target.value)}
						className="sanpin-select"
						style={{ minHeight: "44px", fontSize: "0.9rem" }}
					>
						<option value="all">Все циклы стерилизации</option>
						<option value="passed">Стерилизация подтверждена (Норма)</option>
						<option value="failed">Брак индикатора / Сбой</option>
					</select>
				</div>

				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button
						type="button"
						onClick={() => window.print()}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.9rem" }}
						title="Печать официальной формы 257/у для Роспотребнадзора"
					>
						<Printer size={16} /> Печать формы 257/у
					</button>

					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.95rem", fontWeight: 700 }}
					>
						<Plus size={18} /> Зафиксировать цикл
					</button>
				</div>
			</div>

			{/* Table of Sterilization Cycles */}
			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Дата / № Цикла</th>
							<th style={{ fontSize: "0.85rem" }}>Марка аппарата</th>
							<th style={{ fontSize: "0.85rem" }}>Стерилизуемые изделия</th>
							<th style={{ fontSize: "0.85rem" }}>Вид упаковки</th>
							<th style={{ fontSize: "0.85rem" }}>Режим (T°, Давл., Время)</th>
							<th style={{ fontSize: "0.85rem" }}>Хим. индикатор</th>
							<th style={{ fontSize: "0.85rem" }}>Срок годности</th>
							<th style={{ fontSize: "0.85rem" }}>Штрихкод / Статус</th>
							<th style={{ fontSize: "0.85rem" }}>Заверка / Оператор</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", fontSize: "0.95rem" }}>
									Загрузка журнала стерилизаторов...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "var(--muted)", fontSize: "0.95rem" }}>
									Записи циклов стерилизации не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => {
								const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
								return (
									<tr key={log.id} style={{ minHeight: "56px" }}>
										<td>
											<div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>
												Цикл №{log.cycleNumber}
											</div>
											<div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
												{new Date(log.timestamp).toLocaleString("ru-RU", {
													day: "2-digit",
													month: "2-digit",
													year: "2-digit",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</td>

										<td style={{ fontWeight: 600, fontSize: "0.875rem" }}>
											<div>{log.deviceName}</div>
											{log.serialNumber && (
												<div style={{ fontSize: "0.775rem", color: "var(--muted)" }}>
													Зав. №{log.serialNumber}
												</div>
											)}
										</td>

										<td style={{ fontSize: "0.875rem", maxWidth: "220px" }}>
											<div style={{ fontWeight: 500 }}>{log.itemsDescription || "Стоматологический набор"}</div>
										</td>

										<td style={{ fontSize: "0.825rem", color: "var(--ink)" }}>
											{log.packagingType === "kraft_heat_sealed"
												? "Крафт термосварной"
												: log.packagingType === "kraft_self_adhesive"
													? "Крафт самоклеящийся"
													: log.packagingType === "laminated_heat_sealed"
														? "Ламинированный пакет"
														: log.packagingType === "metal_cassette"
															? "Металл. кассета"
															: log.packagingType === "bix_filter"
																? "Бикс с фильтром"
																: "Без упаковки"}
										</td>

										<td style={{ fontSize: "0.875rem" }}>
											<span style={{ fontWeight: 700, color: "var(--ink)" }}>
												{log.temperatureCelsius || 134}°C
											</span>
											{log.pressureBar && (
												<span style={{ color: "var(--muted)", fontWeight: 500 }}> / {log.pressureBar} бар</span>
											)}
											{log.durationMin && (
												<span style={{ color: "var(--muted)", fontWeight: 500 }}> / {log.durationMin} мин</span>
											)}
										</td>

										<td>
											{log.passedIndicator ? (
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.825rem", padding: "0.3rem 0.6rem" }}>
													<CheckCircle2 size={14} /> {log.indicatorType === "class5_integrating" ? "Класс 5 (Норма)" : log.indicatorType || "Класс 5"}
												</span>
											) : (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.825rem", padding: "0.3rem 0.6rem" }}>
													<XCircle size={14} /> Не сработал (!)
												</span>
											)}
										</td>

										<td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
											{log.expiresAt ? (
												<span style={{ fontWeight: 600, color: "#059669" }}>
													{new Date(log.expiresAt).toLocaleDateString("ru-RU")}
												</span>
											) : (
												<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
											)}
										</td>

										<td>
											{log.status === "passed" ? (
												<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
													<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.8rem", width: "fit-content" }}>
														Стерильно
													</span>
													{log.barcode && (
														<span style={{ fontSize: "0.775rem", fontFamily: "monospace", color: "var(--muted)", fontWeight: 600 }}>
															{log.barcode}
														</span>
													)}
												</div>
											) : (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.8rem" }}>
													БРАК / КАРАНТИН
												</span>
											)}
										</td>

										<td>
											<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
												<div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
													{log.operatorName || "Медсестра ЦСО"}
												</div>

												<div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
													{isStamped ? (
														<span className="sanpin-badge-gov" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}>
															<CheckCircle2 size={12} /> ЭЦП проставлена
														</span>
													) : (
														<button
															type="button"
															onClick={() => handleStampVerification(log.id)}
															className="sanpin-btn sanpin-btn-secondary"
															style={{ minHeight: "36px", minWidth: "44px", padding: "0.2rem 0.5rem", fontSize: "0.775rem" }}
															title="Поставить штамп заверки медсестры"
														>
															<Award size={13} color="var(--brand-primary)" /> Заверить
														</button>
													)}

													<button
														type="button"
														onClick={() => handlePrintSinglePouch(log)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "36px", minWidth: "36px", padding: "0.2rem 0.45rem", fontSize: "0.775rem" }}
														title="Печать бирки пакета"
													>
														<Tag size={13} />
													</button>
												</div>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* SanPiN Sterilization Cycle Modal */}
			<SanpinCycleModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onSuccess={fetchLogs}
				suggestedCycleNumber={nextCycleNumber}
			/>
		</div>
	);
}
