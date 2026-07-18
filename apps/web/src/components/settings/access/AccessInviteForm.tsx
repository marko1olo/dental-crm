import React, { useState } from "react";
import { Check, Copy, Key, Mail } from "lucide-react";
import { showToast } from "../../GlobalToast";

export function AccessInviteForm({ hasAssistants }: { hasAssistants: boolean }) {
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("doctor");
	const [inviteLink, setInviteLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleGenerateInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail) {
			showToast("Введите email", "warning");
			return;
		}
		setLoading(true);
		setCopied(false);
		try {
			const staffToken = localStorage.getItem("dente_staff_token") || "";
			const response = await fetch("/api/auth/invites/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Ошибка генерации");

			const fullUrl = window.location.origin + data.inviteLink;
			setInviteLink(fullUrl);
			showToast("Приглашение создано!", "success");
		} catch (err: any) {
			showToast(err.message || "Не удалось создать приглашение", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(inviteLink);
		setCopied(true);
		showToast("Ссылка скопирована", "success");
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<section className="access-section-card">
			<div className="access-section-header">
				<div className="access-section-icon">
					<Mail size={24} />
				</div>
				<div className="access-section-title">
					<h3>Приглашение сотрудников</h3>
					<p>Генерация защищенных ссылок для регистрации персонала клиники</p>
				</div>
			</div>

			<form className="access-invite-grid" onSubmit={handleGenerateInvite}>
				<div className="access-invite-input-group">
					<label>Email сотрудника</label>
					<input
						type="email"
						placeholder="doctor@example.com"
						value={inviteEmail}
						onChange={(e) => setInviteEmail(e.target.value)}
						disabled={loading}
						className="access-invite-input"
					/>
				</div>
				<div className="access-invite-input-group">
					<label>Роль в системе</label>
					<select
						value={inviteRole}
						onChange={(e) => setInviteRole(e.target.value)}
						disabled={loading}
						className="access-invite-select"
					>
						<option value="doctor">Врач</option>
						<option value="admin">Администратор</option>
						{hasAssistants && <option value="assistant">Ассистент</option>}
						<option value="owner">Владелец / Главврач</option>
					</select>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="primary-button"
					style={{ height: "44px" }}
				>
					<Key size={16} style={{ marginRight: "8px" }} />
					{loading ? "Создание..." : "Создать инвайт"}
				</button>
			</form>

			{inviteLink && (
				<div className="access-invite-result">
					<span className="access-invite-link">{inviteLink}</span>
					<button
						type="button"
						onClick={handleCopy}
						className="secondary-button"
						style={{ background: "white" }}
					>
						{copied ? (
							<>
								<Check size={16} style={{ marginRight: "6px" }} /> Скопировано
							</>
						) : (
							<>
								<Copy size={16} style={{ marginRight: "6px" }} /> Копировать
							</>
						)}
					</button>
				</div>
			)}
		</section>
	);
}
