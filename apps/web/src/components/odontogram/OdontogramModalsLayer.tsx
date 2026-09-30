import React from "react";
import { calculateAge } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { actionFailureToast } from "../../lib/panelStateText";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
	dictationApplyMessage,
	dictationApplyPlanFromResponseBody,
} from "./dictationToothUpdates";
import {
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { ToothHistoryChronicle } from "./ToothHistoryChronicle";
import type { EndoToothClinicalData } from "../endo/EndoCanalLogModal";
import type { CheckoutPaymentMethodType } from "../payments/checkout/fastCheckoutPresets";

const EndoCanalLogModal = React.lazy(() =>
	import("../endo/EndoCanalLogModal").then((m) => ({
		default: m.EndoCanalLogModal,
	})),
);
const PediatricMixedDentitionModal = React.lazy(() =>
	import("./PediatricMixedDentitionModal").then((m) => ({
		default: m.PediatricMixedDentitionModal,
	})),
);
const TreatmentEstimator = React.lazy(() =>
	import("./TreatmentEstimator").then((m) => ({
		default: m.TreatmentEstimator,
	})),
);
const TreatmentPlanModule = React.lazy(() =>
	import("../treatment-plans/TreatmentPlanModule").then((m) => ({
		default: m.TreatmentPlanModule,
	})),
);
const PeriodontogramChart = React.lazy(() =>
	import("../perio/PeriodontogramChart").then((m) => ({
		default: m.PeriodontogramChart,
	})),
);
const VoiceDictationOverlay = React.lazy(() =>
	import("./VoiceDictationOverlay").then((m) => ({
		default: m.VoiceDictationOverlay,
	})),
);
const FastCheckoutModal = React.lazy(() =>
	import("../finance/FastCheckoutModal").then((m) => ({
		default: m.FastCheckoutModal,
	})),
);

export interface OdontogramModalsLayerProps {
	patientId: string;
	teethData: ToothData[];
	setTeethData: React.Dispatch<React.SetStateAction<ToothData[]>>;
	historyTooth: number | null;
	setHistoryTooth: (tooth: number | null) => void;
	endoTooth: number | null;
	setEndoTooth: (tooth: number | null) => void;
	isEstimatorOpen: boolean;
	isPerioOpen: boolean;
	isVoiceOpen: boolean;
	setIsVoiceOpen: (open: boolean) => void;
	isPediatricModalOpen: boolean;
	setIsPediatricModalOpen: (open: boolean) => void;
	isFastCheckoutOpen: boolean;
	setIsFastCheckoutOpen: (open: boolean) => void;
	fastCheckoutMethod: CheckoutPaymentMethodType;
	liveGrossTotalRub: number;
	activePatient?: any;
	activeDoctor?: any;
	auth?: any;
	setAiPendingProposal: React.Dispatch<
		React.SetStateAction<{
			source: "voice" | "vision" | "sensor";
			title: string;
			findings: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>;
		} | null>
	>;
}

export const OdontogramModalsLayer: React.FC<OdontogramModalsLayerProps> = ({
	patientId,
	teethData,
	setTeethData,
	historyTooth,
	setHistoryTooth,
	endoTooth,
	setEndoTooth,
	isEstimatorOpen,
	isPerioOpen,
	isVoiceOpen,
	setIsVoiceOpen,
	isPediatricModalOpen,
	setIsPediatricModalOpen,
	isFastCheckoutOpen,
	setIsFastCheckoutOpen,
	fastCheckoutMethod,
	liveGrossTotalRub,
	activePatient,
	activeDoctor,
	auth,
	setAiPendingProposal,
}) => {
	return (
		<>
			{historyTooth !== null && (
				<ToothHistoryChronicle
					patientId={patientId}
					toothNumber={historyTooth}
					onClose={() => setHistoryTooth(null)}
				/>
			)}

			{endoTooth !== null && (
				<React.Suspense fallback={null}>
					<EndoCanalLogModal
						isOpen={true}
						onClose={() => setEndoTooth(null)}
						toothNumber={endoTooth}
						toothState={
							TOOTH_STATE_LABELS[
								teethData.find((t) => t.toothNumber === endoTooth)?.state ||
									"Pulpitis"
							]
						}
						patientId={patientId}
						initialCanals={
							(
								teethData.find((t) => t.toothNumber === endoTooth)
									?.clinicalData as EndoToothClinicalData | undefined
							)?.canals
						}
						initialIrrigation={
							(
								teethData.find((t) => t.toothNumber === endoTooth)
									?.clinicalData as EndoToothClinicalData | undefined
							)?.irrigation
						}
						initialRadiologyControl={
							(
								teethData.find((t) => t.toothNumber === endoTooth)
									?.clinicalData as EndoToothClinicalData | undefined
							)?.radiologyControl
						}
						onSaveCanals={async (canals, clinicalData) => {
							setTeethData((prev) =>
								prev.map((t) =>
									t.toothNumber === endoTooth ? { ...t, clinicalData } : t,
								),
							);
							const tooth = teethData.find((t) => t.toothNumber === endoTooth);
							const state = tooth?.state || "Pulpitis";
							const surfaces = tooth?.surfaces || [];
							try {
								const res = await fetch(
									`/api/patients/${patientId}/tooth-states/batch`,
									{
										method: "POST",
										headers: denteAdminSecretRequestHeaders({
											"Content-Type": "application/json",
										}),
										body: JSON.stringify({
											toothNumbers: [endoTooth],
											state,
											surfaces: surfaces.length > 0 ? surfaces : undefined,
											clinicalData,
										}),
									},
								);
								if (!res.ok) {
									showToast(
										"Не удалось сохранить параметры каналов в БД",
										"error",
									);
								}
							} catch (err) {
								logger.error("[OdontogramModule] Save endo canals error", err);
							}
						}}
					/>
				</React.Suspense>
			)}

			{/* Collapsible Full-width Treatment Planning Section below Odontogram */}
			{isEstimatorOpen && (
				<div className="w-full flex flex-col gap-6 mt-2 animate-in fade-in duration-200">
					<React.Suspense fallback={null}>
						<TreatmentEstimator patientId={patientId} currentTeeth={teethData} />
						<TreatmentPlanModule patientId={patientId} teethData={teethData} />
					</React.Suspense>
				</div>
			)}

			{/* Collapsible Periodontal Examination Module below Odontogram */}
			{isPerioOpen && (
				<div className="w-full mt-2 animate-in fade-in duration-200">
					<React.Suspense fallback={null}>
						<PeriodontogramChart
							patientId={patientId}
							patientName={activePatient?.name}
							organizationId={auth?.organizationId}
							doctorId={activeDoctor?.id}
							doctorName={activeDoctor?.name}
							onInsertToProtocol={(protocolText) => {
								try {
									window.dispatchEvent(
										new CustomEvent("dente-apply-soap-protocol", {
											detail: {
												soap: protocolText,
												mode: "smart_append",
											},
										}),
									);
									showToast("Протокол пародонтограммы добавлен в дневник приёма", "success", 4000);
								} catch {
									// Safe fallback
								}
							}}
						/>
					</React.Suspense>
				</div>
			)}

			{isVoiceOpen && (
				<React.Suspense fallback={null}>
					<VoiceDictationOverlay
						isOpen={isVoiceOpen}
						onClose={() => setIsVoiceOpen(false)}
						onDictationSubmit={async (text) => {
							setIsVoiceOpen(false);
							try {
								const res = await fetch("/api/ai/parse-dictation", {
									method: "POST",
									headers: denteAdminSecretRequestHeaders({
										"Content-Type": "application/json",
									}),
									body: JSON.stringify({ text, type: "visit" }),
								});
								const rawBody = await res.text();
								if (!res.ok) {
									logger.error(
										`[dictation parse] ${res.status} ${rawBody.slice(0, 300)}`,
									);
									showToast(
										`${actionFailureToast("Надиктованное не разобрано", res.status)} Схема не изменена — отметьте зубы вручную.`,
										"error",
										12000,
									);
									return;
								}
								const plan = dictationApplyPlanFromResponseBody(rawBody);
								if (plan === null) {
									logger.error(
										`[dictation parse] ${res.status}: ответ не по контракту`,
									);
									showToast(
										"Надиктованное не распознано. Проверьте подключение и повторите диктовку.",
										"warning",
										5000,
									);
									return;
								}
								const message = dictationApplyMessage(plan);
								if (plan.applied.length > 0) {
									setAiPendingProposal({
										source: "voice",
										title: "Голосовая диктовка врача",
										findings: plan.applied.map((item) => ({
											toothNumber: item.toothNumber,
											state: item.state,
										})),
									});
									showToast(
										`Голосом распознано: ${plan.applied.length} ${countLabel(plan.applied.length, "зуб", "зуба", "зубов")}. Подтвердите внесение в формулу.`,
										"info",
										8000,
									);
								} else {
									showToast(
										message.text,
										message.tone,
										message.tone === "success" ? 6000 : 15000,
									);
								}
							} catch (e) {
								logger.error("[dictation parse] запрос не выполнен", e);
								showToast(
									`${actionFailureToast("Надиктованное не разобрано", null)} Схема не изменена — отметьте зубы вручную.`,
									"error",
									12000,
								);
							}
						}}
					/>
				</React.Suspense>
			)}

			{isPediatricModalOpen && (
				<React.Suspense fallback={null}>
					<PediatricMixedDentitionModal
						isOpen={isPediatricModalOpen}
						onClose={() => setIsPediatricModalOpen(false)}
						teethData={teethData}
						initialAge={
							(activePatient as { birthDate?: string | null } | undefined)?.birthDate
								? calculateAge((activePatient as { birthDate?: string | null }).birthDate!) ?? 7.5
								: 7.5
						}
						onUpdateToothResorption={(toothNumber, resorptionStage) => {
							setTeethData((prev) =>
								prev.map((t) =>
									t.toothNumber === toothNumber
										? { ...t, resorptionStage }
										: t,
								),
							);
						}}
					/>
				</React.Suspense>
			)}

			{/* 1-Click Fast Checkout Modal for In-Chair Cockpit */}
			{isFastCheckoutOpen && (
				<React.Suspense fallback={null}>
					<FastCheckoutModal
						isOpen={isFastCheckoutOpen}
						onClose={() => setIsFastCheckoutOpen(false)}
						totalBillKop={Math.round(liveGrossTotalRub * 100)}
						initialPaymentMethod={fastCheckoutMethod}
						patientName={activePatient?.fullName || "Пациент"}
						patientPhone={activePatient?.phone || "+7 (999) 000-00-00"}
						orderId={`CHK-${patientId.slice(0, 8)}`}
						onPaymentComplete={() => {
							showToast(
								`Чек на сумму ${liveGrossTotalRub.toLocaleString("ru-RU")} ₽ успешно фискализирован (54-ФЗ)`,
								"success",
							);
							setIsFastCheckoutOpen(false);
						}}
					/>
				</React.Suspense>
			)}
		</>
	);
};
