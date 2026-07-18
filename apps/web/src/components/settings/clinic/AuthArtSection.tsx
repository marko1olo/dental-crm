import { Building2 } from "lucide-react";
import type React from "react";
import { useLocalDeviceSettings } from "../../../hooks/useLocalDeviceSettings";

export const AuthArtSection: React.FC = () => {
	const { settings, setAuthArtSettings } = useLocalDeviceSettings();

	return (
		<section className="clinic-section-card" style={{ marginTop: "24px" }}>
			<div className="clinic-section-header">
				<div
					className="clinic-section-icon"
					style={{
						background: "rgba(168, 85, 247, 0.1)",
						color: "rgb(168, 85, 247)",
					}}
				>
					<Building2 size={24} />
				</div>
				<div className="clinic-section-title">
					<h3>Экран входа устройства</h3>
					<p>Настройка живого арт-фона для этого устройства</p>
				</div>
			</div>
			<div className="clinic-form-grid" style={{ gridTemplateColumns: "1fr" }}>
				<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<label className="switch">
							<input
								type="checkbox"
								checked={settings.authArtEnabled}
								onChange={(e) =>
									setAuthArtSettings({ authArtEnabled: e.target.checked })
								}
							/>
							<span className="slider round"></span>
						</label>
						<label style={{ fontSize: "14px", fontWeight: 500 }}>
							Показывать арт-фон на экране входа
						</label>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<label className="switch">
							<input
								type="checkbox"
								checked={settings.authArtDynamicByTimeOfDay}
								onChange={(e) =>
									setAuthArtSettings({
										authArtDynamicByTimeOfDay: e.target.checked,
									})
								}
								disabled={!settings.authArtEnabled}
							/>
							<span className="slider round"></span>
						</label>
						<label
							style={{
								fontSize: "14px",
								fontWeight: 500,
								opacity: settings.authArtEnabled ? 1 : 0.5,
							}}
						>
							Менять фон по времени суток
						</label>
					</div>
					<div className="clinic-form-group">
						<label style={{ opacity: settings.authArtEnabled ? 1 : 0.5 }}>
							Коллекция артов
						</label>
						<select
							value={settings.authArtPack}
							onChange={(e) =>
								setAuthArtSettings({ authArtPack: e.target.value })
							}
							disabled={!settings.authArtEnabled}
							style={{ maxWidth: "300px" }}
						>
							<option value="nature">Природа (Nature)</option>
							<option value="abstract">Абстракция (Abstract)</option>
							<option value="dental-epic">
								Эпичная стоматология (Dental Epic)
							</option>
							<option value="anime">Аниме (Опционально)</option>
						</select>
					</div>
				</div>
			</div>
		</section>
	);
};
