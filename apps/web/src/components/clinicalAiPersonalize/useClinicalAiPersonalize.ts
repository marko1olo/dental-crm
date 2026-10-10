/**
 * Layer 3: Кастомный хук состояния и адаптеров API для ИИ-персонализации.
 */

import { useCallback, useMemo, useState } from "react";
import { showToast } from "../../components/GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import type {
	AiPersonalizeState,
	PersonalizedPlanResult,
	PlanItem,
	PostVisitPersonalizedResult,
	Scenario,
} from "./types";
import {
	buildTreatmentPlanPayload,
	failureText,
	inferCareTopic,
	loadDoctorAiPersonalizeSettings,
	readServerMessage,
	resetDoctorAiPersonalizeSettings,
	saveDoctorAiPersonalizeSettings,
} from "./utils";

export interface UseClinicalAiPersonalizeParams {
	patientId?: string | null;
	doctorFullName?: string | null;
	complaint?: string | null;
	diagnosis?: string | null;
	treatmentPlanText?: string | null;
}

export function useClinicalAiPersonalize({
	patientId = null,
	doctorFullName = null,
	complaint = null,
	diagnosis = null,
	treatmentPlanText = null,
}: UseClinicalAiPersonalizeParams) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = (appLogic as { dashboard?: Record<string, unknown> } | null)
		?.dashboard;

	const [settings, setSettings] = useState<AiPersonalizeState>(() =>
		loadDoctorAiPersonalizeSettings(),
	);
	const [planResult, setPlanResult] = useState<PersonalizedPlanResult | null>(null);
	const [postResult, setPostResult] = useState<PostVisitPersonalizedResult | null>(null);
	const [planError, setPlanError] = useState<string | null>(null);
	const [postError, setPostError] = useState<string | null>(null);
	const [planLoading, setPlanLoading] = useState(false);
	const [postLoading, setPostLoading] = useState(false);
	const [copied, setCopied] = useState<string | null>(null);

	const patientItems = useMemo(() => {
		if (!patientId || !dashboard) return [] as PlanItem[];
		const raw = (dashboard as { treatmentPlanItems?: PlanItem[] })
			.treatmentPlanItems;
		if (!Array.isArray(raw)) return [];
		return raw.filter((item) => item?.patientId === patientId);
	}, [dashboard, patientId]);

	const patientScenarios = useMemo(() => {
		if (!patientId || !dashboard) return [] as Scenario[];
		const raw = (dashboard as { treatmentPlanScenarios?: Scenario[] })
			.treatmentPlanScenarios;
		if (!Array.isArray(raw)) return [];
		return raw.filter((s) => s?.patientId === patientId);
	}, [dashboard, patientId]);

	const resolvedDoctorName = useMemo(() => {
		const fromProp = (doctorFullName || "").trim();
		if (fromProp) return fromProp;
		const doc = (
			appLogic as { activeDoctor?: { fullName?: string; name?: string } } | null
		)?.activeDoctor;
		const name = (doc?.fullName || doc?.name || "").trim();
		return name || "Лечащий врач";
	}, [appLogic, doctorFullName]);

	const copyText = useCallback(async (label: string, text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(label);
			window.setTimeout(
				() => setCopied((cur) => (cur === label ? null : cur)),
				2000,
			);
		} catch {
			setCopied(null);
		}
	}, []);

	const handleSaveSettings = useCallback(() => {
		saveDoctorAiPersonalizeSettings(settings);
		showToast("Настройки стиля ИИ сохранены", "success");
	}, [settings]);

	const handleResetSettings = useCallback(() => {
		const res = resetDoctorAiPersonalizeSettings();
		setSettings(res);
		showToast("Стиль сброшен к эталону клинических рекомендаций", "info");
	}, []);

	const runPlanPersonalize = useCallback(async () => {
		if (!patientId) {
			setPlanError("Сначала выберите пациента — без карты план собрать нельзя.");
			return;
		}
		const payloadOrError = buildTreatmentPlanPayload({
			items: patientItems,
			scenarios: patientScenarios,
			complaint,
			diagnosis,
			treatmentPlanText,
			doctorFullName: resolvedDoctorName,
		});
		if ("error" in payloadOrError) {
			setPlanError(String(payloadOrError.error));
			setPlanResult(null);
			return;
		}

		setPlanLoading(true);
		setPlanError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders({ "Content-Type": "application/json" })
					: { "Content-Type": "application/json" };
			const response = await fetch("/api/ai/treatment-plan-personalize", {
				method: "POST",
				headers,
				body: JSON.stringify(payloadOrError),
			});
			const body = (await response.json()) as unknown;
			if (!response.ok) {
				setPlanResult(null);
				setPlanError(
					failureText(response.status, readServerMessage(body), "plan"),
				);
				return;
			}
			const result = body as PersonalizedPlanResult;
			if (
				!result ||
				typeof result.patientFriendlyExplanation !== "string" ||
				typeof result.patientHygieneAdvice !== "string"
			) {
				setPlanResult(null);
				setPlanError(
					"Сервер вернул ответ без текста для пациента. Попробуйте ещё раз.",
				);
				return;
			}
			setPlanResult(result);
		} catch (error) {
			setPlanResult(null);
			showToast(
				actionFailureToast(
					"Персонализация плана",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPlanError(
				"Сеть недоступна: персонализация плана не получена. Проверьте связь и повторите.",
			);
		} finally {
			setPlanLoading(false);
		}
	}, [
		auth,
		complaint,
		diagnosis,
		patientId,
		patientItems,
		patientScenarios,
		resolvedDoctorName,
		treatmentPlanText,
	]);

	const runPostVisitPersonalize = useCallback(async () => {
		if (!patientId) {
			setPostError("Сначала выберите пациента — без карты памятку собрать нельзя.");
			return;
		}

		const activeItems = (patientItems ?? []).filter(
			(i) => i?.status !== "cancelled",
		);
		const primary =
			activeItems.find((i) => i?.status === "completed") ||
			activeItems.find((i) => i?.status === "in_progress") ||
			activeItems[0];
		const procedureName =
			(primary?.snapshotServiceName || "").trim() ||
			(treatmentPlanText || "").trim().slice(0, 120) ||
			"Стоматологический приём";
		const toothOrArea =
			(primary?.toothCode || "").trim() ||
			Array.from(
				new Set(
					activeItems.map((i) => (i?.toothCode || "").trim()).filter(Boolean),
				),
			).join(", ") ||
			"Полость рта";
		const careTopic = inferCareTopic(activeItems, procedureName);

		setPostLoading(true);
		setPostError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders({ "Content-Type": "application/json" })
					: { "Content-Type": "application/json" };
			const response = await fetch("/api/ai/post-visit-personalize", {
				method: "POST",
				headers,
				body: JSON.stringify({
					careTopic,
					procedureName: procedureName.slice(0, 240),
					toothOrArea: toothOrArea.slice(0, 240),
					doctorFullName: resolvedDoctorName.slice(0, 240),
				}),
			});
			const body = (await response.json()) as unknown;
			if (!response.ok) {
				setPostResult(null);
				setPostError(
					failureText(response.status, readServerMessage(body), "post"),
				);
				return;
			}
			const result = body as PostVisitPersonalizedResult;
			if (
				!result ||
				!Array.isArray(result.allowedAfter) ||
				typeof result.telegramSummary !== "string"
			) {
				setPostResult(null);
				setPostError("Сервер вернул неполную памятку. Попробуйте ещё раз.");
				return;
			}
			setPostResult(result);
		} catch (error) {
			setPostResult(null);
			showToast(
				actionFailureToast(
					"Сборка памятки",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPostError(
				"Сеть недоступна: памятка после приёма не получена. Проверьте связь и повторите.",
			);
		} finally {
			setPostLoading(false);
		}
	}, [auth, patientId, patientItems, resolvedDoctorName, treatmentPlanText]);

	const planCount = patientItems.filter((i) => i?.status !== "cancelled").length;

	return {
		settings,
		setSettings,
		planResult,
		postResult,
		planError,
		postError,
		planLoading,
		postLoading,
		copied,
		copyText,
		runPlanPersonalize,
		runPostVisitPersonalize,
		handleSaveSettings,
		handleResetSettings,
		planCount,
	};
}
