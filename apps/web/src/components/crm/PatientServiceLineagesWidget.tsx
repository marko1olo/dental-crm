import React, { useEffect, useState } from "react";
import { GitCommit, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface LineageItem {
	id: string;
	organizationId: string;
	patientName: string;
	leadSource: string;
	rescheduleCount: number;
	waitlistEntryId?: string;
	finalVisitId?: string;
	lifecycleStage: string;
	createdAt: string;
}

export const PatientServiceLineagesWidget: React.FC<{ patientId?: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const [items, setItems] = useState<LineageItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const url = patientId
			? `/api/crm/patient-service-lineages?patientId=${encodeURIComponent(patientId)}`
			: "/api/crm/patient-service-lineages";

		fetch(url, {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientServiceLineagesWidget fetch error]:", err);
				setLoading(false);
			});
	}, [patientId]);

	return (
		<div
			data-testid="patient-service-lineages-widget"
			style={{
				padding: "16px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				marginTop: "16px"
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<GitCommit size={18} style={{ color: "var(--brand-500)" }} />
					<h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
						Сквозное Дерево Связей «Вкладка Приёмы» (Заявка → Перенос → Лист ожидания → Визит)
					</h3>
				</div>
				<span style={{ fontSize: "11px", background: "var(--brand-50)", color: "var(--brand-700)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
					Lineage Graph
				</span>
			</div>

			{loading ? (
				<div style={{ fontSize: "13px", color: "var(--muted)", padding: "12px 0" }}>Загрузка сквозного дерева связей...</div>
			) : items.length === 0 ? (
				<div style={{ padding: "16px", textAlign: "center", background: "var(--surface-50)", borderRadius: "8px", border: "1px dashed var(--line)" }}>
					<Clock size={24} style={{ margin: "0 auto 8px", opacity: 0.5, color: "var(--muted)" }} />
					<div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>История связей обращения отсутствует</div>
					<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
						При первых переносах или создании визита из онлайн-заявки здесь появится граф жизни обращения.
					</div>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{items.map((item) => (
						<div
							key={item.id}
							style={{
								padding: "12px 14px",
								background: "var(--surface-50)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								display: "flex",
								flexDirection: "column",
								gap: "8px"
							}}
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{item.patientName}</span>
								<span style={{ fontSize: "11px", background: "var(--brand-100)", color: "var(--brand-800)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
									{item.lifecycleStage}
								</span>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)", flexWrap: "wrap" }}>
								<span>Источник: <strong>{item.leadSource}</strong></span>
								<ArrowRight size={12} />
								<span>Переносов: <strong>{item.rescheduleCount}</strong></span>
								{item.waitlistEntryId && (
									<>
										<ArrowRight size={12} />
										<span style={{ color: "var(--brand-600)" }}>Лист ожидания</span>
									</>
								)}
								{item.finalVisitId && (
									<>
										<ArrowRight size={12} />
										<span style={{ color: "var(--emerald)", display: "flex", alignItems: "center", gap: "2px" }}>
											<CheckCircle2 size={12} /> Завершено в визит
										</span>
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

