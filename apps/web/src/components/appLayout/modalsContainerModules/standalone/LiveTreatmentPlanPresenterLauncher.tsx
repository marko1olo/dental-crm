/**
 * LiveTreatmentPlanPresenterLauncher.tsx — Автономный лаунчер студии презентации планов лечения.
 *
 * Полное искоренение «потёмкинских деревень» и разделение Dual-Mode контуров (Мандаты 8c, 8e, 8k, SSOT):
 * 1. В боевом контуре (!isDemoShowcaseMode()):
 *    - Запрещены синтетические моки и фиктивные ФИО («Воронов Дмитрий Игоревич», захардкоженные UUID).
 *    - Честная динамическая гидратация из PostgreSQL 18 через Fastify API (/api/v1/treatment-plans/pipeline
 *      и /api/treatment-plans/:id).
 *    - Реквизиты клиники динамически считываются из /api/settings/clinic-profile.
 *    - При отсутствии планов в базе — честный, клинически корректный Empty State.
 * 2. В демонстрационном контуре (isDemoShowcaseMode()):
 *    - Загружается изолированный эталонный кейс для презентации у кресла с 3 тарифами и одонтограммой.
 * 3. Фиксация тарифа:
 *    - Сохраняется в БД через /approve-variant с созданием Price Freeze Token и записью в audit_events.
 */

import React, { useEffect, useState } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { TreatmentPlanPresenterModal } from "../../../treatment-plans/TreatmentPlanPresenterModal";
import type { ToothData } from "../../../odontogram/ToothChart";
import type { PipelineResponse } from "../../../../pages/coordinator/pipeline/types";
import { getDenteAuthHeaders, denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { DEFAULT_SAMPLE_TEETH } from "../../../treatment-plans/presenterModules/state/presenterStateConstants";
import { useDocumentBrandingStore } from "../../../../store/documentBrandingStore";
import { showToast } from "../../../GlobalToast";
import { logger } from "../../../../utils/logger";

interface LivePatientPlanInfo {
	readonly patientName: string;
	readonly patientId: string;
	readonly patientPhone: string;
	readonly patientBirthDate?: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly planId: string;
	readonly planCreatedAtIso?: string;
	readonly teeth?: readonly ToothData[];
}

interface ClinicRequisites {
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicLicense?: string;
}

export interface LiveTreatmentPlanPresenterLauncherProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}

export const LiveTreatmentPlanPresenterLauncher: React.FC<LiveTreatmentPlanPresenterLauncherProps> = ({
	isOpen,
	onClose,
}) => {
	const [patientPlan, setPatientPlan] = useState<LivePatientPlanInfo | null>(null);
	const [clinicRequisites, setClinicRequisites] = useState<ClinicRequisites | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isEmptyState, setIsEmptyState] = useState<boolean>(false);

	const isDemo = isDemoShowcaseMode();

	useEffect(() => {
		if (!isOpen) return;

		let isMounted = true;

		async function resolveData() {
			try {
				setIsLoading(true);
				setIsEmptyState(false);

				// 1. Считывание актуальных реквизитов клиники из SSOT бэкенда
				let resolvedRequisites: ClinicRequisites = {
					clinicName: "Стоматологическая клиника",
					clinicLegalName: "",
					clinicInn: "",
					clinicOgrn: "",
					clinicAddress: "",
					clinicPhone: "",
					clinicLicense: "",
				};

				try {
					const profRes = await fetch("/api/settings/clinic-profile", {
						headers: getDenteAuthHeaders(),
					});
					if (profRes.ok) {
						const profile = await profRes.json();
						resolvedRequisites = {
							clinicName: profile.clinicName || profile.legalName || "Стоматологическая клиника",
							clinicLegalName: profile.legalName || profile.clinicName || "",
							clinicInn: profile.inn || "",
							clinicOgrn: profile.ogrn || "",
							clinicAddress: profile.address || "",
							clinicPhone: profile.phone || "",
							clinicLicense: profile.medicalLicenseNumber || "",
						};
					} else {
						// Fallback to /api/settings/clinic
						const clinicRes = await fetch("/api/settings/clinic", {
							headers: getDenteAuthHeaders(),
						});
						if (clinicRes.ok) {
							const clinicSettings = await clinicRes.json();
							const p = clinicSettings.profile || {};
							resolvedRequisites = {
								clinicName: p.clinicName || p.legalName || "Стоматологическая клиника",
								clinicLegalName: p.legalName || p.clinicName || "",
								clinicInn: p.inn || "",
								clinicOgrn: p.ogrn || "",
								clinicAddress: p.address || "",
								clinicPhone: p.phone || "",
								clinicLicense: p.medicalLicenseNumber || "",
							};
						}
					}
				} catch (reqErr) {
					logger.warn("Не удалось загрузить реквизиты клиники из настроек:", reqErr);
					const branding = useDocumentBrandingStore.getState();
					resolvedRequisites = {
						clinicName: branding.clinicName || "Стоматологическая клиника",
						clinicLegalName: branding.clinicLegalName || "",
						clinicInn: branding.clinicInn || "",
						clinicOgrn: branding.clinicOgrn || "",
						clinicAddress: branding.clinicAddress || "",
						clinicPhone: branding.clinicPhone || "",
						clinicLicense: branding.licenseNumber || "",
					};
				}

				if (isMounted) {
					setClinicRequisites(resolvedRequisites);
				}

				// 2. Демонстрационный контур (Showcase)
				if (isDemo) {
					if (isMounted) {
						setPatientPlan({
							patientName: "Смирнова Анна Сергеевна",
							patientId: "pat-demo-showcase-01",
							patientPhone: "+7 (999) 345-67-89",
							patientBirthDate: "1988-04-12",
							doctorFullName: "Д-р Соколов Алексей Владимирович",
							doctorSpecialty: "Врач-стоматолог терапевт, ортопед",
							planId: "plan-demo-showcase-01",
							planCreatedAtIso: new Date().toISOString(),
							teeth: DEFAULT_SAMPLE_TEETH,
						});
						setIsLoading(false);
					}
					return;
				}

				// 3. Боевой контур (Production): строго реальная БД PostgreSQL 18
				const search = new URLSearchParams(window.location.search);
				const targetPatientId = search.get("patientId");
				const targetPlanId = search.get("planId");

				// 3A. Проверка явно переданных идентификаторов через URL
				if (targetPatientId && targetPlanId) {
					try {
						const [patRes, planRes] = await Promise.all([
							fetch(`/api/patients/${encodeURIComponent(targetPatientId)}`, {
								headers: getDenteAuthHeaders(),
							}),
							fetch(`/api/treatment-plans/${encodeURIComponent(targetPlanId)}`, {
								headers: getDenteAuthHeaders(),
							}),
						]);

						if (patRes.ok && planRes.ok) {
							const pat = await patRes.json();
							const planData = await planRes.json();
							if (isMounted) {
								setPatientPlan({
									patientName: pat.fullName || pat.name || "Пациент DENTE",
									patientId: targetPatientId,
									patientPhone: pat.phone || "",
									patientBirthDate: pat.birthDate,
									doctorFullName: planData.doctorFullName || "Лечащий врач",
									doctorSpecialty: "Врач-стоматолог",
									planId: targetPlanId,
									planCreatedAtIso: planData.createdAtIso || new Date().toISOString(),
								});
								setIsLoading(false);
								return;
							}
						}
					} catch (urlFetchErr) {
						logger.warn("Ошибка загрузки целевого плана по параметрам URL:", urlFetchErr);
					}
				}

				// 3B. Запрос оперативной воронки планов лечения
				const pipelineRes = await fetch("/api/v1/treatment-plans/pipeline", {
					headers: getDenteAuthHeaders(),
				});

				if (pipelineRes.ok) {
					const data: PipelineResponse = await pipelineRes.json();
					const allCards = Object.values(data.pipeline || {}).flat();
					const firstCard = allCards.find((c) => Boolean(c && c.patientId && c.id));

					if (firstCard && isMounted) {
						let patientPhone = firstCard.patientPhone || "";
						let patientBirthDate: string | undefined;

						try {
							const pRes = await fetch(`/api/patients/${encodeURIComponent(firstCard.patientId)}`, {
								headers: getDenteAuthHeaders(),
							});
							if (pRes.ok) {
								const pData = await pRes.json();
								patientPhone = pData.phone || patientPhone;
								patientBirthDate = pData.birthDate;
							}
						} catch {
							// Use pipeline phone
						}

						if (isMounted) {
							setPatientPlan({
								patientName: firstCard.patientName || "Пациент",
								patientId: firstCard.patientId,
								patientPhone,
								patientBirthDate,
								doctorFullName: firstCard.doctorName || "Лечащий врач",
								doctorSpecialty: "Врач-стоматолог",
								planId: firstCard.id,
								planCreatedAtIso: firstCard.createdAt,
							});
							setIsLoading(false);
							return;
						}
					}
				}

				// 3C. Если планов в живой базе нет — честный Empty State (никаких фейковых «Вороновых»)
				if (isMounted) {
					setPatientPlan(null);
					setIsEmptyState(true);
					setIsLoading(false);
				}
			} catch (err) {
				logger.error("Ошибка гидрации реального плана для лаунчера:", err);
				if (isMounted) {
					setPatientPlan(null);
					setIsEmptyState(true);
					setIsLoading(false);
				}
			}
		}

		resolveData();

		return () => {
			isMounted = false;
		};
	}, [isOpen, isDemo]);

	if (!isOpen) return null;

	if (isLoading) {
		return <AppLoadingState message="Синхронизация плана с базой данных DENTE..." />;
	}

	// Честный клинический Empty State при отсутствии планов в рабочей базе
	if (isEmptyState || !patientPlan) {
		return (
			<div
				className="treatment-presenter-backdrop"
				data-testid="treatment-plan-presenter-empty-state"
				role="dialog"
				aria-modal="true"
				aria-labelledby="empty-presenter-title"
			>
				<div className="treatment-presenter-modal max-w-lg p-6 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col items-center text-center">
					<div className="w-16 h-16 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mb-4 text-[var(--muted)]">
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<line x1="10" y1="9" x2="8" y2="9" />
						</svg>
					</div>
					<h3 id="empty-presenter-title" className="text-xl font-bold text-[var(--ink)] mb-2">
						Планы лечения не найдены
					</h3>
					<p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">
						В текущей базе данных клиники отсутствуют составленные планы лечения для презентации у кресла.
						Выберите пациента в расписании или создайте новый план лечения в карте приёма.
					</p>
					<div className="flex gap-3 w-full">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 py-3 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px]"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => {
								onClose();
								window.location.href = "/coordinator/pipeline";
							}}
							className="flex-1 py-3 px-4 rounded-xl bg-[var(--accent-primary)] text-[var(--on-accent-primary,white)] font-medium hover:opacity-95 transition-opacity min-h-[44px]"
						>
							Воронка планов
						</button>
					</div>
				</div>
			</div>
		);
	}

	const handleSaveApprovalToServer = async (tier: { title?: string; id?: string }) => {
		try {
			const res = await fetch(
				`/api/patients/${encodeURIComponent(patientPlan.patientId)}/treatment-plans/${encodeURIComponent(patientPlan.planId)}/approve-variant`,
				{
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						reason: `Пациент ${patientPlan.patientName} утвердил тариф «${tier.title || tier.id || "Основной"}» (ст. 20 323-ФЗ / ПП РФ №659)`,
					}),
				},
			);
			if (res.ok) {
				showToast("Тариф успешно зафиксирован в карте пациента и базе данных", "success");
			} else if (isDemo) {
				showToast("Тариф выбран в демонстрационном режиме", "success");
			}
		} catch (err) {
			logger.warn("Не удалось сохранить утверждение тарифа на сервере:", err);
			if (isDemo) {
				showToast("Тариф выбран в демонстрационном режиме", "success");
			}
		}
	};

	const currentRequisites = clinicRequisites || {
		clinicName: "Стоматологическая клиника",
		clinicLegalName: "",
		clinicInn: "",
		clinicOgrn: "",
		clinicAddress: "",
		clinicPhone: "",
		clinicLicense: "",
	};

	return (
		<TreatmentPlanPresenterModal
			isOpen={true}
			onClose={onClose}
			patientName={patientPlan.patientName}
			patientId={patientPlan.patientId}
			patientPhone={patientPlan.patientPhone}
			patientBirthDate={patientPlan.patientBirthDate}
			doctorFullName={patientPlan.doctorFullName}
			doctorSpecialty={patientPlan.doctorSpecialty}
			clinicName={currentRequisites.clinicName}
			clinicLegalName={currentRequisites.clinicLegalName}
			clinicInn={currentRequisites.clinicInn}
			clinicOgrn={currentRequisites.clinicOgrn}
			clinicAddress={currentRequisites.clinicAddress}
			clinicPhone={currentRequisites.clinicPhone}
			clinicLicense={currentRequisites.clinicLicense}
			planId={patientPlan.planId}
			planCreatedAtIso={patientPlan.planCreatedAtIso}
			teeth={patientPlan.teeth}
			onConfirmSelection={handleSaveApprovalToServer}
			onApproveAndSign={handleSaveApprovalToServer}
			isDemoMode={isDemo}
		/>
	);
};

export default LiveTreatmentPlanPresenterLauncher;
