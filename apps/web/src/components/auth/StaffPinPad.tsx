import { Delete, Lock, LogOut, UserCheck } from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../GlobalToast";

interface StaffPinPadProps {
	staffMembers: any[];
	onUnlockSuccess: (user: any) => void;
	onClinicLogout: () => void;
}

export function StaffPinPad({
	staffMembers,
	onUnlockSuccess,
	onClinicLogout,
}: StaffPinPadProps) {
	const [selectedUser, setSelectedUser] = useState<any>(null);
	const [pin, setPin] = useState("");
	const [errorShake, setErrorShake] = useState(false);
	const [loading, setLoading] = useState(false);

	const activeStaff = staffMembers.filter((m) => m.active);

	const handleKeyPress = (num: string) => {
		if (loading || pin.length >= 4) return;
		const newPin = pin + num;
		setPin(newPin);

		if (newPin.length === 4) {
			submitPin(newPin);
		}
	};

	const handleBackspace = () => {
		if (loading) return;
		setPin(pin.slice(0, -1));
	};

	const submitPin = async (completedPin: string) => {
		if (!selectedUser) return;
		setLoading(true);
		setErrorShake(false);

		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const response = await fetch("/api/auth/staff/unlock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({
					userId: selectedUser.id,
					pinCode: completedPin,
				}),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || "Неверный PIN-код");
			}

			localStorage.setItem("dente_staff_token", data.staffToken);
			if (data.user?.organizationId)
				localStorage.setItem("dente_organization_id", data.user.organizationId);
			showToast(`Добро пожаловать, ${data.user.fullName}!`, "success");
			onUnlockSuccess(data.user);
		} catch (err: any) {
			console.error(err);
			showToast(err.message || "Неверный PIN-код", "error");

			try {
				const audioCtx = new (
					window.AudioContext || (window as any).webkitAudioContext
				)();
				const osc = audioCtx.createOscillator();
				const gainNode = audioCtx.createGain();
				osc.connect(gainNode);
				gainNode.connect(audioCtx.destination);
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(180, audioCtx.currentTime);
				gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(
					0.001,
					audioCtx.currentTime + 0.15,
				);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + 0.15);
			} catch (e) {}

			setErrorShake(true);
			setTimeout(() => setErrorShake(false), 500);
			setPin("");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-overlay">
			<div className="auth-glow"></div>

			<div
				className={`auth-modal auth-modal--wide ${errorShake ? "animate-shake" : ""}`}
			>
				<div className="auth-modal-left">
					<div className="auth-header">
						<h3 className="auth-title">
							<UserCheck size={20} className="auth-icon-inline" /> Выберите
							профиль сотрудника
						</h3>
						<p className="auth-subtitle">
							Для переключения или разблокировки смены
						</p>
					</div>

					<div className="auth-staff-grid">
						{activeStaff.map((member) => {
							const isSelected = selectedUser?.id === member.id;
							return (
								<button
									key={member.id}
									onClick={() => {
										setSelectedUser(member);
										setPin("");
									}}
									className={`auth-staff-card ${isSelected ? "active" : ""}`}
								>
									<div
										className="auth-staff-avatar"
										style={{ backgroundColor: member.color || "#3b82f6" }}
									>
										{member.fullName.charAt(0)}
									</div>
									<div className="auth-staff-info">
										<div className="auth-staff-name">{member.fullName}</div>
										<div className="auth-staff-role">
											{member.role === "owner"
												? "владелец"
												: member.role === "doctor"
													? "врач"
													: member.role === "assistant"
														? "ассистент"
														: "администратор"}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				<div className="auth-modal-right">
					<div className="auth-pin-header">
						<div className="auth-pin-icon">
							<Lock size={20} />
						</div>
						<h4>Введите код доступа</h4>
						{selectedUser ? (
							<span className="auth-pin-target">{selectedUser.fullName}</span>
						) : (
							<span className="auth-pin-hint">Сначала выберите сотрудника</span>
						)}
					</div>

					<div className="auth-pin-dots">
						{[...Array(4)].map((_, i) => (
							<div
								key={i}
								className={`auth-pin-dot ${i < pin.length ? "filled" : ""}`}
							></div>
						))}
					</div>

					<div className="auth-pin-grid">
						{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
							<button
								key={num}
								onClick={() => handleKeyPress(num)}
								disabled={!selectedUser || loading}
								className="auth-pin-btn"
							>
								{num}
							</button>
						))}
						<button
							onClick={onClinicLogout}
							className="auth-pin-btn auth-pin-btn--danger"
							title="Выйти из клиники"
						>
							<LogOut size={20} />
						</button>
						<button
							onClick={() => handleKeyPress("0")}
							disabled={!selectedUser || loading}
							className="auth-pin-btn"
						>
							0
						</button>
						<button
							onClick={handleBackspace}
							disabled={!selectedUser || loading || pin.length === 0}
							className="auth-pin-btn auth-pin-btn--secondary"
						>
							<Delete size={20} />
						</button>
					</div>

					<div className="auth-footer-hints">
						Коды по умолчанию:
						<br />
						Владелец: <code>0000</code> | Врачи/Сотрудники: <code>1234</code>
					</div>
				</div>
			</div>
		</div>
	);
}
