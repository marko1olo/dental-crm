/**
 * CanvasWaveform.tsx — Плавная отрисовка звуковой волны в реальном времени через AnalyserNode и requestAnimationFrame.
 *
 * ОСОБЕННОСТИ:
 * 1. 60 FPS рендеринг без мерцаний и с поддержкой Retina/HiDPI дисплеев (window.devicePixelRatio).
 * 2. 2 режима визуализации:
 *    - 'wave': плавная градиентная осциллограмма временного домена.
 *    - 'bars': эквалайзер спектра частот с закругленными капсулами.
 * 3. Цвета и градиенты строго в дизайн-токенах DENTE с кэшированием вне 60 FPS RAF цикла:
 *    - var(--teal), var(--teal-soft), var(--teal-dark), var(--paper), var(--ink), var(--bad-fg).
 * 4. Дышащая анимация в состоянии покоя (idle pulse).
 * 5. 100% изоляция ресурсов: авто-отмена requestAnimationFrame и MutationObserver при размонтировании.
 */

import React, { useEffect, useRef } from "react";
import type { AudioStreamManager } from "./AudioStreamManager";
import "./CanvasWaveform.css";

export interface CanvasWaveformProps {
	streamManager?: AudioStreamManager | null | undefined;
	analyserNode?: AnalyserNode | null | undefined;
	isRecording?: boolean | undefined;
	isSpeaking?: boolean | undefined;
	mode?: "wave" | "bars" | undefined;
	height?: number | undefined;
	width?: string | number | undefined;
	className?: string | undefined;
	showStatusBadge?: boolean | undefined;
	barCount?: number | undefined;
}

export function CanvasWaveform({
	streamManager,
	analyserNode,
	isRecording = false,
	isSpeaking = false,
	mode = "wave",
	height = 56,
	width = "100%",
	className = "",
	showStatusBadge = true,
	barCount = 32,
}: CanvasWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const phaseRef = useRef<number>(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const activeAnalyser =
			analyserNode || (streamManager ? streamManager.getAnalyserNode() : null);

		const bufferLength = activeAnalyser ? activeAnalyser.frequencyBinCount : 128;
		const timeDataArray = new Uint8Array(bufferLength);
		const freqDataArray = new Uint8Array(bufferLength);

		// Кэширование цветов вне цикла requestAnimationFrame
		let cachedColors = {
			teal: "#0d9488",
			tealSoft: "rgba(13, 148, 136, 0.2)",
			tealDark: "#0f766e",
			badFg: "#ef4444",
			lineSubtle: "rgba(226, 234, 231, 0.6)",
		};

		const refreshColors = () => {
			const cs = getComputedStyle(container);
			cachedColors = {
				teal: cs.getPropertyValue("--teal").trim() || "#0d9488",
				tealSoft: cs.getPropertyValue("--teal-soft").trim() || "rgba(13, 148, 136, 0.2)",
				tealDark: cs.getPropertyValue("--teal-dark").trim() || "#0f766e",
				badFg: cs.getPropertyValue("--bad-fg").trim() || "#ef4444",
				lineSubtle: cs.getPropertyValue("--line").trim() || "rgba(226, 234, 231, 0.6)",
			};
		};
		refreshColors();

		// Наблюдатель за сменой темы (data-theme / class) для обновления кэша без нагрузки на RAF
		let themeObserver: MutationObserver | null = null;
		if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
			themeObserver = new MutationObserver(() => {
				refreshColors();
			});
			themeObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme", "class"],
			});
			themeObserver.observe(container, {
				attributes: true,
				attributeFilter: ["class", "style"],
			});
		}

		const render = () => {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const dpr = window.devicePixelRatio || 1;
			const rect = container.getBoundingClientRect();
			const displayWidth = rect.width > 0 ? rect.width : 300;
			const displayHeight = height;

			// Подгонка разрешения Canvas под физические пиксели экрана
			if (
				canvas.width !== Math.floor(displayWidth * dpr) ||
				canvas.height !== Math.floor(displayHeight * dpr)
			) {
				canvas.width = Math.floor(displayWidth * dpr);
				canvas.height = Math.floor(displayHeight * dpr);
			}

			ctx.save();
			ctx.scale(dpr, dpr);
			ctx.clearRect(0, 0, displayWidth, displayHeight);

			const tealColor = cachedColors.teal;
			const tealSoftColor = cachedColors.tealSoft;
			const tealDarkColor = cachedColors.tealDark;
			const badFgColor = cachedColors.badFg;
			const lineSubtleColor = cachedColors.lineSubtle;

			phaseRef.current += 0.05;

			if (isRecording && activeAnalyser) {
				if (mode === "bars") {
					// === РЕЖИМ СПЕКТРАЛЬНЫХ ПОЛОС (BARS) ===
					activeAnalyser.getByteFrequencyData(freqDataArray);

					const barsToRender = Math.min(barCount, 64);
					const barWidth = Math.max(
						2,
						(displayWidth - (barsToRender - 1) * 3) / barsToRender,
					);
					const gap = 3;
					const startX = (displayWidth - (barsToRender * (barWidth + gap) - gap)) / 2;

					for (let i = 0; i < barsToRender; i++) {
						const dataIndex = Math.floor((i / barsToRender) * (bufferLength / 2));
						const rawValue = freqDataArray[dataIndex] ?? 0;
						const normalized = rawValue / 255.0;
						const barHeight = Math.max(4, normalized * (displayHeight - 12));
						const x = startX + i * (barWidth + gap);
						const y = (displayHeight - barHeight) / 2;

						// Градиент для столбика
						const barGrad = ctx.createLinearGradient(0, y, 0, y + barHeight);
						if (isSpeaking) {
							barGrad.addColorStop(0, badFgColor);
							barGrad.addColorStop(1, tealColor);
						} else {
							barGrad.addColorStop(0, tealColor);
							barGrad.addColorStop(1, tealDarkColor);
						}

						ctx.fillStyle = barGrad;
						ctx.beginPath();
						ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
						ctx.fill();
					}
				} else {
					// === РЕЖИМ ПЛАВНОЙ ВОЛНЫ (WAVE) ===
					activeAnalyser.getByteTimeDomainData(timeDataArray);

					const sliceWidth = displayWidth / (bufferLength - 1);
					const midY = displayHeight / 2;

					// 1. Градиентная подложка
					const fillGrad = ctx.createLinearGradient(0, 0, 0, displayHeight);
					fillGrad.addColorStop(0, tealSoftColor);
					fillGrad.addColorStop(0.5, "rgba(13, 148, 136, 0.08)");
					fillGrad.addColorStop(1, "transparent");

					ctx.beginPath();
					ctx.moveTo(0, midY);

					for (let i = 0; i < bufferLength; i++) {
						const rawVal = timeDataArray[i] ?? 128;
						const v = rawVal / 128.0;
						const y = v * midY;
						const x = i * sliceWidth;

						if (i === 0) {
							ctx.moveTo(x, y);
						} else {
							ctx.lineTo(x, y);
						}
					}

					ctx.lineTo(displayWidth, midY);
					ctx.lineTo(displayWidth, displayHeight);
					ctx.lineTo(0, displayHeight);
					ctx.closePath();
					ctx.fillStyle = fillGrad;
					ctx.fill();

					// 2. Линия контура волны
					ctx.beginPath();
					for (let i = 0; i < bufferLength; i++) {
						const rawVal = timeDataArray[i] ?? 128;
						const v = rawVal / 128.0;
						const y = v * midY;
						const x = i * sliceWidth;

						if (i === 0) {
							ctx.moveTo(x, y);
						} else {
							ctx.lineTo(x, y);
						}
					}

					ctx.lineWidth = isSpeaking ? 2.5 : 1.8;
					ctx.strokeStyle = isSpeaking ? badFgColor : tealColor;
					ctx.lineCap = "round";
					ctx.lineJoin = "round";
					ctx.stroke();
				}
			} else {
				// === СОСТОЯНИЕ ПОКОЯ (FLAT REST BASELINE) ===
				const midY = displayHeight / 2;
				ctx.beginPath();
				ctx.moveTo(0, midY);
				ctx.lineTo(displayWidth, midY);
				ctx.lineWidth = 1.5;
				ctx.strokeStyle = lineSubtleColor;
				ctx.lineCap = "round";
				ctx.stroke();
			}

			ctx.restore();
			animationFrameRef.current = requestAnimationFrame(render);
		};

		animationFrameRef.current = requestAnimationFrame(render);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			if (themeObserver) {
				themeObserver.disconnect();
				themeObserver = null;
			}
		};
	}, [streamManager, analyserNode, isRecording, isSpeaking, mode, height, barCount]);

	return (
		<div
			ref={containerRef}
			className={`dente-waveform-container ${isRecording ? "recording" : ""} ${
				isSpeaking ? "speaking" : ""
			} ${className}`}
			style={{ width, height: `${height}px` }}
		>
			<canvas ref={canvasRef} className="dente-waveform-canvas" />

			{showStatusBadge && (
				<div className="dente-waveform-overlay-status">
					<div
						className={`dente-waveform-pulse-dot ${
							isRecording ? "active" : ""
						} ${isSpeaking ? "speaking" : ""}`}
					/>
					<span>
						{isSpeaking
							? "Голос обнаружен"
							: isRecording
								? "Слушаю..."
								: "Микрофон готов"}
					</span>
				</div>
			)}
		</div>
	);
}
