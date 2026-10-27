import { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	getLastActivePatient,
	saveLastActivePatient,
	type LastActivePatientData,
	type RecentPatientItem,
} from "./recentPatientStorage";

export function useRecentPatients() {
	const context = useAppLogicContext();
	const auth = context?.auth;
	const selectPatientById = context?.setSelectedPatientId;

	const [patients, setPatients] = useState<RecentPatientItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [failed, setFailed] = useState<boolean>(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [lastPatient, setLastPatient] = useState<LastActivePatientData | null>(
		() => getLastActivePatient(),
	);

	const authRef = useRef(auth);
	authRef.current = auth;

	useEffect(() => {
		let active = true;
		const headerSource = authRef.current;
		fetch("/api/hr/recent-patients", {
			headers: headerSource ? headerSource.denteClinicalReadHeaders() : {},
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`История карточек: ответ ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				if (!active) return;
				const list = Array.isArray(data) ? data : [];
				setPatients(list);
				if (list.length > 0 && list[0]) {
					const first = list[0];
					const firstData: LastActivePatientData = {
						patientId: first.patientId || first.id,
						patientName: first.patientName,
						phone: first.phone,
						timestamp: Date.now(),
					};
					if (!getLastActivePatient()) {
						saveLastActivePatient(firstData);
						setLastPatient(firstData);
					}
				}
				setFailed(false);
				setLoading(false);
			})
			.catch(() => {
				if (!active) return;
				setFailed(true);
				setLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const handleOpenPatient = (patId: string, patName?: string, phone?: string) => {
		if (patName) {
			const activeData: LastActivePatientData = {
				patientId: patId,
				patientName: patName,
				phone,
				timestamp: Date.now(),
			};
			saveLastActivePatient(activeData);
			setLastPatient(activeData);
		}
		selectPatientById?.(patId);
		if (typeof window !== "undefined") {
			window.location.hash = "#patients";
		}
		setIsOpen(false);
	};

	const firstPatient = patients.length > 0 ? patients[0] : undefined;
	const activeLastPatient: LastActivePatientData | null =
		lastPatient ??
		(firstPatient
			? {
					patientId: firstPatient.patientId || firstPatient.id,
					patientName: firstPatient.patientName,
					phone: firstPatient.phone,
					timestamp: Date.now(),
				}
			: null);

	return {
		patients,
		loading,
		failed,
		isOpen,
		setIsOpen,
		activeLastPatient,
		handleOpenPatient,
	};
}
