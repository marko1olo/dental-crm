import { AlertTriangle, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { getPasswordStrength } from "./useProfileSettingsLogic";

export function ProfilePasswordSection({
	oldPassword,
	setOldPassword,
	newPassword,
	setNewPassword,
	confirmPassword,
	setConfirmPassword,
	showOldPw,
	setShowOldPw,
	showNewPw,
	setShowNewPw,
	passwordLoading,
	handleUpdatePassword,
}: any) {
	const strength = getPasswordStrength(newPassword);
	const passwordMismatch = confirmPassword && newPassword !== confirmPassword;

	return (
		<section className="profile-section-card">
			<div className="profile-section-header">
				<div className="profile-section-icon">
					<KeyRound size={24} />
				</div>
				<div className="profile-section-title">
					<h3>Смена пароля</h3>
					<p>
						Пароль используется для входа в систему с личных устройств по email
					</p>
				</div>
			</div>

			<form onSubmit={handleUpdatePassword} className="profile-form-grid">
				<div className="profile-form-group full-width">
					<label>Текущий пароль</label>
					<div className="profile-input-with-toggle">
						<input
							type={showOldPw ? "text" : "password"}
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
							placeholder="••••••••"
							disabled={passwordLoading}
						/>
						<button
							type="button"
							onClick={() => setShowOldPw((v: boolean) => !v)}
							className="profile-input-toggle-btn"
							aria-label={showOldPw ? "Скрыть пароль" : "Показать пароль"}
						>
							{showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>
				</div>

				<div className="profile-form-group">
					<label>Новый пароль</label>
					<div className="profile-input-with-toggle">
						<input
							type={showNewPw ? "text" : "password"}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Мин. 8 символов"
							disabled={passwordLoading}
						/>
						<button
							type="button"
							onClick={() => setShowNewPw((v: boolean) => !v)}
							className="profile-input-toggle-btn"
							aria-label={showNewPw ? "Скрыть пароль" : "Показать пароль"}
						>
							{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>
					{newPassword && (
						<div className="profile-password-strength">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className={`profile-password-bar ${strength.score >= i ? "" : ""}`}
									style={{
										background:
											strength.score >= i
												? strength.score === 1
													? "#ef4444"
													: strength.score === 2
														? "#f59e0b"
														: "#10b981"
												: "var(--paper-2)",
									}}
								/>
							))}
							<span
								className="profile-password-label"
								style={{
									color:
										strength.score === 1
											? "#ef4444"
											: strength.score === 2
												? "#f59e0b"
												: "#10b981",
								}}
							>
								{strength.label}
							</span>
						</div>
					)}
				</div>

				<div className="profile-form-group">
					<label>Подтвердите пароль</label>
					<input
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="••••••••"
						disabled={passwordLoading}
						className={passwordMismatch ? "profile-input-error" : ""}
					/>
					{passwordMismatch && (
						<span className="profile-error-hint">
							<AlertTriangle size={12} /> Пароли не совпадают
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
						disabled={passwordLoading}
						style={{ alignSelf: "flex-start" }}
					>
						<ShieldCheck size={16} style={{ marginRight: "8px" }} />
						{passwordLoading ? "Сохранение..." : "Сохранить новый пароль"}
					</button>
				</div>
			</form>
		</section>
	);
}
