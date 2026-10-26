import { useEffect, useState } from "react";
import { useBudgetCanvasDrawing } from "./useBudgetCanvasDrawing";
import { useBudgetFetchAndVerify } from "./useBudgetFetchAndVerify";

export function useBudgetSignState(
	propToken: string | undefined,
	apiBaseUrl: string,
	onSuccess?: (data: { signedAt: string; documentHash: string }) => void,
) {
	const {
		activeToken, budget, setBudget, sessionToken, isLoading, fetchError,
		verifyFactor, setVerifyFactor, isVerifying, verifyError, handleVerifySubmit,
	} = useBudgetFetchAndVerify(propToken, apiBaseUrl);

	const [signerName, setSignerName] = useState<string>("");
	const [isSubmittingSign, setIsSubmittingSign] = useState<boolean>(false);
	const [signError, setSignError] = useState<string | null>(null);
	const [legalConsent152Fz, setLegalConsent152Fz] = useState<boolean>(true);

	useEffect(() => {
		if (budget?.patientFirstName && !signerName) {
			setSignerName(budget.patientFirstName);
		}
	}, [budget?.patientFirstName, signerName]);

	const {
		canvasRef, hasStrokes, setupCanvas, startDrawing, draw, stopDrawing, clearCanvas, handleOneClickPep,
	} = useBudgetCanvasDrawing(signerName, budget?.patientFirstName);

	useEffect(() => {
		if (budget && budget.isVerified && budget.status !== "accepted") {
			setupCanvas();
			const handleResize = () => setupCanvas();
			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}
	}, [budget, setupCanvas]);

	const handleSignSubmit = async () => {
		if (!activeToken) return;
		if (!legalConsent152Fz) {
			setSignError("Необходимо подтвердить согласие на обработку персональных данных (152-ФЗ) и утверждение сметы.");
			return;
		}
		if (!hasStrokes && canvasRef.current) handleOneClickPep();
		setIsSubmittingSign(true);
		setSignError(null);
		try {
			const signaturePng = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
			const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}/sign`, {
				method: "POST",
				headers,
				body: JSON.stringify({ signaturePng, signerName: signerName.trim() || budget?.patientFirstName || "Пациент" }),
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				setSignError(data.message || "Не удалось сохранить подпись сметы.");
				return;
			}
			setBudget((prev) => prev ? {
				...prev,
				status: "accepted",
				signedAt: data.signedAt || new Date().toISOString(),
				documentHash: data.documentHash || null,
				signerName: data.signerName || signerName,
			} : null);
			onSuccess?.({ signedAt: data.signedAt, documentHash: data.documentHash });
		} catch {
			setSignError("Сетевая ошибка при отправке подписи.");
		} finally {
			setIsSubmittingSign(false);
		}
	};

	return {
		budget, isLoading, fetchError,
		verifyFactor, setVerifyFactor, isVerifying, verifyError, handleVerifySubmit,
		canvasRef, hasStrokes, startDrawing, draw, stopDrawing, clearCanvas, handleOneClickPep,
		signerName, setSignerName, legalConsent152Fz, setLegalConsent152Fz,
		isSubmittingSign, signError, handleSignSubmit,
	};
}
