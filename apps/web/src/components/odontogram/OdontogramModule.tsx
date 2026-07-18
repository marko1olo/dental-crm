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
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import { ToothChart, type ToothData, type ToothState } from "./ToothChart";
import { ToothHistoryChronicle } from "./ToothHistoryChronicle";
import { TreatmentEstimator } from "./TreatmentEstimator";
import { VoiceDictationOverlay } from "./VoiceDictationOverlay";
import "./odontogram.css";

const SurfaceSelector = ({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (newSelected: string[]) => void;
}) => {
	const toggle = (surface: string) => {
		if (selected.includes(surface)) {
			onChange(selected.filter((s) => s !== surface));
		} else {
			onChange([...selected, surface]);
		}
	};

	return (
		<div className="flex justify-center mb-4">
			<svg
				width="100"
				height="100"
				viewBox="0 0 100 100"
				className="drop-shadow-md cursor-pointer group"
			>
				{/* Top (B/V) */}
				<polygon
					points="0,0 100,0 70,30 30,30"
					fill={selected.includes("B") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("B")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="50"
					y="18"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					B
				</text>

				{/* Bottom (L/P) */}
				<polygon
					points="30,70 70,70 100,100 0,100"
					fill={selected.includes("L") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("L")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="50"
					y="90"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					L
				</text>

				{/* Left (M) */}
				<polygon
					points="0,0 30,30 30,70 0,100"
					fill={selected.includes("M") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("M")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="12"
					y="54"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					M
				</text>

				{/* Right (D) */}
				<polygon
					points="100,0 70,30 70,70 100,100"
					fill={selected.includes("D") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("D")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="88"
					y="54"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					D
				</text>

				{/* Center (O) */}
				<polygon
					points="30,30 70,30 70,70 30,70"
					fill={selected.includes("O") ? "#3b82f6" : "#27272a"}
					stroke="#3f3f46"
					strokeWidth="2"
					onClick={() => toggle("O")}
					className="hover:fill-blue-400 transition-colors duration-200"
				/>
				<text
					x="50"
					y="54"
					fill="white"
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					O
				</text>
			</svg>
		</div>
	);
};

export const OdontogramModule = ({
	patientId,
	pediatricMode,
}: {
	patientId: string;
	pediatricMode?: boolean | undefined;
}) => {
	const { odontogramUseSurfaces } = useAppLogicContext();
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
	const [activeSurfaces, setActiveSurfaces] = useState<string[]>([]);
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
					if (item) {
						item.state = state;
						if (activeSurfaces.length > 0) {
							item.surfaces = [...activeSurfaces];
						} else {
							delete item.surfaces;
						}
					}
				} else {
					const newItem: ToothData = { toothNumber: t, state };
					if (activeSurfaces.length > 0) {
						newItem.surfaces = [...activeSurfaces];
					}
					next.push(newItem);
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
			body: JSON.stringify({
				toothNumbers,
				state,
				surfaces: activeSurfaces.length > 0 ? activeSurfaces : undefined,
			}),
		});

		// Push suggestion to global state for ComparativePlannerDashboard
		const { addPendingPlanSuggestion } = usePatientStore.getState();
		for (const t of toothNumbers) {
			if (
				state === "Caries" ||
				state === "Pulpitis" ||
				state === "Planned_Implant" ||
				state === "Missing" ||
				state === "Crown"
			) {
				addPendingPlanSuggestion({
					toothNumber: t,
					state,
					surfaces: activeSurfaces.length > 0 ? [...activeSurfaces] : undefined,
					suggestedAt: new Date().toISOString(),
				});
			}
		}

		setActiveSurfaces([]);
	};

	const handleToothClick = (
		toothNumber: number,
		rect: DOMRect,
		surface?: string,
	) => {
		if (isMultiSelectMode) {
			// Toggle selection, don't open menu yet
			setSelectedTeeth((prev) =>
				prev.includes(toothNumber)
					? prev.filter((t) => t !== toothNumber)
					: [...prev, toothNumber],
			);
			setMenuConfig(null);
		} else {
			let activeSelection = selectedTeeth;
			let currentSurfaces = activeSurfaces;

			// If surfaces are disabled, ignore surface clicks entirely
			if (!odontogramUseSurfaces) {
				surface = undefined;
			}

			// If we clicked on an unselected tooth while having a selection, clear it
			if (!selectedTeeth.includes(toothNumber)) {
				activeSelection = [toothNumber];
				setSelectedTeeth(activeSelection);

				// Pre-select existing surfaces for the newly selected tooth
				const existing = teethData.find(
					(t) => t.toothNumber === activeSelection[0],
				);
				if (existing && existing.surfaces) {
					currentSurfaces = [...existing.surfaces];
				} else {
					currentSurfaces = [];
				}
			}

			// If a specific surface was clicked, toggle it
			if (surface && activeSelection.length === 1) {
				if (currentSurfaces.includes(surface)) {
					currentSurfaces = currentSurfaces.filter((s) => s !== surface);
				} else {
					currentSurfaces = [...currentSurfaces, surface];
				}
			}

			if (activeSelection.length !== 1) {
				currentSurfaces = [];
			}

			setActiveSurfaces(currentSurfaces);

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
		<div className="odontogram-module">
			<div
				className="odontogram-chart-area"
				ref={containerRef}
			>
				<div className="odontogram-toolbar">
					<label className="toolbar-checkbox">
						<input
							type="checkbox"
							checked={isPediatricMode}
							onChange={(e) => setIsPediatricMode(e.target.checked)}
						/>
						<span>Детский прикус</span>
					</label>
					<label
						className={`toolbar-checkbox ${isMultiSelectMode ? "active" : ""}`}
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
						<span>Групповой выбор (Shift)</span>
					</label>
				</div>
				<ToothChart
					teethData={teethData}
					pediatricMode={isPediatricMode}
					selectedTeeth={selectedTeeth}
					onToothClick={handleToothClick}
					useSurfaces={odontogramUseSurfaces}
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
								className="tooth-radial-menu"
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

								<div className="radial-menu-title">
									{selectedTeeth.length > 1
										? `Выбрано: ${selectedTeeth.length} зубов`
										: `Зуб ${menuConfig.toothNumber}`}
								</div>
								{selectedTeeth.length === 1 && (
									<div className="radial-menu-full-row">
										<SurfaceSelector
											selected={activeSurfaces}
											onChange={setActiveSurfaces}
										/>
									</div>
								)}
								<button
									onClick={() => updateToothState(selectedTeeth, "Caries")}
									className="tooth-menu-btn caries"
								>
									Кариес
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Pulpitis")}
									className="tooth-menu-btn pulpitis"
								>
									Пульпит
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Missing")}
									className="tooth-menu-btn missing"
								>
									Отсутствует
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Crown")}
									className="tooth-menu-btn crown"
								>
									Коронка
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Implant")}
									className="tooth-menu-btn implant"
								>
									Имплантат
								</button>
								<button
									onClick={() => updateToothState(selectedTeeth, "Healthy")}
									className="tooth-menu-btn filled"
								>
									Здоров
								</button>
								<button
									onClick={() => {
										setHistoryTooth(menuConfig.toothNumber);
										setMenuConfig(null);
									}}
									className="tooth-menu-btn radial-menu-full-row"
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

			<div className="odontogram-treatment-area">
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
								showToast(`AI: Зуб ${code} обновлен (${state})`, "success");
							} else if (
								data &&
								data.toothUpdates &&
								Array.isArray(data.toothUpdates)
							) {
								data.toothUpdates.forEach((tu: any) => {
									updateToothState([parseInt(tu.code)], tu.state);
								});
								showToast(
									`AI: Зубы обновлены: ${data.toothUpdates.map((t: any) => t.code).join(", ")}`,
									"success",
								);
							} else {
								showToast("AI: Команда не распознана", "warning");
							}
						} else {
							showToast("Ошибка при обращении к серверу ИИ", "error");
						}
					} catch (e) {
						console.error("Dictation parse failed", e);
						showToast("Не удалось обработать голосовую команду", "error");
					}
				}}
			/>
		</div>
	);
};
