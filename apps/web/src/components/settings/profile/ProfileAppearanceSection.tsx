import { Palette } from "lucide-react";

export function ProfileAppearanceSection({
	themeStore,
	useThemeStore,
	uiStore,
	useUiStore,
	highContrast,
	setHighContrast,
	appLogic,
}: any) {
	return (
		<section className="profile-section-card">
			<div className="profile-section-header">
				<div
					className="profile-section-icon"
					style={{
						background: "rgba(236, 72, 153, 0.1)",
						color: "rgb(236, 72, 153)",
					}}
				>
					<Palette size={24} />
				</div>
				<div className="profile-section-title">
					<h3>Внешний вид и Масштаб</h3>
					<p>
						Настройки оформления интерфейса конкретно для вашего аккаунта
					</p>
				</div>
			</div>

			<div className="profile-form-grid">
				<div className="profile-form-group">
					<label>Цветовая тема</label>
					<select
						value={themeStore.themeMode}
						onChange={(e) =>
							useThemeStore
								.getState()
								.setThemeMode(e.target.value as "auto" | "light" | "dark")
						}
					>
						<option value="auto">Автоматически (по системе)</option>
						<option value="light">Светлая тема</option>
						<option value="dark">Тёмная тема</option>
					</select>
				</div>

				<div className="profile-form-group">
					<label>Масштаб элементов</label>
					<select
						value={uiStore.uiScale}
						onChange={(e) =>
							useUiStore
								.getState()
								.setUiScale(e.target.value as "standard" | "large")
						}
					>
						<option value="standard">Компактный (Стандарт)</option>
						<option value="large">Крупный</option>
					</select>
				</div>

				<div className="profile-form-group full-width">
					<label>Версия для слабовидящих (ГОСТ Р 52872-2019)</label>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginTop: "8px",
						}}
					>
						<label className="switch">
							<input
								type="checkbox"
								checked={highContrast}
								onChange={(e) => {
									const val = e.target.checked;
									setHighContrast(val);
									window.dispatchEvent(new Event("dente:theme-change"));
								}}
							/>
							<span className="slider round"></span>
						</label>
						<span
							style={{ fontSize: "14px", color: "var(--text-secondary)" }}
						>
							Включает чёрно-белую схему максимального контраста,
							отключает анимации и глобально увеличивает шрифт.
						</span>
					</div>
				</div>

				<div className="profile-form-group full-width">
					<label>Интерактивная зубная формула</label>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginTop: "8px",
						}}
					>
						<label className="switch">
							<input
								type="checkbox"
								checked={appLogic.odontogramUseSurfaces ?? false}
								onChange={(e) => {
									appLogic.setOdontogramUseSurfaces(e.target.checked);
									appLogic.updateUiPreferences({
										odontogramUseSurfaces: e.target.checked,
									});
								}}
							/>
							<span className="slider round"></span>
						</label>
						<span
							style={{ fontSize: "14px", color: "var(--text-secondary)" }}
						>
							Включить выбор конкретных поверхностей зуба (O, M, D, V, L)
							при клике
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}
