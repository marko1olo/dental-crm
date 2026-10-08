import React, { useEffect, useRef, useState } from "react";
import {
	Check,
	Eye,
	EyeOff,
	Lock,
	RefreshCw,
	Send,
	ShieldCheck,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";

export interface PhoneAuthFormProps {
	clinicId?: string;
	userId?: string;
	onSuccess: () => Promise<void> | void;
}

export function PhoneAuthForm({
	clinicId,
	userId,
	onSuccess,
}: PhoneAuthFormProps) {
	const [phoneInput, setPhoneInput] = useState<string>("");
	const [isRequestingCode, setIsRequestingCode] = useState<boolean>(false);
	const [phoneCodeHash, setPhoneCodeHash] = useState<string | null>(null);
	const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", ""]);
	const [testCodePreset, setTestCodePreset] = useState<string | null>(null);
	const [codeTimerSeconds, setCodeTimerSeconds] = useState<number>(0);
	const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
	const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

	// 2FA
	const [requires2fa, setRequires2fa] = useState<boolean>(false);
	const [password2fa, setPassword2fa] = useState<string>("");
	const [showPassword2fa, setShowPassword2fa] = useState<boolean>(false);
	const [isVerifying2fa, setIsVerifying2fa] = useState<boolean>(false);

	// Таймер обратного отсчета
	useEffect(() => {
		if (codeTimerSeconds <= 0) return;
		const interval = setInterval(() => {
			setCodeTimerSeconds((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(interval);
	}, [codeTimerSeconds]);

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPhoneInput(e.target.value);
	};

	const handleRequestCode = async () => {
		const cleaned = phoneInput.trim();
		if (!cleaned || cleaned.replace(/\D/g, "").length < 10) {
			showToast("Введите корректный номер телефона РФ (+7...)", "warning");
			return;
		}

		try {
			setIsRequestingCode(true);
			const res = await fetch("/api/telegram/account/request-code", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: cleaned,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Код подтверждения отправлен в Telegram", "success");
				setPhoneCodeHash(data.phoneCodeHash);
				setCodeTimerSeconds(data.timeout || 120);
				setCodeDigits(["", "", "", "", ""]);
				setRequires2fa(false);
				if (data.testCode) {
					setTestCodePreset(data.testCode);
				}
				setTimeout(() => {
					digitInputRefs.current[0]?.focus();
				}, 100);
			} else {
				showToast(data.error || "Ошибка отправки кода", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsRequestingCode(false);
		}
	};

	const handleDigitChange = (index: number, val: string) => {
		const digit = val.slice(-1).replace(/\D/g, "");
		const updated = [...codeDigits];
		updated[index] = digit;
		setCodeDigits(updated);

		if (digit && index < 4) {
			digitInputRefs.current[index + 1]?.focus();
		}
	};

	const handleDigitKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
			digitInputRefs.current[index - 1]?.focus();
		}
	};

	const handleVerifyCode = async (explicitCode?: string) => {
		const code = explicitCode || codeDigits.join("");
		if (code.length < 5) {
			showToast("Введите 5-значный код подтверждения", "warning");
			return;
		}
		if (!phoneCodeHash) {
			showToast("Сначала запросите код на номер телефона", "warning");
			return;
		}

		try {
			setIsVerifyingCode(true);
			const res = await fetch("/api/telegram/account/verify-code", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: phoneInput.trim(),
					phoneCodeHash,
					code,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				if (data.requires2fa) {
					setRequires2fa(true);
					showToast("Требуется облачный пароль 2FA", "info");
				} else if (data.connected) {
					showToast("Личный аккаунт Telegram успешно подключен!", "success");
					setPhoneCodeHash(null);
					setCodeDigits(["", "", "", "", ""]);
					await onSuccess();
				}
			} else {
				showToast(data.error || "Неверный код подтверждения", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsVerifyingCode(false);
		}
	};

	const handleVerify2fa = async () => {
		if (!password2fa) {
			showToast("Введите облачный пароль 2FA", "warning");
			return;
		}

		try {
			setIsVerifying2fa(true);
			const res = await fetch("/api/telegram/account/verify-2fa", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: phoneInput.trim(),
					password: password2fa,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok && data.connected) {
				showToast("2FA подтверждена! Аккаунт подключен", "success");
				setRequires2fa(false);
				setPassword2fa("");
				setPhoneCodeHash(null);
				await onSuccess();
			} else {
				showToast(data.error || "Неверный пароль 2FA", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsVerifying2fa(false);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
				maxWidth: "460px",
			}}
		>
			{!phoneCodeHash && (
				<div className="tg-form-group">
					<label
						htmlFor="tg-account-phone-input"
						style={{
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink)",
						}}
					>
						Номер телефона врача или клиники
					</label>
					<div className="tg-input-wrapper">
						<input
							id="tg-account-phone-input"
							type="tel"
							className="tg-text-input"
							placeholder="+7 (999) 000-00-00"
							value={phoneInput}
							onChange={handlePhoneChange}
							data-testid="tg-account-phone-input"
						/>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)" }}>
						Telegram отправит 5-значный проверочный код в приложение.
					</div>

					<button
						type="button"
						className="tg-btn-primary"
						style={{ marginTop: "8px" }}
						onClick={handleRequestCode}
						disabled={isRequestingCode || !phoneInput.trim()}
						data-testid="tg-account-request-code-btn"
					>
						{isRequestingCode ? (
							<RefreshCw size={16} className="animate-spin" />
						) : (
							<Send size={16} />
						)}
						<span>
							{isRequestingCode ? "Отправка кода..." : "Получить код"}
						</span>
					</button>
				</div>
			)}

			{phoneCodeHash && !requires2fa && (
				<div
					className="tg-form-group"
					style={{
						background: "var(--paper-soft)",
						padding: "16px",
						borderRadius: "12px",
						border: "1px solid var(--line)",
					}}
				>
					<div
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--ink)",
							textAlign: "center",
						}}
					>
						Введите 5-значный код из Telegram
					</div>
					<div
						style={{
							fontSize: "12px",
							color: "var(--muted)",
							textAlign: "center",
							marginTop: "4px",
						}}
					>
						Отправлен на номер <strong>{phoneInput}</strong>
					</div>

					<div className="tg-code-input-row">
						{codeDigits.map((digit, idx) => (
							<input
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 slots
								key={idx}
								ref={(el) => {
									digitInputRefs.current[idx] = el;
								}}
								type="text"
								inputMode="numeric"
								maxLength={1}
								className="tg-digit-input"
								value={digit}
								onChange={(e) => handleDigitChange(idx, e.target.value)}
								onKeyDown={(e) => handleDigitKeyDown(idx, e)}
								data-testid={`tg-code-digit-${idx}`}
							/>
						))}
					</div>

					{testCodePreset && (
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								marginBottom: "8px",
							}}
						>
							<div
								className="tg-testcode-chip"
								onClick={() => {
									const parts = testCodePreset.split("");
									setCodeDigits(parts);
									handleVerifyCode(testCodePreset);
								}}
								title="Нажмите для автоматического ввода тестового кода"
							>
								<span>Тестовый код: {testCodePreset} (автозаполнение)</span>
							</div>
						</div>
					)}

					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							fontSize: "12px",
							color: "var(--muted)",
							marginTop: "8px",
						}}
					>
						<span>
							{codeTimerSeconds > 0
								? `Повтор через ${codeTimerSeconds} сек.`
								: "Код истек"}
						</span>
						{codeTimerSeconds <= 0 && (
							<button
								type="button"
								style={{
									background: "none",
									border: "none",
									color: "var(--teal)",
									fontWeight: 600,
									cursor: "pointer",
								}}
								onClick={handleRequestCode}
							>
								Отправить повторно
							</button>
						)}
					</div>

					<div
						style={{
							display: "flex",
							gap: "10px",
							marginTop: "14px",
						}}
					>
						<button
							type="button"
							className="tg-btn-primary"
							style={{ width: "100%" }}
							onClick={() => handleVerifyCode()}
							disabled={
								isVerifyingCode || codeDigits.some((d) => d === "")
							}
							data-testid="tg-account-verify-code-btn"
						>
							{isVerifyingCode ? (
								<RefreshCw size={16} className="animate-spin" />
							) : (
								<Check size={16} />
							)}
							<span>
								{isVerifyingCode ? "Проверка кода..." : "Подтвердить код"}
							</span>
						</button>
						<button
							type="button"
							className="tg-btn-secondary"
							onClick={() => setPhoneCodeHash(null)}
						>
							Назад
						</button>
					</div>
				</div>
			)}

			{requires2fa && (
				<div
					className="tg-form-group"
					style={{
						background: "var(--paper-soft)",
						padding: "16px",
						borderRadius: "12px",
						border: "1px solid var(--line)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							color: "var(--ink)",
							fontWeight: 700,
							fontSize: "14px",
						}}
					>
						<Lock size={16} color="var(--teal)" />
						<span>Двухфакторная аутентификация (2FA)</span>
					</div>
					<div
						style={{
							fontSize: "12px",
							color: "var(--muted)",
							marginTop: "2px",
						}}
					>
						На вашем Telegram-аккаунте установлен облачный пароль.
						Введите его для завершения входа.
					</div>

					<div className="tg-input-wrapper" style={{ marginTop: "10px" }}>
						<input
							type={showPassword2fa ? "text" : "password"}
							className="tg-text-input"
							placeholder="Облачный пароль Telegram"
							value={password2fa}
							onChange={(e) => setPassword2fa(e.target.value)}
							data-testid="tg-account-2fa-input"
						/>
						<button
							type="button"
							className="tg-input-icon-btn"
							onClick={() => setShowPassword2fa(!showPassword2fa)}
							title={showPassword2fa ? "Скрыть" : "Показать"}
						>
							{showPassword2fa ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>

					<div
						style={{
							display: "flex",
							gap: "10px",
							marginTop: "14px",
						}}
					>
						<button
							type="button"
							className="tg-btn-primary"
							style={{ width: "100%" }}
							onClick={handleVerify2fa}
							disabled={isVerifying2fa || !password2fa.trim()}
							data-testid="tg-account-verify-2fa-btn"
						>
							{isVerifying2fa ? (
								<RefreshCw size={16} className="animate-spin" />
							) : (
								<ShieldCheck size={16} />
							)}
							<span>
								{isVerifying2fa ? "Проверка пароля..." : "Войти с 2FA"}
							</span>
						</button>
						<button
							type="button"
							className="tg-btn-secondary"
							onClick={() => setRequires2fa(false)}
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
