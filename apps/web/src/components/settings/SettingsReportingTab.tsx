import React, { useCallback, useState } from "react";
import { BarChart3, Copy, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function SettingsReportingTab() {
	const { denteClinicalReadHeaders, clinicSettings } = useAppLogicContext();
	const rSettings = clinicSettings?.reportingSettings || {};

	const [syncEnabled, setSyncEnabled] = useState(rSettings.syncEnabled || false);
	const [exportFormat, setExportFormat] = useState(rSettings.exportFormat || "json");
	const [syncFrequency, setSyncFrequency] = useState(rSettings.syncFrequency || "daily");
	const [apiToken, setApiToken] = useState<string | null>(rSettings.apiToken || null);
	const [tokenLoading, setTokenLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const handleGenerateToken = useCallback(async () => {
		setTokenLoading(true);
		try {
			const res = await fetch("/api/reporting/token/generate", {
				method: "POST",
				headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error("Ошибка генерации токена");
			const json = await res.json();
			if (json.token) {
				setApiToken(json.token);
				showToast("Новый токен сгенерирован", "success");
			}
		} catch {
			showToast("Не удалось сгенерировать токен", "error");
		} finally {
			setTokenLoading(false);
		}
	}, [denteClinicalReadHeaders]);

	const handleCopyToken = useCallback(() => {
		if (!apiToken) return;
		void navigator.clipboard.writeText(apiToken);
		showToast("Токен скопирован", "success");
	}, [apiToken]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			const res = await fetch("/api/clinic/reporting-settings", {
				method: "POST",
				headers: { ...denteClinicalReadHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({ syncEnabled, exportFormat, syncFrequency }),
			});
			if (!res.ok) throw new Error("save failed");
			showToast("Настройки отчетности сохранены", "success");
		} catch {
			showToast("Ошибка сохранения", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<BarChart3 aria-hidden="true" />
				<div>
					<p className="eyebrow">Отчетность</p>
					<h2>Сводные инфоблоки и Экспорт</h2>
					<p>Настройки автоматического экспорта данных во внешние BI-системы (PowerBI, Yandex DataLens).</p>
				</div>
			</div>

			<form onSubmit={handleSave} className="profile-form-grid" style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "24px" }}>
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="profile-section-icon" style={{ background: "rgba(14, 165, 233, 0.1)", color: "rgb(14, 165, 233)" }}>
							<Database size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Синхронизация данных</h3>
							<p>Регулярная выгрузка данных клиники в BI-систему.</p>
						</div>
					</div>

					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
								<label className="switch">
									<input
										type="checkbox"
										checked={syncEnabled}
										onChange={(e) => setSyncEnabled(e.target.checked)}
									/>
									<span className="slider round"></span>
								</label>
								<span style={{ fontWeight: 600 }}>Включить регулярную выгрузку</span>
							</div>
						</div>

						{syncEnabled && (
							<>
								<div className="profile-form-group">
									<label>Формат выгрузки</label>
									<select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
										<option value="json">JSON (REST API)</option>
										<option value="csv">CSV</option>
										<option value="xml">XML</option>
									</select>
								</div>

								<div className="profile-form-group">
									<label>Частота синхронизации</label>
									<select value={syncFrequency} onChange={(e) => setSyncFrequency(e.target.value)}>
										<option value="hourly">Каждый час</option>
										<option value="daily">Раз в сутки (ночью)</option>
										<option value="weekly">Раз в неделю</option>
									</select>
								</div>

								<div className="profile-form-group full-width">
									<label>API-токен только для чтения</label>
									<div className="profile-input-with-toggle">
										<input
											type="text"
											value={apiToken ?? "— не сгенерирован —"}
											readOnly
											style={{
												background: "var(--paper-2)",
												color: apiToken ? "var(--ink)" : "var(--text-secondary)",
												fontFamily: "monospace",
												fontSize: "0.8rem",
											}}
										/>
										{apiToken && (
											<button
												type="button"
												className="profile-input-toggle-btn"
												onClick={handleCopyToken}
												aria-label="Скопировать токен"
												title="Скопировать"
											>
												<Copy size={16} />
											</button>
										)}
									</div>
									<button
										type="button"
										className="secondary-button"
										onClick={handleGenerateToken}
										disabled={tokenLoading}
										style={{ marginTop: "8px", alignSelf: "flex-start" }}
									>
										<RefreshCw size={14} style={{ marginRight: "6px" }} />
										{tokenLoading ? "Генерация..." : "Создать новый токен"}
									</button>
									<span className="profile-form-hint" style={{ marginTop: "4px" }}>
										Токен даёт доступ только для чтения данных через REST API. Перегенерация аннулирует старый токен.
									</span>
								</div>
							</>
						)}

						<div className="profile-form-group full-width" style={{ marginTop: "12px" }}>
							<button className="primary-button" type="submit" disabled={isSaving} style={{ alignSelf: "flex-start" }}>
								<ShieldCheck size={16} style={{ marginRight: "8px" }} />
								{isSaving ? "Сохранение..." : "Сохранить параметры"}
							</button>
						</div>
					</div>
				</section>
			</form>
		</div>
	);
}
