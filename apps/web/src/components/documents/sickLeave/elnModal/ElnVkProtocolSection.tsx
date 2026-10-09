import React from "react";
import { UserCheck } from "lucide-react";
import type { ElnVkProtocolSectionProps } from "./types";

export function ElnVkProtocolSection({
	formState,
	setFormState,
	handleToggleVk
}: ElnVkProtocolSectionProps) {
	return (
		<div className="sick-leave-body">
			<div className="sick-leave-section">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div>
						<h4 className="sick-leave-section-title">
							<UserCheck size={16} />
							Заседание врачебной комиссии (ВК)
						</h4>
						<p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
							Обязательно при суммарной нетрудоспособности свыше 15 календарных дней.
						</p>
					</div>
					<button
						type="button"
						className={`sick-leave-btn ${formState.isVkRequired ? 'primary' : 'secondary'}`}
						onClick={() => handleToggleVk(!formState.isVkRequired)}
					>
						{formState.isVkRequired ? 'ВК Активирована' : 'Сформировать протокол ВК'}
					</button>
				</div>

				{formState.isVkRequired && formState.vkProtocol && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.5rem' }}>
						<div className="sick-leave-grid-3">
							<div className="sick-leave-field">
								<label className="sick-leave-label">Номер протокола ВК</label>
								<input
									type="text"
									className="sick-leave-input"
									value={formState.vkProtocol.protocolNumber}
									onChange={(e) =>
										setFormState((prev) => ({
											...prev,
											vkProtocol: prev.vkProtocol
												? { ...prev.vkProtocol, protocolNumber: e.target.value }
												: undefined
										}))
									}
								/>
							</div>
							<div className="sick-leave-field">
								<label className="sick-leave-label">Дата заседания ВК</label>
								<input
									type="date"
									className="sick-leave-input"
									value={formState.vkProtocol.protocolDate}
									onChange={(e) =>
										setFormState((prev) => ({
											...prev,
											vkProtocol: prev.vkProtocol
												? { ...prev.vkProtocol, protocolDate: e.target.value }
												: undefined
										}))
									}
								/>
							</div>
							<div className="sick-leave-field">
								<label className="sick-leave-label">Председатель ВК (Главврач)</label>
								<input
									type="text"
									className="sick-leave-input"
									value={formState.vkProtocol.chairpersonFio}
									onChange={(e) =>
										setFormState((prev) => ({
											...prev,
											vkProtocol: prev.vkProtocol
												? { ...prev.vkProtocol, chairpersonFio: e.target.value }
												: undefined
										}))
									}
								/>
							</div>
						</div>

						<div className="sick-leave-grid-2">
							<div className="sick-leave-field">
								<label className="sick-leave-label">СНИЛС Председателя ВК</label>
								<input
									type="text"
									className="sick-leave-input"
									value={formState.vkProtocol.chairpersonSnils}
									onChange={(e) =>
										setFormState((prev) => ({
											...prev,
											vkProtocol: prev.vkProtocol
												? { ...prev.vkProtocol, chairpersonSnils: e.target.value }
												: undefined
										}))
									}
								/>
							</div>
							<div className="sick-leave-field">
								<label className="sick-leave-label">Члены комиссии</label>
								<input
									type="text"
									className="sick-leave-input"
									value={formState.vkProtocol.memberFios.join(', ')}
									onChange={(e) =>
										setFormState((prev) => ({
											...prev,
											vkProtocol: prev.vkProtocol
												? {
														...prev.vkProtocol,
														memberFios: e.target.value.split(',').map((s) => s.trim())
													}
												: undefined
										}))
									}
								/>
							</div>
						</div>

						<div className="sick-leave-field">
							<label className="sick-leave-label">Клинико-экспертное обоснование продления</label>
							<textarea
								className="sick-leave-textarea"
								rows={3}
								value={formState.vkProtocol.clinicalSubstantiation}
								onChange={(e) =>
									setFormState((prev) => ({
										...prev,
										vkProtocol: prev.vkProtocol
											? { ...prev.vkProtocol, clinicalSubstantiation: e.target.value }
											: undefined
									}))
								}
							/>
						</div>

						<div className="sick-leave-field">
							<label className="sick-leave-label">Решение Врачебной комиссии</label>
							<textarea
								className="sick-leave-textarea"
								rows={2}
								value={formState.vkProtocol.expertDecision}
								onChange={(e) =>
									setFormState((prev) => ({
										...prev,
										vkProtocol: prev.vkProtocol
											? { ...prev.vkProtocol, expertDecision: e.target.value }
											: undefined
									}))
								}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
