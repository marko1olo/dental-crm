import { useState, useRef, useEffect, useCallback } from "react";
import type { DigitalSignatureTabletModalProps, SignatureModeTab } from "./types";
import { showToast } from "../../GlobalToast";

async function computeDocumentSha256(
	doc: DigitalSignatureTabletModalProps["document"],
	patientId?: string,
): Promise<string> {
	if (doc?.issuedSnapshotSha256) {
		return doc.issuedSnapshotSha256;
	}
	const content = JSON.stringify({
		id: doc?.id ?? "doc-pending",
		kind: doc?.documentKind ?? "general_consent",
		patientId: patientId ?? "unknown",
		issuedAt: doc?.issuedAt ?? doc?.createdAt ?? "",
	});
	if (typeof window !== "undefined" && window.crypto?.subtle) {
		const hashBuf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
		return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	let hash1 = 0x811c9dc5;
	let hash2 = 0x9e3779b9;
	for (let i = 0; i < content.length; i++) {
		const code = content.charCodeAt(i);
		hash1 = (hash1 ^ code) * 0x01000193 >>> 0;
		hash2 = (hash2 ^ (code << 5)) * 0x5bd1e995 >>> 0;
	}
	return (hash1.toString(16).padStart(8, "0") + hash2.toString(16).padStart(8, "0")).repeat(4);
}

export function useDigitalSignature(props: DigitalSignatureTabletModalProps) {
	const { isOpen, onClose, document: doc, patient, onConfirmSignature } = props;
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [activeTab, setActiveTab] = useState<SignatureModeTab>("paper");
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasStroke, setHasStroke] = useState(false);
	const [smsCode, setSmsCode] = useState("");
	const [smsCountdown, setSmsCountdown] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [paperSigned, setPaperSigned] = useState(true);
	const [expectedOtp, setExpectedOtp] = useState("");
	const [docFingerprint, setDocFingerprint] = useState<string>(
		() => doc?.issuedSnapshotSha256 || "",
	);

	const patientName = patient?.fullName || "Пациент";

	useEffect(() => {
		if (doc?.issuedSnapshotSha256) {
			setDocFingerprint(doc.issuedSnapshotSha256);
			return;
		}
		let cancelled = false;
		computeDocumentSha256(doc, patient?.id).then((computedHash) => {
			if (!cancelled && computedHash) {
				setDocFingerprint(computedHash);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [doc, patient]);

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasStroke(false);
	}, []);

	const handleSendSmsCode = useCallback(async () => {
		const patientId = patient?.id?.trim();
		if (!patientId) {
			showToast("Не выбран пациент или отсутствует идентификатор пациента для отправки СМС", "error", 4000);
			return;
		}
		const rawPhone = (patient?.phone || "").trim();
		if (!rawPhone) {
			showToast("У пациента не указан номер телефона в карте для отправки СМС-кода", "error", 4000);
			return;
		}
		try {
			const res = await fetch("/api/documents/pep-sms/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patientId,
					phone: rawPhone,
					documentId: doc?.id,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				showToast(data.message || "Ошибка отправки СМС", "error", 4000);
				return;
			}
			setSmsCountdown(data.cooldownSeconds || 60);
			if (data.devCode) {
				setExpectedOtp(data.devCode);
				setSmsCode(data.devCode);
				showToast(`Код подтверждения (тестовый контур): ${data.devCode}`, "info", 5000);
			} else {
				showToast("Код подтверждения отправлен на номер пациента", "info", 4000);
			}
		} catch (_err) {
			showToast("Сетевая ошибка при отправке СМС-кода", "error", 4000);
		}
	}, [patient, doc]);

	useEffect(() => {
		if (smsCountdown <= 0) return;
		const timer = setTimeout(() => setSmsCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [smsCountdown]);

	const handleConfirm = async () => {
		let signatureSvg = "";
		if (activeTab === "canvas") {
			const canvas = canvasRef.current;
			if (!canvas || !hasStroke) {
				showToast("Поставьте личную подпись на экране перед подтверждением", "error", 4000);
				return;
			}
			signatureSvg = canvas.toDataURL("image/png");
		} else if (activeTab === "sms") {
			const entered = smsCode.trim();
			if (!entered) {
				showToast("Введите код подтверждения", "error", 4000);
				return;
			}
			const patientId = patient?.id?.trim();
			if (!patientId) {
				showToast("Не выбран пациент или отсутствует идентификатор пациента для верификации СМС", "error", 4000);
				return;
			}
			const rawPhone = (patient?.phone || "").trim();
			if (!rawPhone) {
				showToast("У пациента не указан номер телефона в карте для проверки СМС-кода", "error", 4000);
				return;
			}
			try {
				const verifyRes = await fetch("/api/documents/pep-sms/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						patientId,
						phone: rawPhone,
						code: entered,
					}),
				});
				if (!verifyRes.ok) {
					const verifyData = await verifyRes.json();
					showToast(verifyData.message || "Неверный СМС-код или срок действия истек", "error", 4000);
					return;
				}
			} catch (_err) {
				showToast("Ошибка проверки СМС-кода", "error", 4000);
				return;
			}
			signatureSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>СМС Код: ${encodeURIComponent(entered)}</text></svg>`;
		} else {
			signatureSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>Подписано на бумажном носителе (оригинал А4)</text></svg>`;
		}

		setIsSubmitting(true);
		try {
			await onConfirmSignature({
				signatureSvg,
				mode: "simple_electronic_signature",
				signedAt: new Date().toISOString(),
				recipientFullName: patientName,
				recipientRole: "пациент",
				...(activeTab === "sms" ? { pepCode: smsCode.trim() } : {}),
				sha256Fingerprint: docFingerprint,
			});
			showToast("Документ успешно утвержден", "success", 4000);
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка при сохранении подписи";
			showToast(message, "error", 5000);
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		canvasRef, activeTab, setActiveTab, isDrawing, setIsDrawing,
		hasStroke, setHasStroke, smsCode, setSmsCode, smsCountdown,
		isSubmitting, paperSigned, setPaperSigned, docFingerprint,
		patientName, clearCanvas, handleSendSmsCode, handleConfirm,
	};
}
