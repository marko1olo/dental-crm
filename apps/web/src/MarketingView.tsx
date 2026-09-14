import { RecallListPanel } from "./components/patients/RecallListPanel";

export function MarketingView({
	clinicName: _clinicName,
	clinicPhone: _clinicPhone,
}: {
	clinicName?: string;
	clinicPhone?: string;
}) {
	return (
		<section
			className="settings-zone marketing-zone panel p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
			id="marketing"
			aria-label="Маркетинг/Диспансеризация"
			data-testid="marketing-view"
		>
			<div className="panel-heading settings-heading mb-4">
				<h2 title="Диспансерный учет и возврат пациентов на регулярные осмотры">
					Диспансерный учет / Возврат пациентов
				</h2>
				<span className="status-pill status-confirmed">активен</span>
			</div>

			{/* RECALL LIST: ВОЗВРАТ ПАЦИЕНТОВ И ДИСПАНСЕРИЗАЦИЯ */}
			<div className="mt-2">
				<RecallListPanel />
			</div>
		</section>
	);
}

