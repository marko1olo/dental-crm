import {
	Activity,
	AlertTriangle,
	Camera,
	FileText,
	Loader2,
	Plus,
	Receipt,
	ShieldAlert,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	type ImplantPlatformInfo,
	type ImplantSystemSpec,
} from "./implantCatalog";
import {
	type ImplantData,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
} from "./cornerstoneTypes";
import type { CtPlanningMarkup } from "./ctPlanningPersistence";

export interface CornerstonePlanningQuadrantProps {
	hasAnyNerveCollision: boolean;
	restoredMarkup: CtPlanningMarkup | null;
	activePlatform: ImplantPlatformInfo;
	activeSystemSpec: ImplantSystemSpec;
	selectedSystemId: string;
	handleSelectSystem: (id: string) => void;
	selectedDiameter: number;
	handleSelectDiameter: (d: number) => void;
	availableLengthsForDiameter: number[];
	selectedLength: number;
	setSelectedLength: (l: number) => void;
	selectedFdiCode: string;
	setSelectedFdiCode: (fdi: string) => void;
	placeImplantModel: () => void;
	implants: ImplantData[];
	focusOnImplant: (imp: ImplantData) => void;
	removeImplant: (id: string) => void;
	latestImplant: ImplantData | null;
	handleExportSnapshotTo043: () => void;
	isExportingSnapshot: boolean;
	aiProtocolLog: string | null;
	handleAddCbctToFinance?: (() => void) | undefined;
}

export const CornerstonePlanningQuadrant: React.FC<CornerstonePlanningQuadrantProps> = ({
	hasAnyNerveCollision,
	restoredMarkup,
	activePlatform,
	activeSystemSpec,
	selectedSystemId,
	handleSelectSystem,
	selectedDiameter,
	handleSelectDiameter,
	availableLengthsForDiameter,
	selectedLength,
	setSelectedLength,
	selectedFdiCode,
	setSelectedFdiCode,
	placeImplantModel,
	implants,
	focusOnImplant,
	removeImplant,
	latestImplant,
	handleExportSnapshotTo043,
	isExportingSnapshot,
	aiProtocolLog,
	handleAddCbctToFinance,
}) => {
	return (
		<>
			{/* QUADRANT HEADER */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "8px",
					borderBottom: "1px solid var(--line-strong, rgba(255,255,255,0.12))",
					paddingBottom: "8px",
					flexShrink: 0,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<Activity className="w-4 h-4 text-cyan-400 shrink-0" />
					<span
						style={{
							color: "var(--ink, #fff)",
							fontSize: "12px",
							fontWeight: 700,
							letterSpacing: "0.02em",
						}}
					>
						Хирургический протокол (Форма 043/у)
					</span>
				</div>

				{hasAnyNerveCollision ? (
					<span
						style={{
							backgroundColor: "rgba(239,68,68,0.2)",
							border: "1px solid #ef4444",
							color: "var(--rose-300, #fca5a5)",
							padding: "2px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: "bold",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
						Коллизия &lt; 2.0 мм
					</span>
				) : (restoredMarkup?.nervePoints?.length ?? 0) >= 2 ? (
					<span
						style={{
							backgroundColor: "rgba(16,185,129,0.2)",
							border: "1px solid #10b981",
							color: "var(--emerald-300, #6ee7b7)",
							padding: "2px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: "bold",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
						Коридор ≥ 2.0 мм
					</span>
				) : (
					<span
						style={{
							backgroundColor: "rgba(245,158,11,0.15)",
							border: "1px solid rgba(245,158,11,0.4)",
							color: "var(--amber-300, #fcd34d)",
							padding: "2px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						Нерв не размечен
					</span>
				)}
			</div>

			{/* SECTION 1: IMPLANT SYSTEM & SIZING SELECTOR */}
			<div
				style={{
					backgroundColor: "rgba(255,255,255,0.03)",
					border: "1px solid var(--line-strong, rgba(255,255,255,0.1))",
					borderRadius: "10px",
					padding: "10px",
					display: "flex",
					flexDirection: "column",
					gap: "8px",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							color: "var(--muted, #a1a1aa)",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						Каталог имплантатов
					</span>

					{/* Platform Badge with canonical color dot */}
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "5px",
							backgroundColor: "rgba(0,0,0,0.4)",
							padding: "2px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							border: "1px solid rgba(255,255,255,0.08)",
						}}
					>
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								backgroundColor: activePlatform.hexColor,
								boxShadow: `0 0 6px ${activePlatform.hexColor}`,
							}}
						/>
						<span style={{ fontWeight: 600, color: "var(--ink, #fff)" }}>
							{activePlatform.code}
						</span>
						<span style={{ color: "var(--muted, #a1a1aa)", fontSize: "10px" }}>
							({activePlatform.labelRu})
						</span>
					</div>
				</div>

				{/* System Selector Tabs */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						overflowX: "auto",
						paddingBottom: "2px",
					}}
				>
					{CANONICAL_IMPLANT_SYSTEMS.slice(0, 5).map((sys) => (
						<button
							key={sys.id}
							type="button"
							onClick={() => handleSelectSystem(sys.id)}
							style={{
								height: "26px",
								padding: "0 8px",
								borderRadius: "5px",
								fontSize: "11px",
								fontWeight: selectedSystemId === sys.id ? 700 : 500,
								cursor: "pointer",
								border:
									selectedSystemId === sys.id
										? "1px solid var(--brand-primary, #2563eb)"
										: "1px solid rgba(255,255,255,0.1)",
								backgroundColor:
									selectedSystemId === sys.id
										? "var(--brand-primary, #2563eb)"
										: "transparent",
								color: selectedSystemId === sys.id ? "#fff" : "var(--muted, #a1a1aa)",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
							}}
						>
							{sys.brand}
						</button>
					))}
				</div>

				{/* Sub-line Info */}
				<div
					style={{
						fontSize: "11px",
						color: "var(--ink-muted, #d4d4d8)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<span>
						<strong style={{ color: "var(--ink, #fff)" }}>{activeSystemSpec.brand}</strong>{" "}
						{activeSystemSpec.line} ({activeSystemSpec.country})
					</span>
					<span style={{ fontSize: "10px", color: "var(--muted, #71717a)" }}>
						Втулка: Ø{activeSystemSpec.sleeveDiameterMm}мм
					</span>
				</div>

				{/* Diameters & Lengths Row */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "8px",
					}}
				>
					{/* Diameters */}
					<div>
						<div
							style={{
								fontSize: "10px",
								color: "var(--muted, #a1a1aa)",
								marginBottom: "4px",
								fontWeight: 600,
							}}
						>
							ДИАМЕТР (Ø ММ)
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
							{activeSystemSpec.diameters.map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => handleSelectDiameter(d)}
									style={{
										height: "24px",
										padding: "0 6px",
										borderRadius: "4px",
										fontSize: "11px",
										fontWeight: Math.abs(selectedDiameter - d) < 0.05 ? 700 : 500,
										cursor: "pointer",
										border:
											Math.abs(selectedDiameter - d) < 0.05
												? "1px solid var(--brand-primary, #2563eb)"
												: "1px solid rgba(255,255,255,0.12)",
										backgroundColor:
											Math.abs(selectedDiameter - d) < 0.05
												? "rgba(37,99,235,0.3)"
												: "transparent",
										color:
											Math.abs(selectedDiameter - d) < 0.05
												? "var(--brand-primary, #60a5fa)"
												: "var(--ink, #d4d4d8)",
									}}
								>
									{d.toFixed(1)}
								</button>
							))}
						</div>
					</div>

					{/* Lengths */}
					<div>
						<div
							style={{
								fontSize: "10px",
								color: "var(--muted, #a1a1aa)",
								marginBottom: "4px",
								fontWeight: 600,
							}}
						>
							ДЛИНА (L ММ)
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
							{availableLengthsForDiameter.map((l) => (
								<button
									key={l}
									type="button"
									onClick={() => setSelectedLength(l)}
									style={{
										height: "24px",
										padding: "0 6px",
										borderRadius: "4px",
										fontSize: "11px",
										fontWeight: Math.abs(selectedLength - l) < 0.05 ? 700 : 500,
										cursor: "pointer",
										border:
											Math.abs(selectedLength - l) < 0.05
												? "1px solid var(--emerald-500, #10b981)"
												: "1px solid rgba(255,255,255,0.12)",
										backgroundColor:
											Math.abs(selectedLength - l) < 0.05
												? "rgba(16,185,129,0.25)"
												: "transparent",
										color:
											Math.abs(selectedLength - l) < 0.05
												? "var(--emerald-300, #6ee7b7)"
												: "var(--ink, #d4d4d8)",
									}}
								>
									{l.toFixed(1)}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Tooth FDI and Placement Button */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "8px",
						paddingTop: "4px",
						borderTop: "1px solid rgba(255,255,255,0.06)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<span style={{ fontSize: "11px", color: "var(--muted, #a1a1aa)" }}>Зуб:</span>
						<input
							type="text"
							value={selectedFdiCode}
							onChange={(e) => setSelectedFdiCode(e.target.value.trim())}
							style={{
								width: "42px",
								height: "26px",
								textAlign: "center",
								backgroundColor: "rgba(0,0,0,0.5)",
								border: "1px solid rgba(255,255,255,0.2)",
								borderRadius: "4px",
								color: "#fff",
								fontSize: "12px",
								fontWeight: 600,
							}}
							title="FDI номер зуба (11–48)"
						/>
						<div style={{ display: "flex", gap: "2px" }}>
							{["36", "46", "16", "26"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setSelectedFdiCode(t)}
									style={{
										height: "22px",
										padding: "0 4px",
										fontSize: "10px",
										borderRadius: "3px",
										border: "none",
										backgroundColor: selectedFdiCode === t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
										color: "var(--muted, #a1a1aa)",
										cursor: "pointer",
									}}
								>
									#{t}
								</button>
							))}
						</div>
					</div>

					<button
						type="button"
						onClick={placeImplantModel}
						style={{
							height: "28px",
							padding: "0 10px",
							borderRadius: "6px",
							backgroundColor: "var(--brand-primary, #2563eb)",
							color: "var(--ink, #fff)",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							border: "none",
							display: "inline-flex",
							alignItems: "center",
							gap: "5px",
							whiteSpace: "nowrap",
							transition: "all 0.15s",
						}}
						title="Разместить имплантат выбранного размера в фокусе среза"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>+ В срез</span>
					</button>
				</div>
			</div>

			{/* SECTION 2: PLACED IMPLANTS LIST */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						fontSize: "11px",
						fontWeight: 600,
						color: "var(--muted, #a1a1aa)",
						textTransform: "uppercase",
						letterSpacing: "0.05em",
					}}
				>
					<span>Установленные имплантаты ({implants.length})</span>
				</div>

				{implants.length === 0 && (
					<div
						style={{
							padding: "14px",
							textAlign: "center",
							color: "var(--muted, #71717a)",
							fontSize: "12px",
							lineHeight: 1.4,
							backgroundColor: "rgba(255,255,255,0.02)",
							borderRadius: "8px",
							border: "1px dashed rgba(255,255,255,0.1)",
						}}
					>
						<FileText className="w-5 h-5 mx-auto mb-1.5 text-neutral-500" />
						Исследование без виртуальных имплантатов. Нажмите «+ В срез» для размещения модели по координатам фокуса.
					</div>
				)}

				{implants.map((imp) => {
					const isImpDanger =
						imp.distanceToNerve != null &&
						imp.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM;

					return (
						<div
							key={imp.id}
							style={{
								padding: "8px 10px",
								borderRadius: "8px",
								backgroundColor: isImpDanger
									? "rgba(239,68,68,0.12)"
									: "rgba(255,255,255,0.04)",
								border: `1px solid ${isImpDanger ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
								display: "flex",
								flexDirection: "column",
								gap: "6px",
							}}
						>
							{/* Top Info Line */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "6px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
									<span
										style={{
											backgroundColor: "rgba(255,255,255,0.12)",
											color: "#fff",
											padding: "1px 6px",
											borderRadius: "4px",
											fontWeight: "bold",
											fontSize: "11px",
										}}
									>
										#{imp.fdiCode}
									</span>
									<span
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--ink, #fff)",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{imp.brandName ?? "Имплантат"} {imp.lineName ?? ""}
									</span>
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "3px",
											fontSize: "10px",
											color: "var(--muted, #a1a1aa)",
										}}
									>
										<span
											style={{
												width: "6px",
												height: "6px",
												borderRadius: "50%",
												backgroundColor: imp.platformColor ?? "#16a34a",
											}}
										/>
										{imp.platformCode ?? `Ø${imp.diameter.toFixed(1)}`}
									</span>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
									<button
										type="button"
										onClick={() => focusOnImplant(imp)}
										style={{
											height: "22px",
											padding: "0 6px",
											borderRadius: "4px",
											border: "none",
											backgroundColor: "rgba(255,255,255,0.08)",
											color: "var(--cyan-400, #22d3ee)",
											fontSize: "10px",
											fontWeight: 500,
											cursor: "pointer",
										}}
										title="Навести перекрестье срезов на этот имплантат"
									>
										Фокус
									</button>
									<button
										type="button"
										onClick={() => removeImplant(imp.id)}
										style={{
											height: "22px",
											width: "22px",
											padding: 0,
											borderRadius: "4px",
											border: "none",
											backgroundColor: "rgba(239,68,68,0.15)",
											color: "var(--rose-300, #fca5a5)",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										title="Удалить имплантат"
										aria-label="Удалить имплантат"
									>
										<Trash2 className="w-3 h-3" />
									</button>
								</div>
							</div>

							{/* Bottom Telemetry Line */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									fontSize: "11px",
									gap: "6px",
								}}
							>
								<span style={{ color: "var(--ink-muted, #d4d4d8)" }}>
									Ø{imp.diameter.toFixed(1)} × {imp.length.toFixed(1)} мм |{" "}
									<span style={{ fontWeight: 600, color: "var(--cyan-400, #22d3ee)" }}>
										{imp.boneDensity.classification} ({Math.round(imp.boneDensity.averageHU)} HU)
									</span>
								</span>

								{/* Clearance Badge */}
								{imp.distanceToNerve != null ? (
									<span
										style={{
											fontSize: "10px",
											fontWeight: "bold",
											padding: "1px 6px",
											borderRadius: "4px",
											backgroundColor: isImpDanger
												? "rgba(239,68,68,0.25)"
												: "rgba(16,185,129,0.2)",
											color: isImpDanger ? "#fca5a5" : "#6ee7b7",
											border: `1px solid ${isImpDanger ? "#ef4444" : "rgba(16,185,129,0.4)"}`,
											display: "inline-flex",
											alignItems: "center",
											gap: "3px",
										}}
									>
										{isImpDanger && <AlertTriangle className="w-3 h-3 animate-pulse text-red-400" />}
										Нерв: {imp.distanceToNerve.toFixed(1)} мм
									</span>
								) : (
									<span style={{ fontSize: "10px", color: "var(--amber-400, #fbbf24)" }}>
										Нерв не размечен
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* SECTION 3: PROTOCOL & DRILLING RECOMMENDATIONS */}
			{latestImplant && (
				<div
					style={{
						backgroundColor: "rgba(255,255,255,0.03)",
						border: "1px solid var(--line-strong, rgba(255,255,255,0.1))",
						borderRadius: "10px",
						padding: "10px",
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						flexShrink: 0,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<span
							style={{
								fontSize: "11px",
								fontWeight: 600,
								color: "var(--muted, #a1a1aa)",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							Протокол сверления (Misch {latestImplant.boneDensity.classification})
						</span>

						<button
							type="button"
							onClick={handleExportSnapshotTo043}
							disabled={isExportingSnapshot}
							style={{
								height: "24px",
								padding: "0 8px",
								borderRadius: "4px",
								border: "none",
								backgroundColor: "var(--emerald-600, #059669)",
								color: "#fff",
								fontSize: "11px",
								fontWeight: 600,
								cursor: isExportingSnapshot ? "wait" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
							}}
							title="Прикрепить снимок и протокол к карте пациента 043/у"
						>
							{isExportingSnapshot ? (
								<Loader2 className="w-3 h-3 animate-spin" />
							) : (
								<Camera className="w-3 h-3" />
							)}
							<span>В карту 043/у</span>
						</button>

						{handleAddCbctToFinance && (
							<button
								type="button"
								onClick={handleAddCbctToFinance}
								data-testid="cbct-quadrant-add-finance-btn"
								style={{
									height: "24px",
									padding: "0 8px",
									borderRadius: "4px",
									border: "none",
									backgroundColor: "var(--teal-600, #0d9488)",
									color: "#fff",
									fontSize: "11px",
									fontWeight: 600,
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
								title="В 1 клик добавить услугу КЛКТ (A06.07.012, 3 800 ₽) в финансовый акт визита и смету плана лечения"
							>
								<Receipt className="w-3 h-3" />
								<span>+ КТ в акт (804н)</span>
							</button>
						)}
					</div>

					<div
						style={{
							fontSize: "11px",
							color: "var(--ink-muted, #e4e4e7)",
							lineHeight: 1.4,
							backgroundColor: "rgba(0,0,0,0.3)",
							borderRadius: "6px",
							padding: "6px 8px",
							border: "1px solid rgba(255,255,255,0.06)",
						}}
					>
						<strong style={{ color: "var(--cyan-400, #22d3ee)" }}>
							{latestImplant.boneDensity.classification} ({Math.round(latestImplant.boneDensity.averageHU)} HU):{" "}
						</strong>
						{latestImplant.boneDensity.drillingAdvice}
					</div>

					{aiProtocolLog && (
						<p
							style={{
								fontSize: "11px",
								lineHeight: 1.4,
								color: "var(--muted, #a1a1aa)",
								margin: 0,
							}}
						>
							{aiProtocolLog}
						</p>
					)}
				</div>
			)}
		</>
	);
};
