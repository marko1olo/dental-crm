import { ArrowRight, KeyRound, Shield, User } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { showToast } from "../GlobalToast";

interface AcceptInviteProps {
	token: string;
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onCancel: () => void;
}

export function AcceptInvite({
	token,
	onSuccess,
	onCancel,
}: AcceptInviteProps) {
	const [fullName, setFullName] = useState("");
	const [password, setPassword] = useState("");
	const [pinCode, setPinCode] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Automatically remove hash params to clean up URL after loading component
		if (window.location.hash.includes("token=")) {
			window.history.replaceState(null, "", "/");
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fullName || !password || !pinCode) {
			showToast("Заполните все поля", "warning");
			return;
		}
		if (pinCode.length !== 4 || !/^\d+$/.test(pinCode)) {
			showToast("PIN-код должен состоять из 4 цифр", "warning");
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/auth/invites/accept", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, fullName, password, pinCode }),
			});
			const data = await response.json();
			if (!response.ok)
				throw new Error(data.message || "Ошибка принятия приглашения");

			localStorage.setItem("dente_clinic_token", data.clinicToken);
			localStorage.setItem("dente_staff_token", data.staffToken);
			if (data.user?.organizationId)
				localStorage.setItem("dente_organization_id", data.user.organizationId);
			showToast("Профиль успешно создан!", "success");
			onSuccess({ organizationId: data.user.organizationId }, data.user);
		} catch (err: any) {
			showToast(err.message || "Ссылка недействительна", "error");
			onCancel();
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-overlay">
			<div className="auth-glow auth-glow--left"></div>
			<div className="auth-glow auth-glow--right"></div>
			<div
				className="auth-modal animate-fade-in-up"
				style={{ maxWidth: "400px" }}
			>
				<div className="auth-header-center">
					<div className="auth-logo-box">
						<Shield size={32} />
					</div>
					<h2 className="auth-logo-title">DENTE CRM-MIS</h2>
					<p className="auth-logo-subtitle">Активация профиля по приглашению</p>
				</div>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="auth-form-group">
						<label className="auth-label">
							<User size={12} className="auth-icon-inline" /> ФИО
						</label>
						<input
							type="text"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Иванов И.И."
							className="auth-input"
							disabled={loading}
						/>
					</div>
					<div className="auth-form-group">
						<label className="auth-label">
							<KeyRound size={12} className="auth-icon-inline" /> Придумайте
							пароль (для входа из дома)
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							className="auth-input"
							disabled={loading}
						/>
					</div>
					<div className="auth-form-group">
						<label className="auth-label">
							<KeyRound size={12} className="auth-icon-inline" /> Придумайте
							PIN-код (4 цифры для работы в клинике)
						</label>
						<input
							type="text"
							maxLength={4}
							value={pinCode}
							onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
							placeholder="1234"
							className="auth-input"
							disabled={loading}
							style={{
								letterSpacing: "8px",
								textAlign: "center",
								fontSize: "18px",
							}}
						/>
					</div>

					<button type="submit" disabled={loading} className="auth-submit-btn">
						{loading ? (
							<div className="auth-spinner"></div>
						) : (
							<>
								Активировать аккаунт <ArrowRight size={16} />
							</>
						)}
					</button>
				</form>

				<div className="auth-footer-hints auth-footer-hints--border">
					<button type="button" onClick={onCancel} className="auth-link-btn">
						Вернуться ко входу
					</button>
				</div>
			</div>
		</div>
	);
}
