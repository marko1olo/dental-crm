import type React from "react";
import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
	onSign: (signatureBase64: string) => void;
	onCancel: () => void;
}

export function SignaturePad({ onSign, onCancel }: SignaturePadProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [isEmpty, setIsEmpty] = useState(true);

	// БЫЛО: у эффекта была зависимость [isEmpty]. Первый же штрих менял isEmpty
	// на false, эффект перезапускался, присваивание canvas.width СБРАСЫВАЛО canvas
	// и уничтожало начатую линию — короткое касание не оставляло следа вообще.
	// Теперь размер пересчитывается только при монтировании и при resize окна,
	// а актуальное «пусто/не пусто» читается из ref, а не из зависимостей.
	const isEmptyRef = useRef(true);
	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current && canvasRef.current) {
				const { width, height } = containerRef.current.getBoundingClientRect();
				const canvas = canvasRef.current;
				// Save old content
				const ctx = canvas.getContext("2d");
				let imgData: ImageData | null = null;
				if (!isEmptyRef.current && ctx) {
					try {
						imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					} catch {
						// getImageData throws on tainted/zero-size canvas; preserve empty signature
					}
				}

				canvas.width = width;
				canvas.height = height;

				if (ctx) {
					ctx.lineCap = "round";
					ctx.lineJoin = "round";
					ctx.lineWidth = 3;
					ctx.strokeStyle = "#0f172a";

					// БЫЛО: при восстановлении содержимого белый фон НЕ перекрашивался.
					// Присваивание canvas.width обнуляет холст до прозрачного, и в
					// сохранённом PNG подпись оставалась на прозрачном фоне — на
					// печатном согласии она рендерилась поверх чёрного прямоугольника.
					// Фон заливаем всегда, содержимое накладываем сверху.
					ctx.fillStyle = "#ffffff";
					ctx.fillRect(0, 0, width, height);
					if (imgData) {
						// putImageData затирает пиксели целиком, поэтому переносим
						// старое изображение через промежуточный холст с наложением.
						const restoreCanvas = document.createElement("canvas");
						restoreCanvas.width = imgData.width;
						restoreCanvas.height = imgData.height;
						const restoreCtx = restoreCanvas.getContext("2d");
						if (restoreCtx) {
							restoreCtx.putImageData(imgData, 0, 0);
							ctx.drawImage(restoreCanvas, 0, 0);
						}
					}
				}
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Clean up references and memory on unmount
	useEffect(() => {
		return () => {
			if (canvasRef.current) {
				const ctx = canvasRef.current.getContext("2d");
				if (ctx) {
					ctx.clearRect(
						0,
						0,
						canvasRef.current.width,
						canvasRef.current.height,
					);
				}
			}
		};
	}, []);

	const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		setIsDrawing(true);
		setIsEmpty(false);
		isEmptyRef.current = false;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const pos = getPos(e, canvas);
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const pos = getPos(e, canvas);
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
	};

	const stopDrawing = () => {
		if (!isDrawing) return;
		setIsDrawing(false);
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (ctx) ctx.closePath();
		}
	};

	const getPos = (
		e: React.MouseEvent | React.TouchEvent,
		canvas: HTMLCanvasElement,
	) => {
		const rect = canvas.getBoundingClientRect();
		if ("touches" in e && e.touches.length > 0) {
			return {
				x: e.touches[0]!.clientX - rect.left,
				y: e.touches[0]!.clientY - rect.top,
			};
		}
		return {
			x: (e as React.MouseEvent).clientX - rect.left,
			y: (e as React.MouseEvent).clientY - rect.top,
		};
	};

	const clear = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		setIsEmpty(true);
		isEmptyRef.current = true;
	};

	const handleSave = () => {
		if (isEmpty || !canvasRef.current) return;
		// Подпись — часть юридического документа: гарантируем непрозрачный белый
		// фон в итоговом изображении независимо от истории изменений размера.
		const source = canvasRef.current;
		const flattened = document.createElement("canvas");
		flattened.width = source.width;
		flattened.height = source.height;
		const flatCtx = flattened.getContext("2d");
		if (!flatCtx) {
			onSign(source.toDataURL("image/png"));
			return;
		}
		flatCtx.fillStyle = "#ffffff";
		flatCtx.fillRect(0, 0, flattened.width, flattened.height);
		flatCtx.drawImage(source, 0, 0);
		onSign(flattened.toDataURL("image/png"));
	};

	return (
		<>
			<div className="modal-header">
				<h2 className="modal-title">Подпись документа</h2>
				<p className="modal-subtitle">
					Пожалуйста, распишитесь внутри поля ниже
				</p>
			</div>

			<div className="modal-body pb-0">
				<div
					ref={containerRef}
					className="relative w-full h-[320px] rounded-xl overflow-hidden border-2 border-dashed border-[var(--odontogram-border)] bg-[var(--paper-soft,#f8fafc)] transition-all hover:border-[var(--teal-500,#14b8a6)]"
					style={{ touchAction: "none" }}
				>
					<canvas
						ref={canvasRef}
						className="w-full h-full cursor-crosshair focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
						tabIndex={0}
						role="img"
						aria-label="Поле для графической подписи пациента"
						onMouseDown={startDrawing}
						onMouseMove={draw}
						onMouseUp={stopDrawing}
						onMouseOut={stopDrawing}
						onTouchStart={startDrawing}
						onTouchMove={draw}
						onTouchEnd={stopDrawing}
						onTouchCancel={stopDrawing}
					/>
					{isEmpty && (
						<div
							className="absolute inset-0 pointer-events-none flex items-center justify-center text-[var(--odontogram-ink-muted,#94a3b8)] text-lg font-medium select-none"
						>
							Место для подписи
						</div>
					)}
				</div>
			</div>

			<div className="modal-footer pt-6 flex items-center justify-between">
				<button
					type="button"
					onClick={clear}
					aria-label="Очистить подпись"
					className="modal-btn secondary flex-none focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
				>
					Очистить
				</button>
				<div className="flex items-center gap-3">
					<button 
						type="button" 
						onClick={onCancel} 
						aria-label="Отмена"
						className="modal-btn secondary focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={isEmpty}
						aria-label="Подписать документ"
						className="modal-btn primary focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Подписать
					</button>
				</div>
			</div>
		</>
	);
}

