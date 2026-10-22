import React from "react";
import { FileCheck } from "lucide-react";
import { RetroactiveHeroHeader } from "./retroactive/RetroactiveHeroHeader";
import { RetroactivePeriodButtons } from "./retroactive/RetroactivePeriodButtons";
import { RetroactiveCabinetsSelector } from "./retroactive/RetroactiveCabinetsSelector";
import { RetroactiveParametersSelectors } from "./retroactive/RetroactiveParametersSelectors";
import type { RetroactiveBatchHeroBannerProps } from "./retroactive/retroactiveBannerTypes";

export type { RetroactiveBatchHeroBannerProps } from "./retroactive/retroactiveBannerTypes";

export function RetroactiveBatchHeroBanner({
	periodPreset, setPeriodPreset, customStartDate, setCustomStartDate,
	customEndDate, setCustomEndDate, selectedCabinetIds, toggleCabinet,
	selectAllCabinets, nurseFullName, setNurseFullName, sterilizerModel,
	setSterilizerModel, availableSterilizers, onOpenEquipmentModal,
	autoclaveRegimeId, setAutoclaveRegimeId, onGenerateBatch,
	onRecordDayCycle, isLoggingDayCycle = false,
}: RetroactiveBatchHeroBannerProps) {
	return (
		<div
			style={{
				background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)",
				border: "1px solid rgba(37, 99, 235, 0.2)",
				borderRadius: "0.75rem",
				padding: "1.25rem 1.5rem",
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
			}}
		>
			<RetroactiveHeroHeader onRecordDayCycle={onRecordDayCycle} isLoggingDayCycle={isLoggingDayCycle} />

			<RetroactivePeriodButtons
				periodPreset={periodPreset}
				setPeriodPreset={setPeriodPreset}
				customStartDate={customStartDate}
				setCustomStartDate={setCustomStartDate}
				customEndDate={customEndDate}
				setCustomEndDate={setCustomEndDate}
			/>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
					gap: "1rem",
					paddingTop: "0.75rem",
					borderTop: "1px solid rgba(148, 163, 184, 0.2)",
				}}
			>
				<RetroactiveCabinetsSelector
					selectedCabinetIds={selectedCabinetIds}
					toggleCabinet={toggleCabinet}
					selectAllCabinets={selectAllCabinets}
				/>
				<RetroactiveParametersSelectors
					nurseFullName={nurseFullName}
					setNurseFullName={setNurseFullName}
					sterilizerModel={sterilizerModel}
					setSterilizerModel={setSterilizerModel}
					availableSterilizers={availableSterilizers}
					onOpenEquipmentModal={onOpenEquipmentModal}
					autoclaveRegimeId={autoclaveRegimeId}
					setAutoclaveRegimeId={setAutoclaveRegimeId}
				/>
			</div>

			<div style={{ display: "flex", justifyContent: "stretch", marginTop: "0.25rem" }}>
				<button
					type="button"
					onClick={onGenerateBatch}
					style={{
						width: "100%",
						minHeight: "56px",
						padding: "0.85rem 1.5rem",
						fontSize: "1.05rem",
						fontWeight: 900,
						letterSpacing: "0.02em",
						background: "var(--ok-fg)",
						borderColor: "var(--ok-fg)",
						color: "var(--on-teal, #ffffff)",
						borderRadius: "0.5rem",
						cursor: "pointer",
						boxShadow: "0 4px 14px rgba(5, 150, 105, 0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.75rem",
						border: "none",
					}}
					data-testid="execute-sanpin-batch-1click-btn"
				>
					<FileCheck size={22} color="var(--on-teal, #ffffff)" />
					<span>Заполнить все журналы стерилизации за период</span>
				</button>
			</div>
		</div>
	);
}

export { RetroactiveCabinetsSelector } from "./retroactive/RetroactiveCabinetsSelector";
export { RetroactiveHeroHeader } from "./retroactive/RetroactiveHeroHeader";
export { RetroactiveParametersSelectors } from "./retroactive/RetroactiveParametersSelectors";
export { RetroactivePeriodButtons } from "./retroactive/RetroactivePeriodButtons";
