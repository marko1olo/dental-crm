import React from "react";
import {
	ShieldCheck,
	Key,
	CheckCircle2,
	AlertCircle,
	Building2,
	UserCheck,
	FileCheck,
	RefreshCw,
	Printer,
	Zap
} from "lucide-react";
import { generateSickLeavePatientMemoHtml } from "../sickLeaveElnEngine";
import type { ElnDigitalSignatureSectionProps } from "./types";

export function ElnDigitalSignatureSection({
	formState,
	doctorFio = "Врач-стоматолог",
	doctorSnils = "000-000-000 00",
	clinicName = "Медицинская организация",
	clinicOgrn = "—",
	signatureStatus,
	onSignDoctor,
	onSignOrganization,
	onVerifySignatures
}: ElnDigitalSignatureSectionProps) {
	const resolvedDoctorFio = doctorFio.trim() || "Врач-стоматолог";
	const resolvedDoctorSnils = doctorSnils.trim() || "Указывается в профиле врача";
	const resolvedClinicName = clinicName.trim() || "Медицинская организация";
	const resolvedClinicOgrn = clinicOgrn.trim() || "Указывается в реквизитах клиники";
	const isBothSigned = signatureStatus.signedByDoctor && signatureStatus.signedByOrg;

	const handleSignBoth = () => {
		onSignDoctor();
		onSignOrganization();
	};

	const handlePrintPaperFallback = () => {
		const html = generateSickLeavePatientMemoHtml(formState, {
			patientFio: "Пациент клиники",
			patientBirthDate: "",
			patientGender: "male",
			patientSnils: "",
			patientOmsNumber: "",
			patientPassport: "",
			employerName: "",
			isPrimaryWorkplace: true,
			patientPhone: ""
		});
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		} else if (typeof window !== "undefined" && typeof window.print === "function") {
			window.print();
		}
	};

	return (
		<div className="sick-leave-section">
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
				<div>
					<h4 className="sick-leave-section-title">
						<Key size={16} />
						Электронная подпись больничного листа
					</h4>
					<p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
						Подписание больничного листа для отправки в Социальный фонд России (СФР) или печать бумажного бланка при отсутствии токена.
					</p>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
					<span
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							fontSize: '0.75rem',
							padding: '6px 10px',
							borderRadius: '8px',
							backgroundColor: 'var(--paper-soft)',
							border: '1px solid var(--line)',
							color: 'var(--ink)',
							fontWeight: 600
						}}
					>
						<ShieldCheck size={14} />
						{signatureStatus.cryptoProAvailable
							? 'Модуль электронной подписи готов'
							: 'Режим без токена: доступна бумажная форма'}
					</span>
				</div>
			</div>

			{/* Fast 1-Click Dual Action Bar for Solo Doctor / Chief Doctor + Paper Fallback */}
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '0.75rem',
					marginTop: '1rem',
					padding: '0.75rem 1rem',
					borderRadius: '8px',
					backgroundColor: 'var(--paper-soft)',
					border: '1px solid var(--line)'
				}}
			>
				<div style={{ fontSize: '0.8125rem', color: 'var(--ink)' }}>
					<strong>Быстрое оформление:</strong> если врач совмещает роль руководителя клиники, подпишите обе роли одним нажатием.
				</div>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
					<button
						type="button"
						className={`sick-leave-btn ${isBothSigned ? 'secondary' : 'primary'}`}
						style={{ minHeight: '44px' }}
						onClick={handleSignBoth}
					>
						<Zap size={16} />
						{isBothSigned ? 'Переподписать в 1 клик (Врач + Клиника)' : 'Подписать в 1 клик (Врач + Клиника)'}
					</button>
					<button
						type="button"
						className="sick-leave-btn secondary"
						style={{ minHeight: '44px' }}
						onClick={handlePrintPaperFallback}
					>
						<Printer size={16} />
						Бумажный бланк / Выписка
					</button>
				</div>
			</div>

			{/* Signature Cards Grid */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
				{/* 1. Doctor Signature Card */}
				<div
					style={{
						padding: '1rem',
						borderRadius: '8px',
						border: '1px solid var(--line)',
						backgroundColor: signatureStatus.signedByDoctor ? 'var(--paper-soft)' : 'var(--paper)',
						display: 'flex',
						flexDirection: 'column',
						gap: '0.75rem'
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--ink)' }}>
							<UserCheck size={16} />
							<span>1. Подпись лечащего врача</span>
						</div>
						{signatureStatus.signedByDoctor ? (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 600 }}>
								<CheckCircle2 size={14} />
								Подписано
							</span>
						) : (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600 }}>
								<AlertCircle size={14} />
								Ожидает подписи
							</span>
						)}
					</div>

					<div style={{ fontSize: '0.8125rem', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
						<div>Врач: <strong>{resolvedDoctorFio}</strong></div>
						<div>СНИЛС: <strong>{resolvedDoctorSnils}</strong></div>
						<div>
							Сертификат:{" "}
							<code style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								{signatureStatus.doctorCertThumbprint || "Формируется при подписании"}
							</code>
						</div>
						{signatureStatus.doctorSignedAt && (
							<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								Время подписи: {signatureStatus.doctorSignedAt}
							</div>
						)}
					</div>

					<div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
						<button
							type="button"
							className={`sick-leave-btn ${signatureStatus.signedByDoctor ? 'secondary' : 'primary'}`}
							style={{ width: '100%', minHeight: '44px' }}
							onClick={onSignDoctor}
						>
							<FileCheck size={16} />
							{signatureStatus.signedByDoctor ? 'Обновить подпись врача' : 'Подписать ЭЦП врача'}
						</button>
					</div>
				</div>

				{/* 2. Organization Signature Card */}
				<div
					style={{
						padding: '1rem',
						borderRadius: '8px',
						border: '1px solid var(--line)',
						backgroundColor: signatureStatus.signedByOrg ? 'var(--paper-soft)' : 'var(--paper)',
						display: 'flex',
						flexDirection: 'column',
						gap: '0.75rem'
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--ink)' }}>
							<Building2 size={16} />
							<span>2. Печать медицинской организации</span>
						</div>
						{signatureStatus.signedByOrg ? (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 600 }}>
								<CheckCircle2 size={14} />
								Подписано
							</span>
						) : (
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600 }}>
								<AlertCircle size={14} />
								Ожидает подписи
							</span>
						)}
					</div>

					<div style={{ fontSize: '0.8125rem', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
						<div>Клиника: <strong>{resolvedClinicName}</strong></div>
						<div>ОГРН: <strong>{resolvedClinicOgrn}</strong></div>
						<div>
							Сертификат:{" "}
							<code style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								{signatureStatus.orgCertThumbprint || "Формируется при подписании"}
							</code>
						</div>
						{signatureStatus.orgSignedAt && (
							<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								Время подписи: {signatureStatus.orgSignedAt}
							</div>
						)}
					</div>

					<div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
						<button
							type="button"
							className={`sick-leave-btn ${signatureStatus.signedByOrg ? 'secondary' : 'primary'}`}
							style={{ width: '100%', minHeight: '44px' }}
							onClick={onSignOrganization}
						>
							<FileCheck size={16} />
							{signatureStatus.signedByOrg ? 'Обновить печать клиники' : 'Подписать печатью клиники'}
						</button>
					</div>
				</div>
			</div>

			{/* Signature Verification Action */}
			<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
				<button
					type="button"
					className="sick-leave-btn secondary"
					style={{ minHeight: '44px' }}
					onClick={onVerifySignatures}
				>
					<RefreshCw size={14} />
					Проверить готовность сертификатов на компьютере
				</button>
			</div>
		</div>
	);
}
