/**
 * AudioSpectrumWidget.tsx — Реалтайм-спектроанализатор частот и замерщик SNR микрофона.
 *
 * ФУНКЦИОНАЛ:
 * 1. 60 FPS рендеринг амплитудно-частотной характеристики (АЧХ) звукового потока.
 * 2. Графическая разметка ключевых клинических зон частот:
 *    - <120 Гц: Компрессор и низкочастотные вибрации.
 *    - 300–3400 Гц: Полоса формант человеческой речи.
 *    - 4.5–6.0 кГц: Зона свиста роторного наконечника и пьезо-скейлера.
 *    - >7 кГц: Ультразвуковые паразитные наводки.
 * 3. Непрерывный расчет отношения сигнал/шум (SNR) в реальном времени.
 * 4. Индикатор перегрузки / клиппинга (Clipping Guard).
 */

import React, { useEffect, useRef, useState } from "react";
import "./AudioSpectrumWidget.css";

export interface AudioSpectrumWidgetProps {
	analyserNode?: AnalyserNode | null | undefined;
	isActive?: boolean | undefined;
	isSpeaking?: boolean | undefined;
	height?: number | undefined;
	showLegend?: boolean | undefined;
	showMetrics?: boolean | undefined;
	title?: string | undefined;
	className?: string | undefined;
}

export function AudioSpectrumWidget({
	analyserNode,
	isActive = true,
	isSpeaking = false,
	height = 72,
	showLegend = true,
	showMetrics = true,
	title = "Спектроанализатор микрофона",
	className = "",
}: AudioSpectrumWidgetProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rafRef = useRef<number | null>(null);

	const [rmsDb, setRmsDb] = useState<number>(-70);
	const [noiseFloorDb, setNoiseFloorDb] = useState<number>(-65);
	const [speechPeakDb, setSpeechPeakDb] = useState<number>(-22);
	const [isClipping, setIsClipping] = useState<boolean>(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const activeAnalyser = analyserNode;
		const bufferLength = activeAnalyser ? activeAnalyser.frequencyBinCount : 256;
		const freqArray = new Uint8Array(bufferLength);
		const timeArray = new Uint8Array(bufferLength);

		let localNoiseFloor = -65;
		let localSpeechPeak = -22;
		let lastMetricsUpdate = Date.now();

		const render = () => {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const dpr = window.devicePixelRatio || 1;
			const rect = container.getBoundingClientRect();
			const displayWidth = rect.width > 0 ? rect.width : 320;
			const displayHeight = height;

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

			// Фоновая сетка
			ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
			ctx.lineWidth = 1;
			const gridYSteps = [0.25, 0.5, 0.75];
			for (const yStep of gridYSteps) {
				const y = displayHeight * yStep;
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(displayWidth, y);
				ctx.stroke();
			}

			if (activeAnalyser && isActive) {
				activeAnalyser.getByteFrequencyData(freqArray);
				activeAnalyser.getByteTimeDomainData(timeArray);

				// Вычисление RMS во временной области
				let sumSq = 0;
				let maxAbs = 0;
				for (let i = 0; i < timeArray.length; i++) {
					const norm = ((timeArray[i] ?? 128) - 128) / 128;
					sumSq += norm * norm;
					if (Math.abs(norm) > maxAbs) maxAbs = Math.abs(norm);
				}
				const currentRms = Math.sqrt(sumSq / timeArray.length);
				const currentDb = 20 * Math.log10(Math.max(currentRms, 1e-6));
				const clipping = maxAbs >= 0.98;

				if (currentDb > -42) {
					localSpeechPeak = Math.max(localSpeechPeak * 0.9 + currentDb * 0.1, currentDb);
				} else {
					localNoiseFloor = localNoiseFloor * 0.96 + currentDb * 0.04;
				}

				const now = Date.now();
				if (now - lastMetricsUpdate > 120) {
					lastMetricsUpdate = now;
					setRmsDb(Math.round(currentDb * 10) / 10);
					setNoiseFloorDb(Math.round(localNoiseFloor * 10) / 10);
					setSpeechPeakDb(Math.round(localSpeechPeak * 10) / 10);
					setIsClipping(clipping);
				}

				// Отрисовка частотного спектра полосами
				const barsCount = 48;
				const barWidth = (displayWidth - (barsCount - 1) * 2) / barsCount;

				for (let i = 0; i < barsCount; i++) {
					const freqIndex = Math.floor(
						Math.pow(i / barsCount, 1.4) * (bufferLength / 2),
					);
					const rawVal = freqArray[freqIndex] ?? 0;
					const normHeight = (rawVal / 255) * (displayHeight - 8);
					const barH = Math.max(3, normHeight);
					const x = i * (barWidth + 2);
					const y = displayHeight - barH;

					// Раскраска по клиническим зонам частот
					const relativeFreq = i / barsCount;
					let barColor = "#0d9488"; // Основная речь (бирюзовый)

					if (relativeFreq < 0.1) {
						// Зона компрессора (<150 Гц)
						barColor = "#f59e0b";
					} else if (relativeFreq >= 0.1 && relativeFreq < 0.55) {
						// Полоса речи врача
						barColor = isSpeaking ? "#10b981" : "#0d9488";
					} else if (relativeFreq >= 0.55 && relativeFreq < 0.82) {
						// Зона свиста бормашины (4.5–6.0 кГц)
						barColor = "#ef4444";
					} else {
						// Ультразвук (>7 кГц)
						barColor = "#8b5cf6";
					}

					ctx.fillStyle = barColor;
					ctx.beginPath();
					ctx.roundRect(x, y, Math.max(1, barWidth), barH, [2, 2, 0, 0]);
					ctx.fill();
				}
			} else {
				// Базовая линия покоя
				ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(0, displayHeight - 4);
				ctx.lineTo(displayWidth, displayHeight - 4);
				ctx.stroke();
			}

			ctx.restore();
			rafRef.current = requestAnimationFrame(render);
		};

		rafRef.current = requestAnimationFrame(render);

		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			if (canvas) {
				canvas.width = 0;
				canvas.height = 0;
			}
		};
	}, [analyserNode, isActive, isSpeaking, height]);

	const snr = Math.max(0, Math.round((speechPeakDb - noiseFloorDb) * 10) / 10);
	const snrClass =
		snr >= 22
			? "excellent"
			: snr >= 15
				? "good"
				: snr >= 8
					? "moderate"
					: "poor";

	return (
		<div ref={containerRef} className={`dente-spectrum-widget ${className}`}>
			<div className="dente-spectrum-header">
				<div className="dente-spectrum-title-area">
					<div
						className={`dente-spectrum-dot ${isActive ? "active" : ""} ${
							isSpeaking ? "speaking" : ""
						} ${isClipping ? "clipping" : ""}`}
					/>
					<span>{title}</span>
				</div>

				{showMetrics && (
					<div className="dente-spectrum-metrics">
						<div className="dente-metric-badge" title="Уровень сигнала">
							<span>RMS:</span>
							<span className="dente-metric-value">{rmsDb} dB</span>
						</div>
						<div className="dente-metric-badge" title="Фоновый шум кабинета">
							<span>Шум:</span>
							<span className="dente-metric-value">{noiseFloorDb} dB</span>
						</div>
						<div
							className="dente-metric-badge"
							title="Отношение сигнал/шум (SNR)"
						>
							<span>SNR:</span>
							<span className={`dente-metric-value ${snrClass}`}>
								+{snr} dB
							</span>
						</div>
					</div>
				)}
			</div>

			<div
				className="dente-spectrum-canvas-wrapper"
				style={{ height: `${height}px` }}
			>
				<canvas ref={canvasRef} className="dente-spectrum-canvas" />
			</div>

			{showLegend && (
				<div className="dente-spectrum-frequency-legend">
					<span className="dente-spectrum-legend-zone dente-zone-compressor">
						0–150Гц (Компрессор)
					</span>
					<span className="dente-spectrum-legend-zone dente-zone-voice">
						300–3.4кГц (Голос)
					</span>
					<span className="dente-spectrum-legend-zone dente-zone-turbine">
						4.5–6кГц (Бормашина)
					</span>
					<span className="dente-spectrum-legend-zone dente-zone-ultrasound">
						&gt;7кГц (Ультразвук)
					</span>
				</div>
			)}
		</div>
	);
}
