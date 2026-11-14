/**
 * useRadiologyArchiveLogic.ts — Логика фильтрации, автопривязки и загрузки картотеки снимков из PostgreSQL 18 (Мандат 8b/8be).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImagingStudy } from "@dental/shared";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { DEMO_ARCHIVE_STUDIES } from "../demoArchiveStudies";
import type { ArchiveBindingFilter, ArchiveModalityFilter } from "./RadiologyArchiveTypes";

export function useRadiologyArchiveLogic(initialStudies?: ImagingStudy[], initialLoading?: boolean) {
	const [studies, setStudies] = useState<ImagingStudy[]>(() =>
		initialStudies ?? (isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []),
	);
	const [isLoading, setIsLoading] = useState<boolean>(() => initialLoading ?? false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [modalityFilter, setModalityFilter] = useState<ArchiveModalityFilter>("all");
	const [bindingFilter, setBindingFilter] = useState<ArchiveBindingFilter>("all");
	const [activeControlStudy, setActiveControlStudy] = useState<ImagingStudy | null>(null);
	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(50);

	const refetchStudies = useCallback(async () => {
		if (initialStudies !== undefined) {
			setStudies(initialStudies);
			return;
		}

		setIsLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("limit", String(pageSize));
			params.set("offset", String((page - 1) * pageSize));

			if (searchQuery.trim()) {
				params.set("search", searchQuery.trim());
			}

			if (modalityFilter === "cbct") {
				params.set("modality", "CT");
			} else if (modalityFilter === "opg") {
				params.set("modality", "DX");
			} else if (modalityFilter === "periapical") {
				params.set("modality", "IO");
			}

			if (bindingFilter === "bound") {
				params.set("bindingStatus", "manual_bound");
			} else if (bindingFilter === "unassigned") {
				params.set("bindingStatus", "unassigned");
			} else if (bindingFilter === "pending_review") {
				params.set("bindingStatus", "pending_review");
			}

			let response = await fetch(`/api/imaging/studies?${params.toString()}`, {
				headers: { Accept: "application/json" },
			});

			if (!response.ok) {
				response = await fetch(`/api/radiology/studies?${params.toString()}`, {
					headers: { Accept: "application/json" },
				});
			}

			if (response.ok) {
				const json: unknown = await response.json();
				if (Array.isArray(json)) {
					const casted = json as ImagingStudy[];
					const cleanStudies = isDemoShowcaseMode()
						? (casted.length > 0 ? casted : DEMO_ARCHIVE_STUDIES)
						: casted.filter((s) => s.organizationId !== DEMO_SHOWCASE_ORG_ID);
					setStudies(cleanStudies);
				} else {
					setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
				}
			} else {
				setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
			}
		} catch {
			setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
		} finally {
			setIsLoading(false);
		}
	}, [initialStudies, pageSize, page, searchQuery, modalityFilter, bindingFilter]);

	useEffect(() => {
		if (initialStudies !== undefined) {
			setStudies(initialStudies);
			return;
		}

		let isMounted = true;
		const controller = new AbortController();

		async function load() {
			setIsLoading(true);
			try {
				const params = new URLSearchParams();
				params.set("limit", String(pageSize));
				params.set("offset", String((page - 1) * pageSize));

				if (searchQuery.trim()) {
					params.set("search", searchQuery.trim());
				}
				if (modalityFilter === "cbct") {
					params.set("modality", "CT");
				} else if (modalityFilter === "opg") {
					params.set("modality", "DX");
				} else if (modalityFilter === "periapical") {
					params.set("modality", "IO");
				}

				if (bindingFilter === "bound") {
					params.set("bindingStatus", "manual_bound");
				} else if (bindingFilter === "unassigned") {
					params.set("bindingStatus", "unassigned");
				} else if (bindingFilter === "pending_review") {
					params.set("bindingStatus", "pending_review");
				}

				let res = await fetch(`/api/imaging/studies?${params.toString()}`, {
					signal: controller.signal,
					headers: { Accept: "application/json" },
				});

				if (!res.ok) {
					res = await fetch(`/api/radiology/studies?${params.toString()}`, {
						signal: controller.signal,
						headers: { Accept: "application/json" },
					});
				}

				if (res.ok) {
					const json: unknown = await res.json();
					if (isMounted) {
						if (Array.isArray(json)) {
							const casted = json as ImagingStudy[];
							const cleanStudies = isDemoShowcaseMode()
								? (casted.length > 0 ? casted : DEMO_ARCHIVE_STUDIES)
								: casted.filter((s) => s.organizationId !== DEMO_SHOWCASE_ORG_ID);
							setStudies(cleanStudies);
						} else {
							setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
						}
					}
				} else if (isMounted) {
					setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
				}
			} catch (err: unknown) {
				if (isMounted && (err as { name?: string })?.name !== "AbortError") {
					setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		}

		void load();

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [initialStudies, searchQuery, modalityFilter, bindingFilter, page, pageSize]);

	const filteredStudies = useMemo(() => {
		return studies.filter((study) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const patientName = study.patientFullName || study.dicomPatientName || "";
				const matchName = patientName.toLowerCase().includes(q);
				const matchId = study.id.toLowerCase().includes(q);
				if (!matchName && !matchId) return false;
			}
			if (modalityFilter === "cbct" && study.modality !== "CT") return false;
			if (modalityFilter === "opg" && study.modality !== "DX" && study.modality !== "PX") return false;
			if (modalityFilter === "periapical" && study.modality !== "IO") return false;
			if (modalityFilter === "ceph" && study.modality !== "CR") return false;
			if (modalityFilter === "photo" && study.modality !== "XC") return false;
			if (bindingFilter === "bound" && !study.patientId) return false;
			if (bindingFilter === "unassigned" && study.patientId) return false;
			if (bindingFilter === "pending_review" && study.bindingStatus !== "pending_review") return false;
			return true;
		});
	}, [studies, searchQuery, modalityFilter, bindingFilter]);

	return {
		studies,
		setStudies,
		isLoading,
		setIsLoading,
		searchQuery,
		setSearchQuery,
		modalityFilter,
		setModalityFilter,
		bindingFilter,
		setBindingFilter,
		activeControlStudy,
		setActiveControlStudy,
		filteredStudies,
		page,
		setPage,
		pageSize,
		setPageSize,
		refetchStudies,
	};
}
