import React from "react";
import { Delete, Lock, UserCheck, Zap } from "lucide-react";
import { DEMO_CHIEF_DOCTOR } from "../staffUnlockState";
import type { StaffUser } from "./staffPinPadTypes";

interface StaffPinPadInputProps {
	selectedUser: StaffUser | null;
	pin: string;
	loading: boolean;
	errorShake: boolean;
	errorText: string | null;
	listPhase: "loading" | "failed" | "empty" | "ready";
	onKeyPress: (num: string) => void;
	onBackspace: () => void;
	onReset: () => void;
	onDemoLogin: () => void;
}

export function StaffPinPadInput({
	selectedUser,
	pin,
	loading,
	errorShake,
	errorText,
	listPhase,
	onKeyPress,
	onBackspace,
	onReset,
	onDemoLogin,
}: StaffPinPadInputProps) {
	return (
		<div className="auth-modal-right">
			<div className="auth-pin-header">
				<div className="auth-pin-icon">
					{selectedUser ? <UserCheck size={24} /> : <Lock size={24} />}
				</div>
				<h4>{selectedUser ? String(selectedUser?.fullName || "") : "Выберите профиль"}</h4>
				<div className="auth-pin-target" aria-live="polite">
					{loading ? "Проверяем PIN..." : selectedUser ? "Введите PIN-код" : "Нажмите на сотрудника слева"}
				</div>
			</div>

			<div className={`auth-pin-dots ${errorShake ? "animate-shake" : ""}`}>
				{[0, 1, 2, 3].map((slot) => (
					<div
						key={`pin-dot-slot-${slot}`}
						className={`auth-pin-dot ${pin.length > slot ? "filled" : ""}`}
					/>
				))}
			</div>

			{errorText && (
				<div
					role="alert"
					style={{
						background: "var(--bad-bg)",
						color: "var(--bad-fg)",
						borderRadius: "8px",
						padding: "8px 12px",
						marginBottom: "16px",
						maxWidth: "260px",
						fontSize: "12px",
						lineHeight: 1.4,
						textAlign: "center",
					}}
				>
					{errorText}
				</div>
			)}

			<div className="auth-pin-grid">
				{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
					<button
						key={num}
						type="button"
						className="auth-pin-btn"
						disabled={loading}
						onClick={() => onKeyPress(num)}
					>
						{num}
					</button>
				))}
				<button
					type="button"
					className="auth-pin-btn auth-pin-btn--secondary"
					disabled={loading}
					onClick={onReset}
				>
					Сброс
				</button>
				<button
					key="0"
					type="button"
					className="auth-pin-btn"
					disabled={loading}
					onClick={() => onKeyPress("0")}
				>
					0
				</button>
				<button
					type="button"
					className="auth-pin-btn auth-pin-btn--danger"
					disabled={loading}
					onClick={onBackspace}
				>
					<Delete size={20} />
				</button>
			</div>

			{(selectedUser?.id === DEMO_CHIEF_DOCTOR.id || listPhase !== "ready") && (
				<button
					type="button"
					className="auth-demo-btn"
					disabled={loading}
					onClick={onDemoLogin}
				>
					<Zap size={16} className="auth-demo-btn-icon" />
					<span>Войти как Доктор Демо (PIN: 1111)</span>
				</button>
			)}
		</div>
	);
}
