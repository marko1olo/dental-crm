import React, { useEffect, useRef } from "react";

interface AudioWaveformProps {
	isRecording: boolean;
	color?: string;
	mediaStream?: MediaStream | null;
}

export function AudioWaveform({
	isRecording,
	color = "var(--red-500)",
	mediaStream,
}: AudioWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !isRecording) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		let audioCtx: AudioContext | null = null;
		let analyser: AnalyserNode | null = null;
		let dataArray: Uint8Array | null = null;

		const initAudio = async () => {
			if (!mediaStream) {
				startFakeAnimation();
				return;
			}
			try {
				// @ts-ignore
				const AudioContextClass = window.AudioContext || window.webkitAudioContext;
				audioCtx = new AudioContextClass();
				const source = audioCtx.createMediaStreamSource(mediaStream);
				analyser = audioCtx.createAnalyser();
				analyser.fftSize = 64;
				source.connect(analyser);
				dataArray = new Uint8Array(analyser.frequencyBinCount);
				drawReal();
			} catch (e) {
				console.warn("Real waveform failed, fallback to fake", e);
				startFakeAnimation();
			}
		};

		const drawBars = (heights: number[]) => {
			const width = canvas.width;
			const height = canvas.height;

			ctx.clearRect(0, 0, width, height);

			const barWidth = 4;
			const barSpacing = 3;
			const barCount = Math.floor(width / (barWidth + barSpacing));

			ctx.fillStyle = color;

			for (let i = 0; i < barCount; i++) {
				const targetHeight = (heights[i % heights.length] || 0.1) * height;
				const x = i * (barWidth + barSpacing);
				const y = (height - targetHeight) / 2;

				ctx.beginPath();
				ctx.roundRect(x, y, barWidth, Math.max(2, targetHeight), 2);
				ctx.fill();
			}
		};

		const drawReal = () => {
			if (!analyser || !dataArray || !isRecording) return;
			analyser.getByteFrequencyData(dataArray as any);
			// normalize 0-255 to 0.1-0.9
			const heights = Array.from(dataArray).map((v) => 0.1 + (v / 255) * 0.8);
			drawBars(heights);
			animationFrameId = requestAnimationFrame(drawReal);
		};

		const startFakeAnimation = () => {
			const drawFake = () => {
				const heights = Array(15).fill(0).map(() => 0.2 + (Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 4294967295) * 0.6);
				drawBars(heights);
				setTimeout(() => {
					if (isRecording) {
						animationFrameId = requestAnimationFrame(drawFake);
					}
				}, 80);
			};
			drawFake();
		};

		initAudio();

		return () => {
			cancelAnimationFrame(animationFrameId);
			if (audioCtx?.state !== "closed") {
				audioCtx?.close().catch(() => {});
			}
			const width = canvas?.width || 0;
			const height = canvas?.height || 0;
			ctx?.clearRect(0, 0, width, height);
		};
	}, [isRecording, color, mediaStream]);

	if (!isRecording) return null;

	return (
		<canvas
			ref={canvasRef}
			width={120}
			height={40}
			style={{
				display: "block",
				margin: "0 auto",
				opacity: 0.8,
				flexShrink: 0,
				maxWidth: "100%",
				height: "auto",
			}}
		/>
	);
}
