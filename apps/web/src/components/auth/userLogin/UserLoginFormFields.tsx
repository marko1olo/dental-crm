import React from "react";
import { ArrowRight, Building2, Eye, EyeOff, KeyRound, Mail, Phone, Sparkles } from "lucide-react";
import type { IdentityType } from "../authSmartIdentity";

interface UserLoginFormFieldsProps {
	identity: string;
	setIdentity: (val: string) => void;
	password: string;
	setPassword: (val: string) => void;
	showPassword: boolean;
	setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
	loading: boolean;
	detectedType: IdentityType;
	onSwitchToDemoTour?: (() => void) | undefined;
	onSubmit: (e: React.FormEvent) => void;
}

export function UserLoginFormFields({
	identity, setIdentity, password, setPassword, showPassword, setShowPassword,
	loading, detectedType, onSwitchToDemoTour, onSubmit,
}: UserLoginFormFieldsProps) {
	const renderIdentityIcon = () => {
		switch (detectedType) {
			case "phone": return <Phone size={15} className="auth-icon-inline" />;
			case "clinic_id": return <Building2 size={15} className="auth-icon-inline" />;
			default: return <Mail size={15} className="auth-icon-inline" />;
		}
	};

	const getIdentityPlaceholder = () => {
		switch (detectedType) {
			case "phone": return "+7 (999) 000-00-00";
			case "clinic_id": return "ID клиники или код филиала";
			default: return "doctor@clinic.com, +7... или ID клиники";
		}
	};

	const getIdentityHint = () => {
		switch (detectedType) {
			case "phone": return "Телефон";
			case "clinic_id": return "ID клиники";
			default: return "Email / Телефон / ID";
		}
	};

	return (
		<form onSubmit={onSubmit} className="auth-form">
			<div className="auth-form-group">
				<div className="auth-label-row">
					<label htmlFor="universal-login-identity" className="auth-label">
						{renderIdentityIcon()} Логин
					</label>
					<span className="auth-input-type-tag">{getIdentityHint()}</span>
				</div>
				<div className="auth-input-wrapper">
					<input
						id="universal-login-identity"
						type={detectedType === "phone" ? "tel" : "text"}
						value={identity}
						onChange={(e) => setIdentity(e.target.value)}
						placeholder={getIdentityPlaceholder()}
						className="auth-input"
						disabled={loading}
						autoComplete="username"
					/>
				</div>
			</div>

			<div className="auth-form-group">
				<div className="auth-label-row">
					<label htmlFor="universal-login-password" className="auth-label">
						<KeyRound size={15} className="auth-icon-inline" /> Пароль
					</label>
					<span className="auth-input-subhint">От 6 символов</span>
				</div>
				<div className="auth-input-wrapper">
					<input
						id="universal-login-password"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
						className="auth-input auth-input--with-icon"
						disabled={loading}
						autoComplete="current-password"
					/>
					<button
						type="button"
						className="auth-input-icon-btn"
						onClick={() => setShowPassword((v) => !v)}
						tabIndex={-1}
						aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
					>
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</div>

			<button type="submit" disabled={loading} className="auth-submit-btn auth-submit-btn--glow">
				{loading ? <div className="auth-spinner" /> : <>Войти в систему <ArrowRight size={18} /></>}
			</button>

			<button
				type="button"
				onClick={onSwitchToDemoTour}
				disabled={loading}
				className="auth-demo-btn"
			>
				<Sparkles size={16} /> Быстрый вход в Демо-тур (Без пароля)
			</button>
		</form>
	);
}
