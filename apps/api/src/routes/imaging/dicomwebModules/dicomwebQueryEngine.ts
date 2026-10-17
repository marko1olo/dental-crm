import type {
	DicomWebAuthMode,
	DicomWebConnectorCheckRequest,
	DicomWebConnectorStatus,
	QidoSeriesQuery,
	QidoStudyQuery,
} from "./dicomwebTypes.js";

export function safeJoinUrl(baseUrl: string, childPath: string): string {
	const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	const child = childPath.startsWith("/") ? childPath.slice(1) : childPath;
	return new URL(child, base).toString().replace(/\/$/, "");
}

export function addQueryParams(url: string, params: Record<string, string>): string {
	const parsed = new URL(url);
	Object.entries(params).forEach(([key, value]) => {
		if (value) parsed.searchParams.set(key, value);
	});
	return parsed.toString();
}

export function buildQidoProbeUrl(input: DicomWebConnectorCheckRequest): string {
	const studiesUrl = safeJoinUrl(input.endpointUrl, input.qidoRsPath);
	if (input.studyInstanceUid && input.seriesInstanceUid) {
		return addQueryParams(
			`${studiesUrl}/${encodeURIComponent(input.studyInstanceUid)}/series`,
			{
				SeriesInstanceUID: input.seriesInstanceUid,
			},
		);
	}
	if (input.studyInstanceUid) {
		return addQueryParams(studiesUrl, {
			StudyInstanceUID: input.studyInstanceUid,
		});
	}
	return addQueryParams(studiesUrl, { limit: "1" });
}

export function buildQidoStudiesUrl(
	baseUrl: string,
	qidoPath: string,
	query?: QidoStudyQuery,
): string {
	const studiesUrl = safeJoinUrl(baseUrl, qidoPath || "studies");
	const params: Record<string, string> = {};
	if (query?.PatientID) params.PatientID = query.PatientID;
	if (query?.PatientName) params.PatientName = query.PatientName;
	if (query?.StudyDate) params.StudyDate = query.StudyDate;
	if (query?.Modality) params.Modality = query.Modality;
	if (query?.StudyInstanceUID) params.StudyInstanceUID = query.StudyInstanceUID;
	if (query?.limit !== undefined) params.limit = String(query.limit);
	if (query?.offset !== undefined) params.offset = String(query.offset);
	return addQueryParams(studiesUrl, params);
}

export function buildQidoSeriesUrl(
	baseUrl: string,
	qidoPath: string,
	studyUid: string,
	query?: QidoSeriesQuery,
): string {
	const seriesUrl = safeJoinUrl(
		baseUrl,
		`${qidoPath || "studies"}/${encodeURIComponent(studyUid)}/series`,
	);
	const params: Record<string, string> = {};
	if (query?.SeriesInstanceUID) params.SeriesInstanceUID = query.SeriesInstanceUID;
	if (query?.Modality) params.Modality = query.Modality;
	if (query?.SeriesNumber !== undefined) params.SeriesNumber = String(query.SeriesNumber);
	if (query?.limit !== undefined) params.limit = String(query.limit);
	return addQueryParams(seriesUrl, params);
}

export function dicomWebAuthHeaders(authMode: DicomWebAuthMode): {
	headers: Record<string, string>;
	warnings: string[];
} {
	const headers: Record<string, string> = {
		Accept: "application/dicom+json, application/json;q=0.9, */*;q=0.1",
	};
	const warnings: string[] = [];

	if (authMode === "bearer") {
		warnings.push(
			process.env.DICOMWEB_BEARER_TOKEN?.trim()
				? "Серверный токен архива снимков настроен, но на проверке связи не отправляется: он выдан конкретному архиву, а адрес проверки задает оператор. Ответ 401/403 означает, что архив доступен и требует учетных данных."
				: "Серверный токен архива снимков не настроен; запрос будет отправлен без учетных данных архива.",
		);
	}

	if (authMode === "basic") {
		warnings.push(
			process.env.DICOMWEB_BASIC_AUTH?.trim()
				? "Серверная авторизация архива снимков настроена, но на проверке связи не отправляется: она выдана конкретному архиву, а адрес проверки задает оператор. Ответ 401/403 означает, что архив доступен и требует учетных данных."
				: "Серверная авторизация архива снимков не настроена; запрос будет отправлен без учетных данных архива.",
		);
	}

	if (authMode === "reverse_proxy") {
		warnings.push(
			"Выбран серверный доступ через клиническую сеть: CRM ожидает, что авторизация архива обрабатывается вне этого запроса.",
		);
	}

	return { headers, warnings };
}

export function connectorStatusFromHttpStatus(
	httpStatus: number | null,
	fetchError: boolean,
): DicomWebConnectorStatus {
	if (fetchError) return "unreachable";
	if (httpStatus === 401 || httpStatus === 403) return "auth_required";
	if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300)
		return "ready";
	return "misconfigured";
}
