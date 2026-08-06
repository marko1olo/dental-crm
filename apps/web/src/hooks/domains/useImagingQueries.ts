import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function useImagingQueries() {
	const { auth } = useAppLogicContext();

	const getScans = async (patientId: string) => {
		return fetch(`/api/xray/scans?patientId=${patientId}`, {
			headers: auth.denteClinicalReadHeaders(),
		});
	};

	const saveBatchToothStates = async (patientId: string, updates: any[]) => {
		return fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify({ updates }),
		});
	};

	const analyzeVisiograph = async (payload: {
		patientId: string;
		imageBase64: string;
		focus?: "caries" | "perio" | "endo" | null;
	}) => {
		return fetch("/api/imaging/visiograph-ai", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	};

	const saveScan = async (payload: any) => {
		return fetch("/api/xray/scans", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});
	};

	const getScan = async (scanId: string) => {
		return fetch(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			headers: auth.denteClinicalReadHeaders(),
		});
	};

	const deleteScan = async (scanId: string) => {
		return fetch(`/api/xray/scans/${encodeURIComponent(scanId)}`, {
			method: "DELETE",
			headers: auth.denteClinicalMutationHeaders(),
		});
	};

	return {
		getScans,
		saveBatchToothStates,
		analyzeVisiograph,
		saveScan,
		getScan,
		deleteScan,
	};
}
