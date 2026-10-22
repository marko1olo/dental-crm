import { ChevronDown, Wrench } from "lucide-react";
import React from "react";
import { CabinetDisinfectionOverride } from "./CabinetDisinfectionOverride";
import { CabinetProfileSelectors } from "./CabinetProfileSelectors";
import { CabinetSanpinNormBanner } from "./CabinetSanpinNormBanner";
import { CabinetStatusCardsGrid } from "./CabinetStatusCardsGrid";
import { CabinetUnitBreakdownChecks } from "./CabinetUnitBreakdownChecks";
import type { CabinetSanpinChecklistProps } from "./types";

export function CabinetSanpinChecklist(props: CabinetSanpinChecklistProps) {
	const allItemsReady =
		props.disinfectionCompleted &&
		props.turbineSterile &&
		props.contraAngleSterile &&
		props.micromotorSterile &&
		props.class5Verified &&
		props.mirrorReady &&
		props.probeReady &&
		props.tweezersReady &&
		props.excavatorReady &&
		props.spatulaReady &&
		props.salivaConnected &&
		props.hveConnected &&
		(!props.currentPreset.requiresCofferdam || (props.rubberDamReady && props.clampsReady && props.forcepsReady));

	return (
		<div
			className="cabinet-sanpin-checklist-container"
			style={{ marginTop: "0.75rem" }}
			data-section="Автоматический санитарный контроль готовности кабинета"
			data-description="Фоновый расчет нормативов без симуляции ручного труда (Норма в 1 клик)"
		>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "1rem 1.25rem",
					boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
				}}
			>
				<CabinetSanpinNormBanner allItemsReady={allItemsReady} onQuickFillAllReady={props.onQuickFillAllReady} />
				<CabinetProfileSelectors
					selectedCabinet={props.selectedCabinet}
					setSelectedCabinet={props.setSelectedCabinet}
					selectedProfile={props.selectedProfile}
					setSelectedProfile={props.setSelectedProfile}
					setExposureMinutes={props.setExposureMinutes}
				/>
				<CabinetStatusCardsGrid
					disinfectionCompleted={props.disinfectionCompleted}
					disinfectantBrand={props.disinfectantBrand}
					exposureMinutes={props.exposureMinutes}
					minExposureMinutes={props.currentPreset.minExposureMinutes}
					turbineSterile={props.turbineSterile}
					contraAngleSterile={props.contraAngleSterile}
					class5Verified={props.class5Verified}
					salivaConnected={props.salivaConnected}
					hveConnected={props.hveConnected}
					requiresCofferdam={props.currentPreset.requiresCofferdam}
				/>
			</div>

			<details
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "0.75rem 1.1rem",
					marginTop: "0.75rem",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 700,
						fontSize: "0.88rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						color: "var(--brand-primary, #2563eb)",
						userSelect: "none",
					}}
				>
					<Wrench size={16} />
					<span>Журнал исключений и ручная корректировка узлов</span>
					<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<span style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
							Все 20 параметров по умолчанию в норме
						</span>
						<ChevronDown size={15} color="var(--muted, #64748b)" />
					</div>
				</summary>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: "1.25rem",
						marginTop: "1rem",
						paddingTop: "0.75rem",
						borderTop: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<CabinetDisinfectionOverride
						disinfectionCompleted={props.disinfectionCompleted}
						setDisinfectionCompleted={props.setDisinfectionCompleted}
						disinfectantBrand={props.disinfectantBrand}
						setDisinfectantBrand={props.setDisinfectantBrand}
						exposureMinutes={props.exposureMinutes}
						setExposureMinutes={props.setExposureMinutes}
						minExposureMinutes={props.currentPreset.minExposureMinutes}
					/>
					<CabinetUnitBreakdownChecks {...props} requiresCofferdam={props.currentPreset.requiresCofferdam} />
				</div>
			</details>
		</div>
	);
}
