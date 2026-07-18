import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";

export function ProfilePinSection({
	oldPin,
	setOldPin,
	newPin,
	setNewPin,
	confirmPin,
	setConfirmPin,
	pinLoading,
	handleUpdatePin,
}: any) {
	return (
		<section className="profile-section-card">
			<div className="profile-section-header">
				<div
					className="profile-section-icon"
					style={{
						background: "rgba(139, 92, 246, 0.1)",
						color: "rgb(139, 92, 246)",
					}}
				>
					<Lock size={24} />
				</div>
				<div className="profile-section-title">
					<h3>Смена PIN-кода</h3>
					<p>
						PIN (4 цифры) используется для быстрого входа на общих компьютерах
						клиники
					</p>
				</div>
			</div>

			<form onSubmit={handleUpdatePin} className="profile-form-grid">
				<div className="profile-form-group full-width">
					<label>Текущий PIN-код</label>
					<input
						type="password"
						value={oldPin}
						onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
						placeholder="••••"
						maxLength={4}
						disabled={pinLoading}
						style={{
							letterSpacing: "8px",
							fontSize: "18px",
							fontWeight: "bold",
							fontFamily: "monospace",
						}}
					/>
				</div>

				<div className="profile-form-group">
					<label>Новый PIN-код</label>
					<input
						type="password"
						value={newPin}
						onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
						placeholder="••••"
						maxLength={4}
						disabled={pinLoading}
						style={{
							letterSpacing: "8px",
							fontSize: "18px",
							fontWeight: "bold",
							fontFamily: "monospace",
						}}
					/>
				</div>

				<div className="profile-form-group">
					<label>Подтвердите PIN-код</label>
					<input
						type="password"
						value={confirmPin}
						onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
						placeholder="••••"
						maxLength={4}
						disabled={pinLoading}
						className={
							confirmPin && newPin !== confirmPin ? "profile-input-error" : ""
						}
						style={{
							letterSpacing: "8px",
							fontSize: "18px",
							fontWeight: "bold",
							fontFamily: "monospace",
						}}
					/>
					{confirmPin && newPin !== confirmPin && (
						<span className="profile-error-hint">
							<AlertTriangle size={12} /> PIN-коды не совпадают
						</span>
					)}
				</div>

				<div
					className="profile-form-group full-width"
					style={{ marginTop: "8px" }}
				>
					<button
						className="primary-button"
						type="submit"
						disabled={pinLoading}
						style={{ alignSelf: "flex-start" }}
					>
						<ShieldCheck size={16} style={{ marginRight: "8px" }} />
						{pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
					</button>
				</div>
			</form>
		</section>
	);
}
