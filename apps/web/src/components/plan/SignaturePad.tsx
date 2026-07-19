import React, { useRef, useState, useEffect } from "react";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
	onSign: (signature: string) => void;
	onClear?: () => void;
	title?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
	onSign,
	onClear,
	title = "Подпись пациента",
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [isEmpty, setIsEmpty] = useState(true);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// Handle high DPI displays
		const ctx = canvas.getContext("2d");
		if (ctx) {
			// Set initial background to white
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.lineWidth = 2;
			ctx.lineCap = "round";
			ctx.strokeStyle = "#1a1a1a";
		}
	}, []);

	const getCoordinates = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		
		if ("touches" in e) {
			const touch = e.touches[0];
			return {
				x: (touch?.clientX || 0) - rect.left,
				y: (touch?.clientY || 0) - rect.top,
			};
		}
		
		return {
			x: (e as React.MouseEvent).clientX - rect.left,
			y: (e as React.MouseEvent).clientY - rect.top,
		};
	};

	const startDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		e.preventDefault();
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!ctx) return;

		const { x, y } = getCoordinates(e);
		ctx.beginPath();
		ctx.moveTo(x, y);
		setIsDrawing(true);
		setIsEmpty(false);
	};

	const draw = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (!isDrawing) return;
		e.preventDefault();
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!ctx) return;

		const { x, y } = getCoordinates(e);
		ctx.lineTo(x, y);
		ctx.stroke();
	};

	const endDrawing = () => {
		if (!isDrawing) return;
		setIsDrawing(false);
		
		const canvas = canvasRef.current;
		if (canvas && !isEmpty) {
			const dataUrl = canvas.toDataURL("image/png");
			onSign(dataUrl);
		}
	};

	const handleClear = () => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (ctx && canvas) {
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			setIsEmpty(true);
			onSign("");
			onClear?.();
		}
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<label style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
					{title}
				</label>
				{!isEmpty && (
					<button
						type="button"
						onClick={handleClear}
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							display: "flex",
							alignItems: "center",
							gap: "4px",
							cursor: "pointer",
							fontSize: "12px",
						}}
					>
						<Eraser size={14} /> Очистить
					</button>
				)}
			</div>
			<div
				style={{
					border: "1px solid var(--line)",
					borderRadius: "8px",
					overflow: "hidden",
					background: "white",
					position: "relative",
					touchAction: "none", // Prevent scrolling while signing
				}}
			>
				{isEmpty && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							pointerEvents: "none",
							color: "var(--muted-border)",
							fontSize: "14px",
						}}
					>
						Распишитесь здесь
					</div>
				)}
				<canvas
					ref={canvasRef}
					width={400}
					height={150}
					style={{
						width: "100%",
						height: "150px",
						display: "block",
						cursor: "crosshair",
					}}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={endDrawing}
					onMouseLeave={endDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={endDrawing}
					onTouchCancel={endDrawing}
				/>
			</div>
		</div>
	);
};
