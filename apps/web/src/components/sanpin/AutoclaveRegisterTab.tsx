import {
	type SterilizationLogRecord,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Clock,
	FileBadge,
	FileSpreadsheet,
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
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import { generateThermalStickerHtml, type KraftPackageRecord } from "./kraft/kraftPackageEngine";

export function AutoclaveRegisterTab() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceFilter, setDeviceFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [kraftPrefill, setKraftPrefill] = useState<{
		autoclaveId?: string | undefined;
		cycleNumber?: number | undefined;
		operatorName?: string | undefined;
	}>({});
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
		const printWin = window.open("", "_blank", "width=500,height=400");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати этикетки", "error");
			return;
		}

		const expFormatted = log.expiresAt
			? new Date(log.expiresAt).toISOString().slice(0, 10)
			: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
		const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
		const barcodeVal = log.barcode || `STER-${log.id.slice(0, 8).toUpperCase()}`;

		const rec: KraftPackageRecord = {
			id: `kp-${log.id}`,
			batchId: `CYC-${log.cycleNumber}`,
			serialNumber: 1,
			packageType: log.packagingType === "laminated_heat_sealed" ? "paper_plastic_pouch" : "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
			itemsListRu: [log.itemsDescription || "Инструментальный набор"],
			packDate,
			expDate: expFormatted,
			daysLifespan: 50,
			daysRemaining: 50,
			status: "sterile_valid",
			autoclaveId: log.deviceName || "АК-01",
			cycleNumber: log.cycleNumber || 1,
			operatorId: log.operatorId || "NURSE-01",
			operatorName: log.operatorName || "Медсестра ЦСО",
			indicatorId: log.indicatorType === "class6_emulating" ? "vinar_inte_6" : log.indicatorType === "class5_integrating" ? "vinar_inte_5" : "vinar_steritest_4",
			indicatorVerified: log.passedIndicator ?? true,
			barcode128: barcodeVal,
			barcodeDataMatrixPayload: `${barcodeVal}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expFormatted}|${log.operatorName || "ЦСО"}`,
			isBreached: false,
			notes: log.notes || "",
			createdAt: new Date(log.timestamp).toISOString(),
		};

		const stickerHtml = generateThermalStickerHtml(rec, {
			size: "58x40",
			clinicName: "Стоматологическая клиника «DENTE»",
		});

		printWin.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Термоэтикетка стерилизации: ${barcodeVal}</title>
				<style>
					@page { size: 58mm 40mm; margin: 0; }
					body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: center; }
				</style>
			</head>
			<body>
				${stickerHtml}
				<script>window.print(); setTimeout(() => window.close(), 600);</script>
			</body>
			</html>
		`);
		printWin.document.close();
	};

	const openKraftForLog = (log: SterilizationLogRecord) => {
		setKraftPrefill({
			autoclaveId: log.deviceName || undefined,
			cycleNumber: log.cycleNumber || undefined,
			operatorName: log.operatorName || undefined,
		});
		setIsKraftModalOpen(true);
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

				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => window.print()}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "40px", padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
						title="Печать официальной формы 257/у для Роспотребнадзора"
					>
						<Printer size={16} /> Печать формы 257/у
					</button>

					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "40px", padding: "0.45rem 1rem", fontSize: "0.88rem", fontWeight: 700 }}
					>
						<Plus size={16} /> Зафиксировать цикл
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
												<div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
													Зав. №{log.serialNumber}
												</div>
											)}
										</td>

										<td style={{ fontSize: "0.875rem", maxWidth: "220px" }}>
											<div style={{ fontWeight: 500 }}>{log.itemsDescription || "Стоматологический набор"}</div>
										</td>

										<td style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
											{log.packagingType === "kraft_heat_sealed"
												? "Крафт термосварной (365 дн)"
												: log.packagingType === "kraft_self_adhesive"
													? "Крафт самоклеящийся (50 сут)"
													: log.packagingType === "laminated_heat_sealed"
														? "Ламинированный пакет (180 дн)"
														: log.packagingType === "metal_cassette"
															? "Металл. кассета (72 ч)"
															: log.packagingType === "bix_filter"
																? "Бикс с фильтром (20 сут)"
																: "Без упаковки (вскрыть сразу)"}
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
													<CheckCircle2 size={14} /> {log.indicatorType === "class5_integrating" ? "Класс 5 (Норма)" : log.indicatorType === "class6_emulating" ? "Класс 6 (Эмулятор)" : log.indicatorType === "class4_multivariable" ? "Класс 4 (Многопарам.)" : log.indicatorType || "Класс 5"}
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
													<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.825rem", width: "fit-content" }}>
														Стерильно
													</span>
													{log.barcode && (
														<span style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--muted)", fontWeight: 600 }}>
															{log.barcode}
														</span>
													)}
												</div>
											) : (
												<span className="sanpin-tag sanpin-tag-danger" style={{ fontSize: "0.825rem" }}>
													БРАК / КАРАНТИН
												</span>
											)}
										</td>

										<td>
											<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
												<div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
													{log.operatorName || "Медсестра ЦСО"}
												</div>

												<div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
													{isStamped ? (
														<span className="sanpin-badge-gov" style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}>
															<CheckCircle2 size={13} /> ЭЦП проставлена
														</span>
													) : (
														<button
															type="button"
															onClick={() => handleStampVerification(log.id)}
															className="sanpin-btn sanpin-btn-secondary"
															style={{ minHeight: "44px", minWidth: "44px", padding: "0.3rem 0.6rem", fontSize: "0.825rem" }}
															title="Поставить штамп заверки медсестры"
														>
															<Award size={14} color="var(--brand-primary)" /> Заверить
														</button>
													)}

													<button
														type="button"
														onClick={() => openKraftForLog(log)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "44px", padding: "0.3rem 0.65rem", fontSize: "0.825rem", color: "var(--brand-primary)", borderColor: "var(--brand-primary)" }}
														title="Сформировать партию термоэтикеток крафт-пакетов в студии"
													>
														<QrCode size={14} /> Маркировка
													</button>

													<button
														type="button"
														onClick={() => handlePrintSinglePouch(log)}
														className="sanpin-btn sanpin-btn-secondary"
														style={{ minHeight: "44px", minWidth: "44px", padding: "0.3rem 0.6rem", fontSize: "0.825rem" }}
														title="Быстрая печать термоэтикетки (58x40 мм / DataMatrix)"
													>
														<Tag size={14} />
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

			{/* Kraft Package Barcode & Thermal Label Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				onClose={() => setIsKraftModalOpen(false)}
				initialAutoclaveId={kraftPrefill.autoclaveId}
				initialCycleNumber={kraftPrefill.cycleNumber || nextCycleNumber}
				initialOperatorName={kraftPrefill.operatorName}
			/>

			{/* Form 257/u Studio Modal: 5 Chamber Points, BioControl, Analytics */}
			<AutoclaveLog257Modal
				isOpen={isJournal257ModalOpen}
				onClose={() => setIsJournal257ModalOpen(false)}
			/>
		</div>
	);
}
