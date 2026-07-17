import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import "./PatientPortal.css";

interface TreatmentStage {
	id: string;
	description: string;
	cost: number;
	status: "pending" | "completed";
}

/* ── OTP Input Component ── */
const OTP_LENGTH = 4;

interface OTPInputProps {
	onComplete: (code: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({ onComplete }) => {
	const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
	const refs = useRef<(HTMLInputElement | null)[]>([]);

	const focus = (idx: number) => {
		refs.current[idx]?.focus();
	};

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
			if (e.key === "Backspace") {
				e.preventDefault();
				setDigits((prev) => {
					const next = [...prev];
					if (next[idx] !== "") {
						next[idx] = "";
						return next;
					}
					// Jump to previous and clear
					if (idx > 0) {
						next[idx - 1] = "";
						focus(idx - 1);
					}
					return next;
				});
			}
		},
		[],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
			const raw = e.target.value.replace(/\D/g, "").slice(-1);
			if (!raw) return;

			setDigits((prev) => {
				const next = [...prev];
				next[idx] = raw;
				return next;
			});

			// Auto-advance
			if (idx < OTP_LENGTH - 1) {
				focus(idx + 1);
			} else {
				// Last digit filled — read all after state settles
				setTimeout(() => {
					setDigits((prev) => {
						const code = prev.join("");
						if (code.length === OTP_LENGTH) onComplete(code);
						return prev;
					});
				}, 0);
			}
		},
		[onComplete],
	);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent, startIdx: number) => {
			e.preventDefault();
			const pasted = e.clipboardData
				.getData("text")
				.replace(/\D/g, "")
				.slice(0, OTP_LENGTH);
			if (!pasted) return;

			setDigits((prev) => {
				const next = [...prev];
				for (let i = 0; i < pasted.length && startIdx + i < OTP_LENGTH; i++) {
					next[startIdx + i] = pasted[i] ?? "";
				}
				return next;
			});

			const nextFocus = Math.min(startIdx + pasted.length, OTP_LENGTH - 1);
			focus(nextFocus);
			if (pasted.length === OTP_LENGTH) {
				setTimeout(() => onComplete(pasted), 50);
			}
		},
		[onComplete],
	);

	// Fire onComplete when digits are fully filled (handles last-digit path too)
	useEffect(() => {
		const code = digits.join("");
		if (code.length === OTP_LENGTH && !digits.includes("")) {
			onComplete(code);
		}
	}, [digits, onComplete]);

	return (
		<div className="otp-wrap">
			{digits.map((d, i) => (
				<input
					key={i}
					ref={(el) => {
						refs.current[i] = el;
					}}
					className={`otp-cell ${d ? "otp-cell--filled" : ""}`}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={d}
					onChange={(e) => handleChange(e, i)}
					onKeyDown={(e) => handleKeyDown(e, i)}
					onPaste={(e) => handlePaste(e, i)}
					onFocus={(e) => e.target.select()}
					autoComplete="one-time-code"
					aria-label={`Цифра ${i + 1} из ${OTP_LENGTH}`}
				/>
			))}
		</div>
	);
};

/* ── Main PatientPortal ── */
export const PatientPortal: React.FC = () => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [phone, setPhone] = useState("");
	const [step, setStep] = useState<"phone" | "otp">("phone");
	const [otpError, setOtpError] = useState("");
	const [viewingDoc, setViewingDoc] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [viewingDocHtml, setViewingDocHtml] = useState<string | null>(null);
	const [viewingDocLoading, setViewingDocLoading] = useState(false);
	const phoneRef = useRef<HTMLInputElement>(null);

	const [patientData, setPatientData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);

	const fetchPatientData = async (token: string) => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/portal/me", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setPatientData(data);
				setIsAuthenticated(true);
			} else {
				localStorage.removeItem("patient_token");
				setIsAuthenticated(false);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const token = localStorage.getItem("patient_token");
		if (token) fetchPatientData(token);
		phoneRef.current?.focus();
	}, []);

	const totalCost =
		patientData?.plans?.reduce(
			(s: number, i: any) => s + (i.totalAmount || 0),
			0,
		) || 0;
	const paid =
		patientData?.invoices
			?.filter((i: any) => i.status === "paid")
			.reduce((s: number, i: any) => s + (i.amount || 0), 0) || 0;
	const remaining = totalCost - paid;

	useEffect(() => {
		phoneRef.current?.focus();
		return () => {
			setIsAuthenticated(false);
			setPhone("");
			setStep("phone");
			setOtpError("");
			setViewingDoc(null);
			setViewingDocHtml(null);
		};
	}, []);

	useEffect(() => {
		if (viewingDoc) {
			const token = localStorage.getItem("patient_token");
			if (!token) return;
			setViewingDocLoading(true);
			setViewingDocHtml(null);
			fetch(`/api/portal/documents/${viewingDoc.id}/html`, {
				headers: { Authorization: `Bearer ${token}` },
			})
				.then((res) => {
					if (res.ok) return res.text();
					throw new Error("Не удалось загрузить документ");
				})
				.then((html) => setViewingDocHtml(html))
				.catch((err) => {
					console.error(err);
					setViewingDocHtml(
						"<div style='padding:20px;color:red;font-family:sans-serif;'>Ошибка загрузки документа.</div>",
					);
				})
				.finally(() => setViewingDocLoading(false));
		}
	}, [viewingDoc]);

	const handleSendOtp = useCallback(async () => {
		if (phone.replace(/\D/g, "").length >= 10) {
			setStep("otp");
			await fetch("/api/portal/auth/send-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
		}
	}, [phone]);

	const handleOTPComplete = useCallback(
		async (code: string) => {
			try {
				const res = await fetch("/api/portal/auth/verify-otp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone, code }),
				});
				const data = await res.json();
				if (res.ok && data.token) {
					localStorage.setItem("patient_token", data.token);
					setOtpError("");
					await fetchPatientData(data.token);
				} else {
					setOtpError(data.error || "Неверный код. Попробуйте ещё раз.");
				}
			} catch (e) {
				setOtpError("Ошибка соединения.");
			}
		},
		[phone],
	);

	if (!isAuthenticated) {
		return (
			<div className="portal-auth-container">
				<div className="portal-auth-card">
					<div className="portal-auth-logo">🦷</div>
					<h2 className="portal-auth-title">Кабинет пациента</h2>

					{step === "phone" ? (
						<div className="auth-step">
							<p className="auth-hint">Введите номер телефона для входа</p>
							<input
								ref={phoneRef}
								type="tel"
								placeholder="+7 (999) 000-00-00"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="auth-phone-input"
								onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
							/>
							<button onClick={handleSendOtp} className="auth-primary-btn">
								Получить СМС-код
							</button>
						</div>
					) : (
						<div className="auth-step">
							<p className="auth-hint">
								Код отправлен на <strong>{phone}</strong>
							</p>
							<p className="auth-sublabel">Введите 4-значный код</p>
							<OTPInput onComplete={handleOTPComplete} />
							{otpError && <p className="auth-error">{otpError}</p>}
							<button
								onClick={() => {
									setStep("phone");
									setOtpError("");
								}}
								className="auth-text-btn"
							>
								← Изменить номер
							</button>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="patient-portal">
			<header className="portal-header">
				<h2>Мой кабинет пациента</h2>
				<button
					className="logout-btn"
					onClick={() => setIsAuthenticated(false)}
				>
					Выйти
				</button>
			</header>

			<div className="portal-grid">
				<section className="portal-card visits-card">
					<h3>Мои приёмы</h3>
					{(patientData?.visits || []).length === 0 && (
						<p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
							У вас пока нет записей.
						</p>
					)}
					{(patientData?.visits || []).map((v: any) => (
						<div
							key={v.id}
							className={`visit-item ${v.status === "completed" ? "past" : "upcoming"}`}
						>
							<div className="visit-date">
								{new Date(v.date).toLocaleDateString("ru-RU")}
							</div>
							<div className="visit-desc">{v.notes || "Консультация"}</div>
							{v.status === "completed" ? (
								<span className="badge gray">Завершён</span>
							) : (
								<span className="badge blue">Запланирован</span>
							)}
						</div>
					))}
				</section>

				<section className="portal-card plan-card">
					<h3>План лечения</h3>
					<div className="financial-summary">
						<div className="fin-stat">
							<span>Итого план</span>
							<strong>{totalCost.toLocaleString()} ₽</strong>
						</div>
						<div className="fin-stat">
							<span>Оплачено</span>
							<strong className="text-green">{paid.toLocaleString()} ₽</strong>
						</div>
						<div className="fin-stat">
							<span>Остаток</span>
							<strong className="text-orange">
								{remaining.toLocaleString()} ₽
							</strong>
						</div>
					</div>
					<div className="stages-list">
						{(patientData?.plans || []).map((stage: any) => (
							<div key={stage.id} className={`stage-item ${stage.status}`}>
								<span className="stage-desc">
									{stage.name || "План лечения"}
								</span>
								<span className="stage-cost">
									{(stage.totalAmount || 0).toLocaleString()} ₽
								</span>
								{stage.status === "completed" && (
									<span className="stage-icon">✓</span>
								)}
							</div>
						))}
					</div>
				</section>

				<section className="portal-card docs-card">
					<h3>Документы</h3>
					{(patientData?.documents || []).length === 0 && (
						<p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
							Нет выпущенных документов.
						</p>
					)}
					{(patientData?.documents || []).map((doc: any) => (
						<div key={doc.id} className="doc-item">
							<span>📄 {doc.title}</span>
							<button
								className="btn-download"
								onClick={() => setViewingDoc({ id: doc.id, title: doc.title })}
							>
								Просмотр
							</button>
						</div>
					))}
				</section>
			</div>

			{viewingDoc && (
				<div className="doc-overlay" onClick={() => setViewingDoc(null)}>
					<div
						className="doc-overlay-content"
						onClick={(e) => e.stopPropagation()}
						style={{
							width: "90%",
							maxWidth: "900px",
							height: "90vh",
							display: "flex",
							flexDirection: "column",
						}}
					>
						<div
							className="doc-overlay-header"
							style={{
								padding: "16px",
								borderBottom: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<h3 style={{ margin: 0, fontSize: "1.1rem" }}>
								{viewingDoc.title}
							</h3>
							<button
								className="doc-close-btn"
								onClick={() => setViewingDoc(null)}
								style={{
									background: "none",
									border: "none",
									fontSize: "24px",
									cursor: "pointer",
									color: "var(--muted)",
								}}
							>
								×
							</button>
						</div>
						<div
							className="doc-overlay-body"
							style={{ flex: 1, padding: 0, position: "relative" }}
						>
							{viewingDocLoading && (
								<div
									style={{
										position: "absolute",
										top: "50%",
										left: "50%",
										transform: "translate(-50%, -50%)",
										color: "var(--muted)",
									}}
								>
									Загрузка документа...
								</div>
							)}
							{!viewingDocLoading && viewingDocHtml && (
								<iframe
									srcDoc={viewingDocHtml}
									style={{
										width: "100%",
										height: "100%",
										border: "none",
										backgroundColor: "#fff",
									}}
									title={viewingDoc.title}
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
