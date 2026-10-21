import React, { useEffect } from "react";
import { FileSignature, RotateCcw, ShieldCheck } from "lucide-react";

interface SignatureCanvasPanelProps {
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly hasStroke: boolean;
	readonly setHasStroke: (val: boolean) => void;
	readonly clearCanvas: () => void;
	readonly patientName: string;
	readonly docFingerprint: string;
}

export const SignatureCanvasPanel: React.FC<SignatureCanvasPanelProps> = ({
	canvasRef,
	hasStroke,
	setHasStroke,
	clearCanvas,
	patientName,
	docFingerprint,
}) => {
	const shortHash = `${docFingerprint.slice(0, 8).toUpperCase()}-${docFingerprint.slice(8, 16).toUpperCase()}-${docFingerprint.slice(-8).toUpperCase()}`;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.strokeStyle = "#0d9488";
		ctx.lineWidth = 2.8;
	}, [canvasRef]);

	let isDrawing = false;
	const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.setPointerCapture(e.pointerId);
		isDrawing = true;
		setHasStroke(true);
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext("2d");
		if (ctx) { ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top); }
	};
	const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const ctx = canvas.getContext("2d");
		if (ctx) { ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke(); }
	};
	const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (canvas && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
		isDrawing = false;
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }} data-testid="panel-signature-canvas">
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
				<span style={{ fontWeight: 600, color: "var(--ink, #0f172a)" }}>
					Поле личной подписи пациента (касание экрана или стилус):
				</span>
				<button type="button" onClick={clearCanvas} className="secondary-button" style={{ minHeight: "44px", padding: "0 14px", borderRadius: "8px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", touchAction: "manipulation" }} data-testid="btn-clear-canvas">
					<RotateCcw size={14} />
					<span>Очистить росчерк</span>
				</button>
			</div>
			<div style={{ position: "relative", width: "100%", height: "220px", borderRadius: "12px", border: hasStroke ? "2px dashed var(--teal, #0d9488)" : "2px dashed var(--line, #cbd5e1)", background: "var(--paper, #ffffff)", overflow: "hidden", cursor: "crosshair", touchAction: "none" }}>
				<canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} data-testid="digital-signature-canvas" />
				{!hasStroke && (
					<div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted, #64748b)" }}>
						<FileSignature size={28} color="var(--teal, #0d9488)" style={{ opacity: 0.7, marginBottom: "4px" }} />
						<p style={{ fontSize: "13px", fontWeight: 600, margin: 0, color: "var(--ink, #0f172a)" }}>Поставьте подпись здесь</p>
						<p style={{ fontSize: "11.5px", margin: "2px 0 0 0" }}>Палец на смартфоне/планшете или стилус</p>
					</div>
				)}
				<div style={{ position: "absolute", bottom: "6px", left: "16px", pointerEvents: "none", fontSize: "11px", color: "var(--muted, #64748b)" }}>
					Линия подписи пациента · ПЭП 63-ФЗ
				</div>
			</div>
			<div style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(13, 148, 136, 0.3)", background: "rgba(13, 148, 136, 0.08)", fontSize: "11.5px", display: "flex", gap: "8px" }}>
				<ShieldCheck size={16} color="var(--teal, #0d9488)" style={{ flexShrink: 0, marginTop: "2px" }} />
				<div>
					<span style={{ fontWeight: 700, color: "var(--teal, #0d9488)" }}>Штамп ПЭП (63-ФЗ): </span>
					Подписант: {patientName}. Хеш: {shortHash}
				</div>
			</div>
		</div>
	);
};
