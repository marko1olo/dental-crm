import type React from "react";
import { useEffect, useRef, useState } from "react";
import { DictationHints } from "../DictationHints";
import { VoiceAssistantTutorial } from "./VoiceAssistantTutorial";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

interface VoiceAssistantUIProps {
	onNavigate?: (view: any) => void;
	onSearchQuery?: (query: string) => void;
	onDateChange?: (date: string) => void;
}

export function VoiceAssistantUI({
	onNavigate,
	onSearchQuery,
	onDateChange,
}: VoiceAssistantUIProps) {
	const {
		isListening,
		transcript,
		volume,
		startListening,
		stopListening,
		lastAction,
	} = useVoiceAssistant("general", {
		onNavigate,
		onSearchQuery,
		onDateChange,
	});

	const [showTutorial, setShowTutorial] = useState(false);
	const [activeTab, setActiveTab] = useState<"nav" | "search" | "visit">("nav");
	const [visibleAction, setVisibleAction] = useState<any>(null);

	// Interaction mode refs
	const clickTimeRef = useRef<number>(0);
	const isHoldingRef = useRef<boolean>(false);
	const isToggleModeRef = useRef<boolean>(false);

	// Calculate a glow intensity based on volume (0 to 255)
	const glowIntensity = Math.min(100, Math.max(20, (volume / 255) * 100));

	// Determine hint type based on route
	let hintType: "schedule" | "patient" | "visit" | "prices" | "payment" =
		"schedule";
	if (typeof window !== "undefined") {
		const hash = window.location.hash;
		if (hash.includes("visit") || hash.includes("imaging")) hintType = "visit";
		else if (hash.includes("patients")) hintType = "patient";
		else if (hash.includes("finance")) hintType = "payment";
		else if (hash.includes("settings")) hintType = "prices";
	}

	// Handle action chip auto-dismissal
	useEffect(() => {
		if (lastAction) {
			setVisibleAction(lastAction);
			const timer = setTimeout(() => {
				setVisibleAction(null);
			}, 4000);
			return () => clearTimeout(timer);
		}
	}, [lastAction]);

	// Click-to-Toggle and Push-to-Talk Handlers
	const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		if (isListening) {
			if (isToggleModeRef.current) {
				stopListening();
				isToggleModeRef.current = false;
			}
			return;
		}

		clickTimeRef.current = Date.now();
		isHoldingRef.current = true;
		isToggleModeRef.current = false;
		startListening();
	};

	const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		if (!isListening) return;

		isHoldingRef.current = false;
		const duration = Date.now() - clickTimeRef.current;
		if (duration < 300) {
			// Quick tap/click: enter toggle mode (keep listening)
			isToggleModeRef.current = true;
		} else {
			// Long press release: stop listening
			stopListening();
			isToggleModeRef.current = false;
		}
	};

	const handleLeave = () => {
		if (isListening && !isToggleModeRef.current && isHoldingRef.current) {
			stopListening();
			isHoldingRef.current = false;
		}
	};

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none gap-3 select-none">
			{showTutorial && <VoiceAssistantTutorial onClose={() => setShowTutorial(false)} />}

			{/* Visualizer and Transcript Bubble */}
			{isListening && (
				<div className="flex items-end gap-4 mb-2">
					<div className="hidden md:block transition-all animate-fade-in-up">
						<DictationHints isVisible={true} type={hintType} />
					</div>
					<div className="bg-neutral-905/90 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl shadow-2xl max-w-sm pointer-events-auto transition-all animate-fade-in-up">
						<div className="flex items-center gap-3 mb-2">
							<div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
							<span className="text-xs font-bold text-neutral-400 tracking-wider uppercase">
								Ассистент слушает...
							</span>
							{isToggleModeRef.current && (
								<span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full ml-auto">
									Режим фиксации
								</span>
							)}
						</div>

						<div className="text-white text-sm leading-relaxed mb-3 min-h-[40px]">
							{transcript || "Говорите..."}
						</div>

						{/* Advanced Canvas/CSS Audio Waveform simulation */}
						<div className="flex items-center justify-center gap-[2px] h-10 w-full overflow-hidden bg-black/20 rounded-lg p-2">
							{[...Array(24)].map((_, i) => {
								const h = Math.max(
									15,
									(Number(crypto.getRandomValues(new Uint32Array(1))[0]) /
										4294967295) *
										glowIntensity,
								);
								return (
									<div
										key={i}
										className="w-1.5 bg-indigo-400 rounded-full transition-all duration-75"
										style={{
											height: `${h}%`,
											opacity: 0.5 + h / 200,
											boxShadow: `0 0 ${h / 10}px rgba(99, 102, 241, 0.6)`,
										}}
									></div>
								);
							})}
						</div>

						{/* Fallback Warning / Draft Mode info */}
						{transcript &&
							transcript.length > 10 &&
							!transcript.includes("46") && (
								<div className="mt-3 text-[10px] text-amber-400/80 bg-amber-400/10 p-2 rounded border border-amber-400/20">
									Черновик: Низкая уверенность распознавания. Подтвердите данные
									вручную.
								</div>
							)}
					</div>
				</div>
			)}

			{/* Main Microphone Button */}
			<button
				onMouseDown={handleStart}
				onMouseUp={handleEnd}
				onMouseLeave={handleLeave}
				onTouchStart={handleStart}
				onTouchEnd={handleEnd}
				onClick={(e) => {
					e.preventDefault();
				}}
				className={`group relative flex items-center justify-center pointer-events-auto transition-all outline-none touch-manipulation ${
					isListening
						? "w-20 h-20 bg-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.4)] border-red-500/50 scale-110"
						: "w-16 h-16 bg-indigo-600/20 shadow-[0_0_20px_rgba(79,70,229,0.3)] border-indigo-500/30 hover:bg-indigo-600/30 hover:scale-105"
				} rounded-full backdrop-blur-md border border-t-white/10 overflow-hidden`}
			>
				<div
					className={`absolute inset-0 rounded-full ${isListening ? "animate-ping bg-red-500/20" : ""}`}
				></div>
				<div
					className={`relative z-10 text-white flex items-center justify-center w-full h-full rounded-full transition-colors ${
						isListening ? "text-red-400" : "text-indigo-300"
					}`}
				>
					<svg
						className="w-8 h-8"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
						></path>
					</svg>
				</div>
			</button>

			{/* Action Chip (if action was detected) */}
			{visibleAction && !isListening && (
				<div className="mb-2 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/50 p-3 rounded-xl shadow-lg pointer-events-auto animate-fade-in-up flex items-center gap-3 max-w-xs">
					<svg
						className="w-5 h-5 text-indigo-400 shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<div>
						<div className="text-xs font-bold text-indigo-400">
							Команда выполнена
						</div>
						<div className="text-[11px] text-indigo-200">
							{visibleAction.payload?.nav?.feedbackText ||
								visibleAction.payload?.text ||
								"Команда обработана"}
						</div>
					</div>
				</div>
			)}

			{/* Controls: Info + Mic Buttons */}
			<div className="flex items-center gap-3 pointer-events-auto">
				{/* Helper Toggle Button */}
				<button
					onClick={() => setShowTutorial((prev) => !prev)}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border ${
						showTutorial
							? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]"
							: "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white"
					}`}
					title="Справка по голосовым командам"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</button>

				{/* Push-to-Talk / Toggle Mic Button */}
				<button
					onMouseDown={handleStart}
					onMouseUp={handleEnd}
					onMouseLeave={handleLeave}
					onTouchStart={handleStart}
					onTouchEnd={handleEnd}
					className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
						isListening
							? "bg-indigo-600 scale-105 shadow-[0_0_30px_rgba(79,70,229,0.8)]"
							: "bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 shadow-xl"
					}`}
					style={{
						boxShadow: isListening
							? `0 0 ${glowIntensity}px rgba(79, 70, 229, ${glowIntensity / 100})`
							: undefined,
					}}
					title={
						isListening
							? "Нажмите для завершения"
							: "Удерживайте для записи (или нажмите один раз)"
					}
				>
					<svg
						className={`w-6 h-6 ${isListening ? "text-white" : "text-neutral-400"}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
						></path>
					</svg>
				</button>
			</div>
		</div>
	);
}
