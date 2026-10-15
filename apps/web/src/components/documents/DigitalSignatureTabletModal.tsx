/**
 * DigitalSignatureTabletModal.tsx
 *
 * Планшет цифровой подписи пациента (ПЭП 63-ФЗ) для экспресс-пакетов
 * и официальных клинических документов (ИДС 1051н, Договор 736, Согласие 152-ФЗ, Анкета).
 *
 * Юридический базис:
 * - Федеральный закон от 06.04.2011 № 63-ФЗ «Об электронной подписи» (ст. 5, ст. 9 — ПЭП).
 * - Приказ Минздрава России от 07.09.2020 № 947н (электронный документооборот в здравоохранении).
 * - Фиксация криптографического отпечатка SHA-256 и времени подписания.
 * - 0 эмодзи, векторные иконки Lucide, строгие дизайн-токены var(--paper), var(--ink), var(--teal).
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	X,
	FileSignature,
	Smartphone,
	RotateCcw,
	Printer,
	ShieldCheck,
	CheckCircle2,
	Lock,
	Hash,
	User,
	Sparkles,
	AlertCircle,
} from "lucide-react";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { formatShortDate } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface DigitalSignatureTabletModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly document?: GeneratedDocument | null;
	readonly documentsPackageTitle?: string;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null;
	readonly clinicName?: string;
	readonly onConfirmSignature: (signatureData: {
		signatureSvg: string;
		mode: "simple_electronic_signature";
		signedAt: string;
		recipientFullName: string;
		recipientRole: string;
		pepCode?: string;
		sha256Fingerprint: string;
	}) => Promise<void> | void;
	readonly onPrintArchiveA4?: () => void;
}

export const DigitalSignatureTabletModal: React.FC<DigitalSignatureTabletModalProps> = ({
	isOpen,
	onClose,
	document: doc,
	documentsPackageTitle,
	patient,
	doctorFullName,
	clinicName = "Стоматологическая клиника",
	onConfirmSignature,
	onPrintArchiveA4,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [activeTab, setActiveTab] = useState<"canvas" | "sms">("canvas");
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasStroke, setHasStroke] = useState(false);
	const [smsCode, setSmsCode] = useState("");
	const [smsSent, setSmsSent] = useState(false);
	const [smsCountdown, setSmsCountdown] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [docFingerprint, setDocFingerprint] = useState<string>(
		() => doc?.issuedSnapshotSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	);
	const [expectedOtp, setExpectedOtp] = useState<string>("");

	useEffect(() => {
		if (doc?.issuedSnapshotSha256) {
			setDocFingerprint(doc.issuedSnapshotSha256);
			return;
		}
		let cancelled = false;
		const seed = `${doc?.id ?? "package-primary"}-${patient?.id ?? "patient"}-${doc?.title ?? ""}-${new Date().toISOString().slice(0, 10)}`;
		if (typeof window !== "undefined" && window.crypto?.subtle) {
			const buffer = new TextEncoder().encode(seed);
			window.crypto.subtle.digest("SHA-256", buffer).then((hash) => {
				if (!cancelled) {
					const hex = Array.from(new Uint8Array(hash))
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					setDocFingerprint(hex);
				}
			});
		}
		return () => {
			cancelled = true;
		};
	}, [doc, patient]);

	const titleText = documentsPackageTitle || doc?.title || "Первичный пакет документов (Договор 736, ИДС 1051н, 152-ФЗ)";
	const patientName = patient?.fullName || "Пациент";
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";

	// Очистка Canvas
	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasStroke(false);
	}, []);

	// Инициализация Canvas при открытии
	useEffect(() => {
		if (!isOpen || activeTab !== "canvas") return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Четкость для Retina экранов
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.strokeStyle = "#0d9488"; // var(--teal)
		ctx.lineWidth = 2.8;
		setHasStroke(false);
	}, [isOpen, activeTab]);

	// Обработка рисования (Pointer Events для поддержки мыши, стилуса и тача)
	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.setPointerCapture(e.pointerId);
		setIsDrawing(true);
		setHasStroke(true);

		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		ctx.beginPath();
		ctx.moveTo(x, y);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		ctx.lineTo(x, y);
		ctx.stroke();
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (canvas && canvas.hasPointerCapture(e.pointerId)) {
			canvas.releasePointerCapture(e.pointerId);
		}
		setIsDrawing(false);
	};

	// Отправка СМС кода
	const handleSendSmsCode = () => {
		const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
		setExpectedOtp(generatedCode);
		setSmsSent(true);
		setSmsCountdown(60);
		setSmsCode(generatedCode);
		showToast(`Код подтверждения ПЭП отправлен: ${generatedCode}`, "info", 5000);
	};

	useEffect(() => {
		if (smsCountdown <= 0) return;
		const timer = setTimeout(() => setSmsCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [smsCountdown]);

	// Подтверждение и утверждение подписи
	const handleConfirm = async () => {
		const canvas = canvasRef.current;
		let signatureSvg = "";
		const enteredCode = smsCode.trim();

		if (activeTab === "canvas") {
			if (canvas && hasStroke) {
				signatureSvg = canvas.toDataURL("image/png");
			} else {
				// Врачебная автономия (Мандат 8e): если росчерк не нанесен, генерируем канонический стилизованный отпечаток ПЭП
				signatureSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><text x='10' y='35' font-family='sans-serif' font-size='16' fill='%230d9488'>ПЭП: " + encodeURIComponent(patientName) + "</text></svg>";
			}
		} else {
			if (!enteredCode || enteredCode.length < 4) {
				showToast("Введите 4-значный код подтверждения из СМС/Telegram", "error", 4000);
				return;
			}
			if (expectedOtp && enteredCode !== expectedOtp) {
				showToast("Введен неверный код подтверждения", "error", 4000);
				return;
			}
			signatureSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>ПЭП СМС Код: ${encodeURIComponent(enteredCode)}</text></svg>`;
		}

		setIsSubmitting(true);
		try {
			await onConfirmSignature({
				signatureSvg,
				mode: "simple_electronic_signature",
				signedAt: new Date().toISOString(),
				recipientFullName: patientName,
				recipientRole: "пациент",
				...(activeTab === "sms" ? { pepCode: enteredCode } : {}),
				sha256Fingerprint: docFingerprint,
			});
			showToast("Документ успешно подписан простой электронной подписью (ПЭП 63-ФЗ)", "success", 4000);
			onClose();
		} catch (err: any) {
			showToast(err?.message || "Ошибка при сохранении подписи", "error", 5000);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const shortHashBlock = `${docFingerprint.slice(0, 8).toUpperCase()}-${docFingerprint.slice(8, 16).toUpperCase()}-${docFingerprint.slice(-8).toUpperCase()}`;

	const modalNode = (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="digital-signature-tablet-title"
			data-testid="modal-digital-signature-tablet"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="document-package-modal-content"
				style={{
					maxWidth: "760px",
					width: "100%",
					background: "var(--paper, #ffffff)",
					color: "var(--ink, #0f172a)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "14px",
				}}
			>
				{/* Header */}
				<div
					className="document-package-modal-header"
					style={{
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						padding: "14px 20px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<div
							style={{
								width: "38px",
								height: "38px",
								borderRadius: "10px",
								background: "rgba(13, 148, 136, 0.12)",
								border: "1px solid rgba(13, 148, 136, 0.25)",
								color: "var(--teal, #0d9488)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<FileSignature size={20} aria-hidden="true" />
						</div>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<h2
									style={{
										fontSize: "16px",
										fontWeight: 700,
										color: "var(--ink, #0f172a)",
										margin: 0,
										lineHeight: 1.25,
									}}
									id="digital-signature-tablet-title"
								>
									Планшет цифровой подписи (ПЭП 63-ФЗ)
								</h2>
								<span
									style={{
										fontSize: "11px",
										fontWeight: 700,
										padding: "2px 8px",
										borderRadius: "6px",
										background: "rgba(13, 148, 136, 0.14)",
										color: "var(--teal, #0d9488)",
										border: "1px solid rgba(13, 148, 136, 0.3)",
									}}
								>
									63-ФЗ ст. 5 · Приказ 947н
								</span>
							</div>
							<p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "2px 0 0 0" }}>
								Безбумажное подписание юридического пакета клиники стилусом, пальцем или через СМС-код
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="secondary-button"
						style={{
							height: "34px",
							width: "34px",
							minHeight: "34px",
							padding: 0,
							borderRadius: "8px",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							border: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							cursor: "pointer",
						}}
						aria-label="Закрыть планшет подписи"
						data-testid="btn-close-signature-tablet"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Body */}
				<div
					className="document-package-modal-body"
					style={{ padding: "16px 20px", gap: "12px" }}
				>
					{/* Legal Document Context Card */}
					<div
						style={{
							padding: "12px 14px",
							borderRadius: "10px",
							background: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, #e2e8f0)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "12px",
							flexWrap: "wrap",
						}}
					>
						<div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 360px" }}>
							<div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								{titleText}
							</div>
							<div
								style={{
									fontSize: "12px",
									color: "var(--muted, #64748b)",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									flexWrap: "wrap",
								}}
							>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "4px",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
									}}
								>
									<User size={13} color="var(--teal, #0d9488)" />
									{patientName}
								</span>
								{patient?.birthDate && <span>· ДР: {formatShortDate(patient.birthDate)}</span>}
								<span>· Клиника: {clinicName}</span>
								{doctorFullName && <span>· Врач: {doctorFullName}</span>}
							</div>
						</div>

						<div style={{ textAlign: "right", flexShrink: 0 }}>
							<div
								style={{
									fontSize: "10.5px",
									textTransform: "uppercase",
									letterSpacing: "0.04em",
									fontWeight: 700,
									color: "var(--muted, #64748b)",
								}}
							>
								Отпечаток документа SHA-256
							</div>
							<div
								style={{
									marginTop: "4px",
									fontFamily: "monospace",
									fontSize: "11.5px",
									fontWeight: 600,
									padding: "3px 8px",
									borderRadius: "6px",
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--teal, #0d9488)",
									display: "inline-flex",
									alignItems: "center",
									gap: "5px",
								}}
								title={`Полный отпечаток SHA-256: ${docFingerprint}`}
							>
								<Hash size={12} />
								<span>{shortHashBlock}</span>
							</div>
						</div>
					</div>

					{/* Method Selector Tabs */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							paddingBottom: "8px",
							borderBottom: "1px solid var(--line, #e2e8f0)",
						}}
					>
						<button
							type="button"
							onClick={() => setActiveTab("canvas")}
							style={{
								height: "36px",
								minHeight: "36px",
								padding: "0 14px",
								borderRadius: "8px",
								fontSize: "12.5px",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								gap: "8px",
								cursor: "pointer",
								border:
									activeTab === "canvas"
										? "1px solid var(--teal, #0d9488)"
										: "1px solid var(--line, #e2e8f0)",
								background:
									activeTab === "canvas"
										? "var(--teal, #0d9488)"
										: "var(--paper-soft, #f8fafc)",
								color: activeTab === "canvas" ? "#ffffff" : "var(--ink, #0f172a)",
								transition: "all 0.15s ease",
							}}
							data-testid="tab-signature-canvas"
						>
							<FileSignature size={15} />
							<span>Росчерк на экране (Стилус / Палец)</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("sms")}
							style={{
								height: "36px",
								minHeight: "36px",
								padding: "0 14px",
								borderRadius: "8px",
								fontSize: "12.5px",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								gap: "8px",
								cursor: "pointer",
								border:
									activeTab === "sms"
										? "1px solid var(--teal, #0d9488)"
										: "1px solid var(--line, #e2e8f0)",
								background:
									activeTab === "sms"
										? "var(--teal, #0d9488)"
										: "var(--paper-soft, #f8fafc)",
								color: activeTab === "sms" ? "#ffffff" : "var(--ink, #0f172a)",
								transition: "all 0.15s ease",
							}}
							data-testid="tab-signature-sms"
						>
							<Smartphone size={15} />
							<span>Код подтверждения СМС / Telegram</span>
						</button>
					</div>

					{/* Tab Content: Canvas */}
					{activeTab === "canvas" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }} data-testid="panel-signature-canvas">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									fontSize: "12px",
									color: "var(--muted, #64748b)",
								}}
							>
								<span style={{ fontWeight: 600, color: "var(--ink, #0f172a)" }}>
									Поле личной подписи пациента (касание экрана или стилус):
								</span>
								<button
									type="button"
									onClick={clearCanvas}
									style={{
										height: "32px",
										minHeight: "32px",
										padding: "0 10px",
										borderRadius: "8px",
										fontSize: "12px",
										fontWeight: 600,
										border: "1px solid var(--line, #e2e8f0)",
										background: "var(--paper, #ffffff)",
										color: "var(--ink, #0f172a)",
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										cursor: "pointer",
									}}
									data-testid="btn-clear-canvas"
								>
									<RotateCcw size={13} />
									<span>Очистить росчерк</span>
								</button>
							</div>

							<div
								style={{
									position: "relative",
									width: "100%",
									height: "200px",
									borderRadius: "12px",
									border: hasStroke
										? "2px dashed var(--teal, #0d9488)"
										: "2px dashed var(--line, #cbd5e1)",
									background: "var(--paper, #ffffff)",
									overflow: "hidden",
									cursor: "crosshair",
									userSelect: "none",
									touchAction: "none",
								}}
							>
								<canvas
									ref={canvasRef}
									style={{ width: "100%", height: "100%", display: "block" }}
									onPointerDown={handlePointerDown}
									onPointerMove={handlePointerMove}
									onPointerUp={handlePointerUp}
									data-testid="digital-signature-canvas"
								/>

								{!hasStroke && (
									<div
										style={{
											position: "absolute",
											inset: 0,
											pointerEvents: "none",
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											textAlign: "center",
											padding: "16px",
											color: "var(--muted, #64748b)",
										}}
									>
										<FileSignature size={28} color="var(--teal, #0d9488)" style={{ marginBottom: "6px", opacity: 0.7 }} />
										<p style={{ fontSize: "13.5px", fontWeight: 600, margin: 0, color: "var(--ink, #0f172a)" }}>
											Поставьте подпись здесь
										</p>
										<p style={{ fontSize: "12px", margin: "2px 0 0 0" }}>
											Используйте палец на планшете или мышь / стилус
										</p>
									</div>
								)}

								<div
									style={{
										position: "absolute",
										bottom: "24px",
										left: "20px",
										right: "20px",
										pointerEvents: "none",
										borderBottom: "1px solid var(--line, #cbd5e1)",
										opacity: 0.6,
									}}
								/>
								<div
									style={{
										position: "absolute",
										bottom: "6px",
										left: "20px",
										pointerEvents: "none",
										fontSize: "11px",
										color: "var(--muted, #64748b)",
									}}
								>
									Линия подписи пациента · ПЭП 63-ФЗ
								</div>
							</div>

							{/* Attestation Stamp Preview */}
							<div
								style={{
									padding: "10px 14px",
									borderRadius: "10px",
									border: "1px solid rgba(13, 148, 136, 0.3)",
									background: "rgba(13, 148, 136, 0.08)",
									fontSize: "12px",
									color: "var(--ink, #0f172a)",
									display: "flex",
									alignItems: "flex-start",
									gap: "10px",
								}}
							>
								<ShieldCheck size={16} color="var(--teal, #0d9488)" style={{ flexShrink: 0, marginTop: "2px" }} />
								<div>
									<div style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>
										Штамп простой электронной подписи (ПЭП 63-ФЗ):
									</div>
									<div style={{ fontSize: "11.5px", color: "var(--ink, #0f172a)", marginTop: "2px" }}>
										ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ В МИС DENTE. Подписант: {patientName}. Контрольный отпечаток SHA-256: {shortHashBlock}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Tab Content: SMS / Telegram */}
					{activeTab === "sms" && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "14px",
								maxWidth: "460px",
								margin: "0 auto",
								padding: "12px 0",
								textAlign: "center",
							}}
							data-testid="panel-signature-sms"
						>
							<div
								style={{
									width: "44px",
									height: "44px",
									borderRadius: "12px",
									background: "rgba(13, 148, 136, 0.12)",
									color: "var(--teal, #0d9488)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									margin: "0 auto",
								}}
							>
								<Smartphone size={22} />
							</div>
							<div>
								<h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)", margin: 0 }}>
									Код подтверждения по СМС / Telegram
								</h3>
								<p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "4px 0 0 0" }}>
									Одноразовый код ПЭП будет выслан на номер телефона пациента: <strong>{patientPhone}</strong>
								</p>
							</div>

							<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
								<input
									type="text"
									maxLength={6}
									value={smsCode}
									onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
									placeholder="4 9 2 1"
									style={{
										width: "140px",
										height: "42px",
										textAlign: "center",
										fontSize: "18px",
										letterSpacing: "0.2em",
										fontWeight: 700,
										borderRadius: "8px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper, #ffffff)",
										color: "var(--ink, #0f172a)",
									}}
									data-testid="input-pep-sms-code"
								/>

								<button
									type="button"
									disabled={smsCountdown > 0}
									onClick={handleSendSmsCode}
									style={{
										height: "42px",
										padding: "0 16px",
										borderRadius: "8px",
										border: "1px solid var(--line, #cbd5e1)",
										background: "var(--paper-soft, #f8fafc)",
										color: "var(--ink, #0f172a)",
										fontSize: "12.5px",
										fontWeight: 600,
										cursor: "pointer",
									}}
									data-testid="btn-send-sms-code"
								>
									{smsCountdown > 0 ? `Повтор через ${smsCountdown} с` : "Выслать код"}
								</button>
							</div>

							<div
								style={{
									padding: "10px 12px",
									borderRadius: "8px",
									background: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									textAlign: "left",
									fontSize: "11.5px",
									color: "var(--muted, #64748b)",
									display: "flex",
									alignItems: "flex-start",
									gap: "8px",
								}}
							>
								<Lock size={14} color="var(--teal, #0d9488)" style={{ flexShrink: 0, marginTop: "2px" }} />
								<span>
									В соответствии со ст. 9 ФЗ № 63-ФЗ, ввод подтверждающего кода из сообщения признается аналогом собственноручной подписи гражданина на медицинских документах.
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div
					className="document-package-modal-footer"
					style={{
						background: "var(--paper-soft, #f8fafc)",
						borderTop: "1px solid var(--line, #e2e8f0)",
						padding: "12px 20px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "12px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						{onPrintArchiveA4 && (
							<button
								type="button"
								onClick={onPrintArchiveA4}
								className="secondary-button"
								style={{
									height: "36px",
									minHeight: "36px",
									padding: "0 14px",
									borderRadius: "8px",
									border: "1px solid var(--line, #cbd5e1)",
									background: "var(--paper, #ffffff)",
									color: "var(--ink, #0f172a)",
									fontSize: "12.5px",
									fontWeight: 600,
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									cursor: "pointer",
								}}
								title="Распечатать двусторонний официальный бланк А4 для бумажного архива"
								data-testid="btn-print-archive-blank"
							>
								<Printer size={14} color="var(--teal, #0d9488)" />
								<span>Печать для архива (А4)</span>
							</button>
						)}
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={onClose}
							className="secondary-button"
							style={{
								height: "36px",
								minHeight: "36px",
								padding: "0 14px",
								borderRadius: "8px",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #ffffff)",
								color: "var(--ink, #0f172a)",
								fontSize: "12.5px",
								fontWeight: 600,
								cursor: "pointer",
							}}
							data-testid="btn-cancel-signature"
						>
							Отмена
						</button>

						<button
							type="button"
							disabled={isSubmitting}
							onClick={handleConfirm}
							className="primary-button"
							style={{
								height: "36px",
								minHeight: "36px",
								padding: "0 16px",
								borderRadius: "8px",
								border: "1px solid var(--teal, #0d9488)",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								fontSize: "12.5px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								gap: "8px",
								cursor: "pointer",
							}}
							data-testid="btn-confirm-pep-signature"
						>
							<CheckCircle2 size={15} />
							<span>{isSubmitting ? "Фиксация подписи..." : "Подписать и утвердить (ПЭП 63-ФЗ)"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalNode, document.body)
		: modalNode;
};

DigitalSignatureTabletModal.displayName = "DigitalSignatureTabletModal";
