import React from "react";
import { ArrowRight, Building, Eye, EyeOff, KeyRound, Mail, User, Zap } from "lucide-react";
import type { PracticeScale } from "./registerHelpers";

interface RegisterFormFieldsProps {
	scale: PracticeScale;
	name: string;
	setName: (val: string) => void;
	email: string;
	setEmail: (val: string) => void;
	password: string;
	setPassword: (val: string) => void;
	showPassword: boolean;
	setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
	seedDemoData: boolean;
	setSeedDemoData: (val: boolean) => void;
	loading: boolean;
	onSubmit: (e: React.FormEvent) => void;
}

export function RegisterFormFields({
	scale, name, setName, email, setEmail, password, setPassword,
	showPassword, setShowPassword, seedDemoData, setSeedDemoData, loading, onSubmit,
}: RegisterFormFieldsProps) {
	return (
		<form onSubmit={onSubmit} className="auth-form">
			<div className="auth-form-group">
				<label htmlFor="register-name-input" className="auth-label">
					{scale === "solo" ? <User size={15} /> : <Building size={15} />}
					{scale === "solo" ? "ФИО врача" : "Название клиники"}
				</label>
				<input
					id="register-name-input"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={scale === "solo" ? "Иванов Иван Иванович (или оставьте пустым)" : "Дентал Клиник (или оставьте пустым)"}
					className="auth-input"
					disabled={loading}
					autoComplete="name"
				/>
			</div>

			<div className="auth-form-group">
				<label htmlFor="register-email-input" className="auth-label">
					<Mail size={15} /> Email или телефон
				</label>
				<input
					id="register-email-input"
					type="text"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="+7 (999) 123-45-67 или doctor@clinic.com"
					className="auth-input"
					disabled={loading}
					autoComplete="email"
				/>
			</div>

			<div className="auth-form-group">
				<div className="auth-label-row">
					<label htmlFor="register-password-input" className="auth-label">
						<KeyRound size={15} /> Пароль
					</label>
					<span className="auth-input-subhint">От 6 знаков</span>
				</div>
				<div className="auth-input-wrapper">
					<input
						id="register-password-input"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
						className="auth-input auth-input--with-icon"
						disabled={loading}
						autoComplete="new-password"
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

			<label className="auth-checkbox-label">
				<input
					type="checkbox"
					checked={seedDemoData}
					onChange={(e) => setSeedDemoData(e.target.checked)}
					className="auth-checkbox"
				/>
				<span className="auth-checkbox-text">
					✨ Заполнить демо-пациентами и расписанием для быстрого старта
				</span>
			</label>

			<button type="submit" disabled={loading} className="auth-submit-btn auth-submit-btn--glow">
				{loading ? <div className="auth-spinner" /> : <><Zap size={18} /> Создать кабинет бесплатно <ArrowRight size={18} /></>}
			</button>
		</form>
	);
}
