import {
	type CreateSterilizationLogDto,
	type SterilizationDeviceType,
	type SterilizerIndicatorClass,
	type SterilizerPackagingType,
	type SterilizationLogRecord,
	computePackagingExpirationDate,
} from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Flame,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldCheck,
	Sparkles,
	XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export function AutoclaveRegisterTab() {
	const [logs, setLogs] = useState<SterilizationLogRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceFilter, setDeviceFilter] = useState<string>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);

	// New sterilization cycle state
	const [formDeviceName, setFormDeviceName] = useState("Melag Vacuklav 23 B+");
	const [formSterilizerType, setFormSterilizerType] = useState<SterilizationDeviceType>("autoclave_steam");
	const [formCycleNumber, setFormCycleNumber] = useState<number>(1);
	const [formItems, setFormItems] = useState("Хирургический набор (щипцы, элеваторы, кюреты)");
	const [formPackaging, setFormPackaging] = useState<SterilizerPackagingType>("kraft_heat_sealed");
	const [formTemp, setFormTemp] = useState<number>(134);
	const [formPressure, setFormPressure] = useState<number>(2.15);
	const [formDuration, setFormDuration] = useState<number>(5);
	const [formIndicator, setFormIndicator] = useState<SterilizerIndicatorClass>("class5_integrating");
	const [formIndicatorPassed, setFormIndicatorPassed] = useState(true);
	const [formBioResult, setFormBioResult] = useState<"passed" | "failed" | "not_conducted">("not_conducted");
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

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
				if (data.length > 0) {
					// auto-increment cycle number for convenience
					setFormCycleNumber(data[0].cycleNumber + 1);
				}
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

	// Calculate expiration date preview
	const estimatedExpiration = useMemo(() => {
		return computePackagingExpirationDate(formPackaging, new Date());
	}, [formPackaging]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateSterilizationLogDto = {
				deviceName: formDeviceName,
				sterilizerType: formSterilizerType,
				cycleNumber: Number(formCycleNumber),
				itemsDescription: formItems,
				packagingType: formPackaging,
				temperatureCelsius: Number(formTemp),
				pressureBar: formSterilizerType === "autoclave_steam" ? Number(formPressure) : null,
				durationMin: Number(formDuration),
				indicatorType: formIndicator,
				passedIndicator: formIndicatorPassed,
				biologicalTestResult: formBioResult,
				notes: formNotes || undefined,
			};

			const res = await fetch("/api/registers/sterilization", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Стерилизационный цикл зафиксирован в журнале (Форма № 257/у)", "success");
				setIsModalOpen(false);
				fetchLogs();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении цикла", "error");
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

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ И СУХОЖАРОВЫХ ШКАФОВ (ФОРМА № 257/у)</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней»</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={16} style={{ position: "absolute", left: "0.6rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по аппарату, лотку, штрихкоду..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2rem", minWidth: "260px" }}
						/>
					</div>
					<select
						value={deviceFilter}
						onChange={(e) => setDeviceFilter(e.target.value)}
						className="sanpin-select"
					>
						<option value="all">Все циклы</option>
						<option value="passed">Стерилизация подтверждена</option>
						<option value="failed">Брак индикатора / Сбой</option>
					</select>
				</div>

				<div style={{ display: "flex", gap: "0.5rem" }}>
					<button type="button" onClick={() => window.print()} className="sanpin-btn sanpin-btn-secondary">
						<Printer size={15} /> Печать формы 257/у
					</button>
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
					>
						<Plus size={15} /> Зафиксировать цикл
					</button>
				</div>
			</div>

			{/* Table of Sterilization Cycles */}
			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th>Дата / Цикл</th>
							<th>Марка аппарата</th>
							<th>Стерилизуемые изделия</th>
							<th>Упаковка</th>
							<th>Режим (T°, Давление, Время)</th>
							<th>Хим. тест (Индикатор)</th>
							<th>Срок годности</th>
							<th>Штрихкод / Статус</th>
							<th>Оператор</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
									Загрузка журнала стерилизаторов...
								</td>
							</tr>
						) : filteredLogs.length === 0 ? (
							<tr>
								<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
									Записи циклов стерилизации не найдены.
								</td>
							</tr>
						) : (
							filteredLogs.map((log) => (
								<tr key={log.id}>
									<td>
										<div style={{ fontWeight: 600 }}>Цикл №{log.cycleNumber}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
											{new Date(log.timestamp).toLocaleString("ru-RU", {
												day: "2-digit",
												month: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</div>
									</td>
									<td style={{ fontWeight: 500 }}>{log.deviceName}</td>
									<td>{log.itemsDescription || "Стоматологический набор"}</td>
									<td style={{ fontSize: "0.775rem", color: "var(--muted)" }}>
										{log.packagingType === "kraft_heat_sealed"
											? "Крафт-пакет термосварной"
											: log.packagingType === "kraft_self_adhesive"
												? "Крафт самоклеящийся"
												: log.packagingType === "metal_cassette"
													? "Металлическая кассета"
													: log.packagingType === "bix_filter"
														? "Бикс с фильтром"
														: "Без упаковки"}
									</td>
									<td>
										<span style={{ fontWeight: 600 }}>{log.temperatureCelsius || 134}°C</span>
										{log.pressureBar && <span style={{ color: "var(--muted)" }}> / {log.pressureBar} бар</span>}
										{log.durationMin && <span style={{ color: "var(--muted)" }}> / {log.durationMin} мин</span>}
									</td>
									<td>
										{log.passedIndicator ? (
											<span className="sanpin-tag sanpin-tag-success">
												<CheckCircle2 size={12} /> {log.indicatorType || "Класс 5 (Норма)"}
											</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">
												<XCircle size={12} /> Не сработал (!)
											</span>
										)}
									</td>
									<td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
										{log.expiresAt ? (
											new Date(log.expiresAt).toLocaleDateString("ru-RU")
										) : (
											<span style={{ color: "var(--muted)" }}>Вскрыть сразу</span>
										)}
									</td>
									<td>
										{log.status === "passed" ? (
											<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
												<span className="sanpin-tag sanpin-tag-success">Стерильно</span>
												{log.barcode && (
													<span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--muted)" }}>
														{log.barcode}
													</span>
												)}
											</div>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">БРАК / КАРАНТИН</span>
										)}
									</td>
									<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Медсестра ЦСО"}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Modal for new sterilization cycle */}
			{isModalOpen && (
				<div className="sanpin-modal-overlay">
					<div className="sanpin-modal">
						<div className="sanpin-modal-header">
							<h3>Регистрация цикла стерилизации (Форма № 257/у)</h3>
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
								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Марка стерилизатора</label>
										<input
											type="text"
											required
											value={formDeviceName}
											onChange={(e) => setFormDeviceName(e.target.value)}
											className="sanpin-input"
											placeholder="Melag Vacuklav 23B+ / W&H Lisa"
										/>
									</div>
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Номер цикла за смену</label>
										<input
											type="number"
											min={1}
											required
											value={formCycleNumber}
											onChange={(e) => setFormCycleNumber(parseInt(e.target.value) || 1)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Тип аппарата</label>
									<select
										value={formSterilizerType}
										onChange={(e) => {
											const t = e.target.value as SterilizationDeviceType;
											setFormSterilizerType(t);
											if (t === "dry_heat") {
												setFormTemp(180);
												setFormDuration(60);
											} else {
												setFormTemp(134);
												setFormDuration(5);
												setFormPressure(2.15);
											}
										}}
										className="sanpin-select"
									>
										<option value="autoclave_steam">Паровой автоклав (Класс B/S — 134°C / 121°C)</option>
										<option value="dry_heat">Сухожаровой шкаф (Воздушный — 180°C / 60 мин)</option>
										<option value="plasma">Плазменный низкотемпературный стерилизатор</option>
									</select>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label">Наименование стерилизуемых изделий и лотков</label>
									<textarea
										rows={2}
										required
										value={formItems}
										onChange={(e) => setFormItems(e.target.value)}
										className="sanpin-input"
										placeholder="Например: Хирургический набор №2 (элеваторы, щипцы, скальпель), наконечники, боры"
									/>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Вид упаковочного материала</label>
										<select
											value={formPackaging}
											onChange={(e) => setFormPackaging(e.target.value as SterilizerPackagingType)}
											className="sanpin-select"
										>
											<option value="kraft_heat_sealed">Крафт-пакет термосвариваемый (Срок: 1 год)</option>
											<option value="kraft_self_adhesive">Крафт-пакет самоклеящийся (Срок: 20-50 суток)</option>
											<option value="bix_filter">Стерилизационная коробка (бикс с фильтром, 20 суток)</option>
											<option value="metal_cassette">Металлическая кассета (закрытая, 72 часа)</option>
											<option value="unpacked">Без упаковки (вскрыть и использовать немедленно)</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Химический индикатор контроля</label>
										<select
											value={formIndicator}
											onChange={(e) => setFormIndicator(e.target.value as SterilizerIndicatorClass)}
											className="sanpin-select"
										>
											<option value="class5_integrating">Класс 5 (Интегрирующий индикатор — Норма)</option>
											<option value="class6_emulating">Класс 6 (Эмулирующий индикатор)</option>
											<option value="class4_multivariable">Класс 4 (Многопеременный)</option>
											<option value="biological">Биологический тест (споровый)</option>
										</select>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Температура (°C)</label>
										<input
											type="number"
											value={formTemp}
											onChange={(e) => setFormTemp(parseFloat(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>
									{formSterilizerType === "autoclave_steam" && (
										<div className="sanpin-form-group">
											<label className="sanpin-form-label">Давление (бар)</label>
											<input
												type="number"
												step="0.01"
												value={formPressure}
												onChange={(e) => setFormPressure(parseFloat(e.target.value) || 0)}
												className="sanpin-input"
											/>
										</div>
									)}
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Время стерилизации (мин)</label>
										<input
											type="number"
											value={formDuration}
											onChange={(e) => setFormDuration(parseInt(e.target.value) || 0)}
											className="sanpin-input"
										/>
									</div>
								</div>

								<div className="sanpin-form-row">
									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Срабатывание хим. индикатора</label>
										<select
											value={formIndicatorPassed ? "passed" : "failed"}
											onChange={(e) => setFormIndicatorPassed(e.target.value === "passed")}
											className="sanpin-select"
										>
											<option value="passed">Сработал (Цвет эталона достигнут — СТЕРИЛЬНО)</option>
											<option value="failed">Не сработал (Неполный переход цвета — БРАК)</option>
										</select>
									</div>

									<div className="sanpin-form-group">
										<label className="sanpin-form-label">Расчетный срок стерильности</label>
										<div
											style={{
												padding: "0.5rem 0.75rem",
												background: "var(--paper-subtle)",
												borderRadius: "0.375rem",
												border: "1px solid var(--glass-border)",
												fontSize: "0.85rem",
												fontWeight: 600,
												color: "var(--brand-primary)",
											}}
										>
											{estimatedExpiration
												? new Date(estimatedExpiration).toLocaleDateString("ru-RU", {
														day: "numeric",
														month: "long",
														year: "numeric",
													})
												: "Использовать немедленно"}
										</div>
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
									{submitting ? "Сохранение..." : "Сохранить и сгенерировать штрихкод"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
