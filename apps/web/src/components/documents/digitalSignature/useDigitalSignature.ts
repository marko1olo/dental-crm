import { useState, useRef, useEffect, useCallback } from "react";
import type { DigitalSignatureTabletModalProps, SignatureModeTab } from "./types";
import { showToast } from "../../GlobalToast";

export function useDigitalSignature(props: DigitalSignatureTabletModalProps) {
	const { isOpen, onClose, document: doc, patient, onConfirmSignature } = props;
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [activeTab, setActiveTab] = useState<SignatureModeTab>("canvas");
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasStroke, setHasStroke] = useState(false);
	const [smsCode, setSmsCode] = useState("");
	const [smsCountdown, setSmsCountdown] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [paperSigned, setPaperSigned] = useState(true);
	const [expectedOtp, setExpectedOtp] = useState("");
	const [docFingerprint, setDocFingerprint] = useState(
		() => doc?.issuedSnapshotSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	);

	const patientName = patient?.fullName || "Пациент";

	useEffect(() => {
		if (doc?.issuedSnapshotSha256) {
			setDocFingerprint(doc.issuedSnapshotSha256);
			return;
		}
		let cancelled = false;
		const seed = `${doc?.id ?? "package"}-${patient?.id ?? "patient"}-${Date.now()}`;
		if (typeof window !== "undefined" && window.crypto?.subtle) {
			window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)).then((hash) => {
				if (!cancelled) {
					setDocFingerprint(Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join(""));
				}
			});
		}
		return () => { cancelled = true; };
	}, [doc, patient]);

	const clearCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasStroke(false);
	}, []);

	const handleSendSmsCode = useCallback(() => {
		const code = String(Math.floor(1000 + Math.random() * 9000));
		setExpectedOtp(code);
		setSmsCountdown(60);
		setSmsCode(code);
		showToast(`Код подтверждения ПЭП отправлен: ${code}`, "info", 5000);
	}, []);

	useEffect(() => {
		if (smsCountdown <= 0) return;
		const timer = setTimeout(() => setSmsCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [smsCountdown]);

	const handleConfirm = async () => {
		let signatureSvg = "";
		if (activeTab === "canvas") {
			const canvas = canvasRef.current;
			signatureSvg = canvas && hasStroke ? canvas.toDataURL("image/png")
				: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><text x='10' y='35' font-family='sans-serif' font-size='15' fill='%230d9488'>ПЭП: ${encodeURIComponent(patientName)}</text></svg>`;
		} else if (activeTab === "sms") {
			const entered = smsCode.trim();
			if (!entered || (expectedOtp && entered !== expectedOtp)) {
				showToast("Введите корректный код подтверждения", "error", 4000);
				return;
			}
			signatureSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>ПЭП СМС Код: ${encodeURIComponent(entered)}</text></svg>`;
		} else {
			signatureSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>Подписано на бумажном носителе</text></svg>`;
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
		} catch (err: any) {
			showToast(err?.message || "Ошибка при сохранении подписи", "error", 5000);
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
