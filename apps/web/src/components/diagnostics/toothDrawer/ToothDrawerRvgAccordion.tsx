import React from "react";
import { ChevronDown, ChevronUp, Scan } from "lucide-react";
import { ToothRvgThumbnail } from "../ToothRvgThumbnail";
import type { ToothData } from "../../odontogram/ToothChart";
import type { WarmAccordionSection } from "./toothDrawerTypes";
import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ToothDrawerRvgAccordionProps {
	toothNumber: number;
	patientId?: string | undefined;
	toothData?: ToothData | undefined;
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
}

interface ToothClinicalRvgData {
	readonly rvgScanUrl?: string | undefined;
	readonly updatedAt?: string | undefined;
	readonly [key: string]: unknown;
}

export const ToothDrawerRvgAccordion: React.FC<ToothDrawerRvgAccordionProps> = ({
	toothNumber,
	patientId,
	toothData,
	activeSection,
	toggleSection,
	onOpenFullRadiology,
	onInsertToProtocol,
	onUpdateTooth,
}) => {
	const isExpanded = activeSection === "rvg_xray";
	const rvgData = toothData?.clinicalData as ToothClinicalRvgData | undefined;
	const scanImageUrl = typeof rvgData?.rvgScanUrl === "string" ? rvgData.rvgScanUrl : undefined;

	return (
		<section className="dente-accordion-item">
			<button
				type="button"
				onClick={() => toggleSection("rvg_xray")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
			>
				<div className="trigger-left min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<Scan size={16} className="shrink-0" color="var(--brand-primary, var(--teal))" />
						<span className="trigger-title truncate">3. Снимок RVG (2D / 3D)</span>
					</div>
					<span className="trigger-summary text-[11px] text-[var(--muted)] font-medium pl-6 block sm:inline sm:pl-2">
						Периапикальный контроль
					</span>
				</div>
				<div className="trigger-right shrink-0">
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in">
					<ToothRvgThumbnail
						toothNumber={toothNumber}
						patientId={patientId}
						scanImageUrl={scanImageUrl}
						onOpenFullRadiology={onOpenFullRadiology}
						onInsertToProtocol={onInsertToProtocol}
						onAttachScan={async (file) => {
							const objectUrl = URL.createObjectURL(file);
							const currentClinical = toothData?.clinicalData ?? {};
							// 1. Быстрый локальный предпросмотр (<50мс)
							onUpdateTooth?.(toothNumber, {
								clinicalData: {
									...currentClinical,
									rvgScanUrl: objectUrl,
									updatedAt: new Date().toISOString(),
								},
							});

							// 2. Персистентная загрузка в клинический архив PACS (/api/imaging/studies)
							if (patientId && UUID_REGEX.test(patientId)) {
								try {
									const reader = new FileReader();
									reader.onload = async () => {
										const base64Data = reader.result as string;
										try {
											const res = await fetch("/api/imaging/studies", {
												method: "POST",
												headers: denteClinicalMutationHeaders({
													"Content-Type": "application/json",
													"Idempotency-Key": generateUuidV7(),
												}),
												body: JSON.stringify({
													patientId,
													imageBase64: base64Data,
													title: `Прицельный снимок RVG зуба #${toothNumber}`,
													toothCode: String(toothNumber),
													kind: "periapical",
													sourceKind: "manual_upload",
													sourceName: file.name.slice(0, 160),
													aiSummary: `Прицельный снимок RVG зуба #${toothNumber}`,
												}),
											});

											if (res.ok) {
												const raw = (await res.json()) as {
													data?: { id?: string; fileUrl?: string };
													id?: string;
													fileUrl?: string;
												};
												const json = raw?.data ?? raw;
												const persistentUrl = json?.fileUrl || (json?.id ? `/api/imaging/studies/${json.id}/file` : null);
												if (persistentUrl) {
													onUpdateTooth?.(toothNumber, {
														clinicalData: {
															...currentClinical,
															rvgScanUrl: persistentUrl,
															scanId: json?.id,
															updatedAt: new Date().toISOString(),
														},
													});
													showToast(`Снимок зуба #${toothNumber} сохранён в архив PACS`, "success", 2500);
													if (typeof window !== "undefined") {
														window.dispatchEvent(
															new CustomEvent("dente-xray-updated", {
																detail: {
																	patientId,
																	toothCode: String(toothNumber),
																	scanId: json?.id,
																},
															}),
														);
													}
												}
											} else {
												showToast(`Не удалось сохранить снимок в PACS (${res.status})`, "error");
											}
										} catch (err) {
											clientLogger.warn("[ToothDrawerRvgAccordion] PACS network upload failed", err, {
												module: "ToothDrawerRvgAccordion",
											});
											showToast("Не удалось загрузить снимок в PACS", "error");
										}
									};
									reader.readAsDataURL(file);
								} catch (uploadErr) {
									clientLogger.warn("[ToothDrawerRvgAccordion] Background PACS upload failed, keeping preview", uploadErr, {
										module: "ToothDrawerRvgAccordion",
									});
									showToast("Не удалось загрузить снимок в PACS", "error");
								}
							}
						}}
					/>
				</div>
			)}
		</section>
	);
};
