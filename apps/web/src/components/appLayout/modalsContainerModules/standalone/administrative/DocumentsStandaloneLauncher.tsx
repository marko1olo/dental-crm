/**
 * DocumentsStandaloneLauncher — реестр документов и договоров по deep-link (Мандат 8b).
 *
 * Честный контур: ?documents=1 + ?patientId= → карточка и документы пациента
 * из базы (GET /api/patients/:id, GET /api/documents?patientId=). Вымышленный
 * «Смирнов» с договором на 65 000 ₽ и паспортными данными из головы выжжен.
 * Тяжёлые генераторы (налоговый пакет, карта приёма) живут в живом разделе
 * «Документы» — кнопки ведут туда, а не подделывают модалки с неполным контекстом.
 */

import React, { useEffect, useMemo, useState } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";
import { readPatientIdFromUrl } from "../useLauncherPatientDebt";
import {
	type LauncherDocument,
	fetchLauncherPatient,
	fetchLauncherPatientDocuments,
} from "../launcherFinanceApi";
import { LauncherDocumentsContractsSection } from "./LauncherDocumentsContractsSection";

export function renderDocumentsStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const search = new URLSearchParams(window.location.search || "");
	const hasDocsQuery = search.has("documents") || search.has("docs");
	if (!hasDocsQuery) return null;

	return <StandaloneDocumentsHub />;
}

function StandaloneDocumentsHub() {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const [patientName, setPatientName] = useState<string | null>(patientId ? null : "");
	const [documents, setDocuments] = useState<LauncherDocument[] | null>(null);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		void (async () => {
			const [patient, docs] = await Promise.all([
				fetchLauncherPatient(patientId),
				fetchLauncherPatientDocuments(patientId),
			]);
			if (cancelled) return;
			setPatientName(patient?.fullName || "Пациент");
			setDocuments(docs);
		})();
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	if (!patientId) {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Реестр документов и договоров открывается по конкретному пациенту. Добавьте ?patientId= в ссылку или откройте его из картотеки."
				testId="standalone-documents-missing-state"
				onClose={() => clearUrlTokens(["documents", "docs"])}
			/>
		);
	}
	if (documents === null) return <AppLoadingState message="Загрузка документов из базы..." />;

	return (
		<LauncherDocumentsContractsSection
			patientId={patientId}
			patientName={patientName || "Пациент"}
			documents={documents}
		/>
	);
}

export const DirectDocumentsLauncher: React.FC = () => {
	return renderDocumentsStandaloneLauncher();
};
