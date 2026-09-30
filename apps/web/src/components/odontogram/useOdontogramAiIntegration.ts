import { useCallback, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import type { ToothData, ToothState } from "./ToothChart";

export interface AiPendingProposal {
	source: "voice" | "vision" | "sensor";
	title: string;
	findings: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>;
}

export interface UseOdontogramAiIntegrationProps {
	patientId: string;
	setTeethData: React.Dispatch<React.SetStateAction<ToothData[]>>;
	updateToothState: (
		toothNumbers: number[],
		state: ToothState,
		surfacesOverride?: readonly string[] | undefined,
	) => Promise<void>;
}

export function useOdontogramAiIntegration({
	patientId,
	setTeethData,
	updateToothState,
}: UseOdontogramAiIntegrationProps) {
	const [diagnocatLoading, setDiagnocatLoading] = useState(false);
	const [diagnocatPendingReport, setDiagnocatPendingReport] = useState<{
		reportDate: string;
		findings: ToothData[];
	} | null>(null);
	const [aiPendingProposal, setAiPendingProposal] = useState<AiPendingProposal | null>(null);

	const loadDiagnocatReport = useCallback(async () => {
		setDiagnocatLoading(true);
		try {
			const res = await fetch(
				`/api/integrations/diagnocat/reports/${patientId}`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (res.ok) {
				const data = await res.json();
				if (data.reports && data.reports.length > 0) {
					const latest = data.reports[data.reports.length - 1];
					const reportDateStr = new Date(latest.createdAt).toLocaleDateString("ru-RU");
					if (
						latest.odontogramData &&
						Array.isArray(latest.odontogramData.states) &&
						latest.odontogramData.states.length > 0
					) {
						// МАНДАТ 8e / РАЗДЕЛ VII: Запрет автоматической перезаписи зубной формулы роботом!
						// ИИ может лишь предложить чек-лист находок; подтверждает их только врач.
						setDiagnocatPendingReport({
							reportDate: reportDateStr,
							findings: latest.odontogramData.states,
						});
						showToast(
							`Найден отчёт Diagnocat AI от ${reportDateStr} (${latest.odontogramData.states.length} находок). Подтвердите внесение в формулу.`,
							"info",
							6000,
						);
					} else {
						showToast("Отчёт Diagnocat не содержит размеченных патологий.", "info", 5000);
					}
				} else {
					showToast("Отчёты Diagnocat не найдены.", "info", 5000);
				}
			}
		} catch (err) {
			logger.error(err);
			showToast("Ошибка загрузки отчётов Diagnocat.", "error", 5000);
		} finally {
			setDiagnocatLoading(false);
		}
	}, [patientId]);

	const handleApplyDiagnocatFindings = useCallback(() => {
		if (!diagnocatPendingReport) return;
		const incoming = diagnocatPendingReport.findings;
		setTeethData((prev) => {
			const merged = [...prev];
			for (const tooth of incoming) {
				const idx = merged.findIndex(
					(x) => x.toothNumber === tooth.toothNumber,
				);
				if (idx > -1) merged[idx] = tooth;
				else merged.push(tooth);
			}
			return merged;
		});
		showToast(
			`Находки Diagnocat AI (${incoming.length} зубов) успешно подтверждены и внесены врачом в зубную формулу.`,
			"success",
			5000,
		);
		setDiagnocatPendingReport(null);
	}, [diagnocatPendingReport, setTeethData]);

	const handleRejectDiagnocatFindings = useCallback(() => {
		setDiagnocatPendingReport(null);
		showToast("Находки Diagnocat AI отклонены врачом. Зубная формула сохранена без изменений.", "info", 4000);
	}, []);

	const handleApplyAiProposal = useCallback(async () => {
		if (!aiPendingProposal) return;
		const findings = aiPendingProposal.findings;
		for (const item of findings) {
			await updateToothState([item.toothNumber], item.state, item.surfaces);
		}
		showToast(
			`Предложения ИИ (${findings.length} зубов) успешно подтверждены и внесены врачом в зубную формулу.`,
			"success",
			5000,
		);
		setAiPendingProposal(null);
	}, [aiPendingProposal, updateToothState]);

	const handleRejectAiProposal = useCallback(() => {
		setAiPendingProposal(null);
		showToast(
			"Предложения ИИ отклонены врачом. Зубная формула сохранена без изменений.",
			"info",
			4000,
		);
	}, []);

	return {
		diagnocatLoading,
		diagnocatPendingReport,
		loadDiagnocatReport,
		handleApplyDiagnocatFindings,
		handleRejectDiagnocatFindings,
		aiPendingProposal,
		setAiPendingProposal,
		handleApplyAiProposal,
		handleRejectAiProposal,
	};
}
