import {
	AlertTriangle,
	Check,
	History,
	Mic,
	Stethoscope,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useWebsocket } from "../../hooks/useWebsocket";
import { ToothChart, type ToothData, type ToothState } from "./ToothChart";
import { ToothHistoryChronicle } from "./ToothHistoryChronicle";
import { TreatmentEstimator } from "./TreatmentEstimator";
import { VoiceDictationOverlay } from "./VoiceDictationOverlay";
import "./odontogram.css";

export const OdontogramModule = ({
	patientId,
	pediatricMode,
}: {
	patientId: string;
	pediatricMode?: boolean | undefined;
}) => {
	const [teethData, setTeethData] = useState<ToothData[]>([]);
	const [menuConfig, setMenuConfig] = useState<{
		toothNumber: number;
		x: number;
		y: number;
		position: "top" | "bottom";
		caretOffset: number;
	} | null>(null);
	const [historyTooth, setHistoryTooth] = useState<number | null>(null);

	// New States for Pediatric & Multi-Select
	const [isPediatricMode, setIsPediatricMode] = useState(
		pediatricMode || false,
	);
	const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [isVoiceOpen, setIsVoiceOpen] = useState(false);

	const containerRef = React.useRef<HTMLDivElement>(null);

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);
	useEffect(() => {
		if (
			lastMessage?.type === "UPDATE_ODONTOGRAM" &&
			lastMessage.payload.patientId === patientId
		) {
			setTeethData(lastMessage.payload.states);
		}
	}, [lastMessage, patientId]);

	useEffect(() => {
		setIsPediatricMode(pediatricMode || false);
	}, [pediatricMode]);

	// Load states from API
	useEffect(() => {
		fetch(`/api/patients/${patientId}/tooth-states`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data?.success && data.states) {
					setTeethData(data.states);
				}
			});

		// Listen to CT Events for auto-implants
		const handleClinicalCollision = (e: any) => {
			// Just an example sync point: If an implant is placed on 36
			if (e.detail?.toothNumber) {
				updateToothState([e.detail.toothNumber], "Planned_Implant");
			}
		};
		window.addEventListener("clinical-implant-placed", handleClinicalCollision);

		const handleWsUpdate = (e: any) => {
			if (e.detail?.patientId === patientId && e.detail?.states) {
				setTeethData(e.detail.states);
			}
		};
		window.addEventListener("dente-odontogram-update", handleWsUpdate);

		const handleFinding = (e: any) => {
			if (e.detail?.toothNumber && e.detail?.finding) {
				updateToothState([e.detail.toothNumber], e.detail.finding);
			}
		};
		window.addEventListener("clinical-finding-detected", handleFinding);

		// Shift key for multi-select
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Shift") setIsMultiSelectMode(true);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Shift") setIsMultiSelectMode(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener(
				"clinical-implant-placed",
				handleClinicalCollision,
			);
			window.removeEventListener("dente-odontogram-update", handleWsUpdate);
			window.removeEventListener("clinical-finding-detected", handleFinding);
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [patientId]);

	const updateToothState = async (
		toothNumbers: number[],
		state: ToothState,
	) => {
		setTeethData((prev) => {
			const next = [...prev];
			for (const t of toothNumbers) {
				const existingIdx = next.findIndex((x) => x.toothNumber === t);
				if (existingIdx > -1) {
					const item = next[existingIdx];
					if (item) item.state = state;
				} else {
					next.push({ toothNumber: t, state });
				}
			}
			return next;
		});

		setMenuConfig(null);
		setSelectedTeeth([]);

		// Save to API
		await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ toothNumbers, state }),
		});
	};

	const handleToothClick = (toothNumber: number, rect: DOMRect) => {
		if (isMultiSelectMode) {
			// Toggle selection, don't open menu yet
			setSelectedTeeth((prev) =>
				prev.includes(toothNumber)
					? prev.filter((t) => t !== toothNumber)
					: [...prev, toothNumber],
			);
			setMenuConfig(null);
		} else {
			// If we clicked on an unselected tooth while having a selection, clear it
			let activeSelection = selectedTeeth;
			if (!selectedTeeth.includes(toothNumber)) {
				activeSelection = [toothNumber];
				setSelectedTeeth(activeSelection);
			}

			const isUpperJaw =
				toothNumber < 30 || (toothNumber >= 51 && toothNumber <= 65);
			const menuW = 254;
			const menuH = 224;
			const gap = 12;
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			let x = rect.left + rect.width / 2 - menuW / 2;
			let y = isUpperJaw ? rect.bottom + 10 : rect.top - menuH - 10;

			const clampedX = Math.max(8, Math.min(x, vw - menuW - 8));
			let caretOffset = 50;
			if (clampedX !== x) {
				const toothCenter = rect.left + rect.width / 2;
				caretOffset = ((toothCenter - clampedX) / menuW) * 100;
			}
			x = clampedX;
			if (isUpperJaw) {
				y = rect.bottom + gap + 10;
			} else {
				y = rect.top - menuH - gap - 10;
			}
			y = Math.max(8, Math.min(y, vh - menuH - 8));

			// Show menu for the group, anchored to the clicked tooth
			setMenuConfig({
				toothNumber,
				x,
				y,
				position: isUpperJaw ? "bottom" : "top",
				caretOffset,
			});
		}
	};

	return (
		<div className="flex flex-col lg:flex-row items-start gap-6 w-full h-full p-6 bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl text-slate-900 dark:text-zinc-100">
			<div
				className="flex-2 min-w-0 flex flex-col gap-6 relative w-full"
				ref={containerRef}
			>
				<div className="flex gap-4 p-4 items-center bg-zinc-100/30 dark:bg-zinc-900/30 border-b border-zinc-200/50 dark:border-zinc-800/50 rounded-t-xl">
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={isPediatricMode}
							onChange={(e) => setIsPediatricMode(e.target.checked)}
							className="accent-indigo-500"
						/>
						<span className="text-sm font-medium">Детский прикус</span>
					</label>
					<label
						className={`flex items-center gap-2 cursor-pointer select-none ${isMultiSelectMode ? "text-indigo-600 dark:text-indigo-400" : ""}`}
					>
						<input
							type="checkbox"
							checked={isMultiSelectMode}
							onChange={(e) => {
								setIsMultiSelectMode(e.target.checked);
								if (!e.target.checked && selectedTeeth.length === 0)
									setMenuConfig(null);
							}}
							className="accent-indigo-500"
						/>
						<span className="text-sm font-medium">Групповой выбор (Shift)</span>
					</label>
				</div>
				<ToothChart
					teethData={teethData}
					pediatricMode={isPediatricMode}
					selectedTeeth={selectedTeeth}
					onToothClick={handleToothClick}
				/>

				{/* Radial Menu via Portal — avoids backdrop-filter stack */}
				{menuConfig &&
					createPortal(
						<>
							{/* Backdrop */}
							<div
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									zIndex: 9998,
								}}
								onClick={() => setMenuConfig(null)}
							/>
							<div
								className={`absolute grid grid-cols-2 gap-2 p-3 w-[254px] bg-zinc-950/40 backdrop-blur-md border border-zinc-800/50 shadow-2xl rounded-2xl`}
								style={
									{
										left: menuConfig.x,
										top: menuConfig.y,
										zIndex: 9999,
									} as React.CSSProperties
								}
								onClick={(e) => e.stopPropagation()}
							>
								{/* SVG Caret (Tail) */}
								{menuConfig.position === "bottom" ? (
									<svg
										className="absolute -top-3 text-zinc-800/50 drop-shadow-md"
										style={{
											left: `${menuConfig.caretOffset}%`,
											transform: "translateX(-50%)",
										}}
										width="24"
										height="12"
										viewBox="0 0 24 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 0L24 12H0L12 0Z"
											fill="currentColor"
											fillOpacity="0.8"
										/>
									</svg>
								) : (
									<svg
										className="absolute -bottom-3 text-zinc-800/50 drop-shadow-md"
										style={{
											left: `${menuConfig.caretOffset}%`,
											transform: "translateX(-50%)",
										}}
										width="24"
										height="12"
										viewBox="0 0 24 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 12L24 0H0L12 12Z"
											fill="currentColor"
											fillOpacity="0.8"
										/>
									</svg>
								)}

								<div className="col-span-2 text-center mb-2 text-sm font-bold text-zinc-100">
									{selectedTeeth.length > 1
										? `Выбрано: ${selectedTeeth.length} зубов`
										: `Зуб ${menuConfig.toothNumber}`}
								</div>
								<button
									onClick={() => updateToothState(selectedTeeth, "Caries")}
									className="flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
								>
									Кариес
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Pulpitis")}
									className="flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
								>
									Пульпит
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Missing")}
									className="flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-zinc-800/40 text-zinc-400 border-zinc-700/30 hover:bg-zinc-800/60"
								>
									Отсутствует
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Crown")}
									className="flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
								>
									Коронка
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Implant")}
									className="flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"
								>
									Имплантат
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Healthy")}
									className="flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
								>
									Здоров
								</button>
								<button
									onClick={() => {
										setHistoryTooth(menuConfig.toothNumber);
										setMenuConfig(null);
									}}
									className="col-span-2 flex items-center justify-center p-3 rounded-xl border transition-all duration-200 font-medium tracking-wide text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
								>
									<History className="w-4 h-4 inline mr-2" /> История зуба
								</button>
							</div>
						</>,
						document.body,
					)}

				{historyTooth !== null && (
					<ToothHistoryChronicle
						patientId={patientId}
						toothNumber={historyTooth}
						onClose={() => setHistoryTooth(null)}
					/>
				)}
			</div>

			<div className="flex-1 min-w-[320px] max-w-[480px] flex flex-col w-full relative">
				<TreatmentEstimator patientId={patientId} currentTeeth={teethData} />

				{/* Floating Voice Dictation Button */}
				<button
					onClick={() => setIsVoiceOpen(true)}
					style={{
						position: "absolute",
						bottom: 24,
						right: 24,
						width: 72,
						height: 72,
						borderRadius: 36,
						background: "var(--primary-color, rgba(160, 130, 255, 0.2))",
						backdropFilter: "blur(12px)",
						border: "2px solid var(--primary-color, #a082ff)",
						boxShadow:
							"0 8px 32px var(--primary-color, rgba(160, 130, 255, 0.4))",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						zIndex: 100,
						transition: "all 0.3s",
					}}
					className="hover:scale-110 active:scale-95"
				>
					<Mic size={32} color="var(--primary-color, #a082ff)" />
				</button>
			</div>

			<VoiceDictationOverlay
				isOpen={isVoiceOpen}
				onClose={() => setIsVoiceOpen(false)}
				onDictationSubmit={async (text) => {
					setIsVoiceOpen(false);
					try {
						const res = await fetch("/api/ai/parse-dictation", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ text, type: "visit" }),
						});
						if (res.ok) {
							const data = await res.json();
							if (data && data.action === "update_tooth" && data.payload) {
								const { code, state } = data.payload;
								updateToothState([parseInt(code)], state || "caries");
								alert(`AI: Зуб ${code} обновлен (${state})`);
							} else if (
								data &&
								data.toothUpdates &&
								Array.isArray(data.toothUpdates)
							) {
								data.toothUpdates.forEach((tu: any) => {
									updateToothState([parseInt(tu.code)], tu.state);
								});
								alert(
									`AI: Зубы обновлены: ${data.toothUpdates.map((t: any) => t.code).join(", ")}`,
								);
							} else {

							}
						}
					} catch (e) {
						console.error("Dictation parse failed", e);
					}
				}}
			/>
		</div>
	);
};
