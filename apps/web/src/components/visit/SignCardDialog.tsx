import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signatureService, CertificateInfo } from "../../lib/cryptopro";
import { showToast } from "../GlobalToast";
import { Lock, Cpu, Key, FileCheck2, Loader2, AlertTriangle } from "lucide-react";
import "./SignCardDialog.css";

interface SignCardDialogProps {
	isOpen: boolean;
	onClose: () => void;
	visitId: string;
	patientId: string;
	diaryContent: string;
	onSigned: (signatureData: { signatureBase64: string; thumbprint: string; signatureProvider: string }) => void;
}

export function SignCardDialog({ isOpen, onClose, visitId, patientId, diaryContent, onSigned }: SignCardDialogProps) {
	const [activeTab, setActiveTab] = useState<"cryptopro" | "rutoken">("cryptopro");
	const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [pinCode, setPinCode] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [fetchingCerts, setFetchingCerts] = useState<boolean>(false);

	useEffect(() => {
		if (isOpen) {
			loadCertificates();
			setPinCode("");
		}
	}, [isOpen, activeTab]);

	const loadCertificates = async () => {
		setFetchingCerts(true);
		try {
			const certs = await signatureService.getCertificates();
			const filtered = certs.filter(c => c.provider === activeTab);
			setCertificates(filtered);
			if (filtered.length > 0 && filtered[0]) {
				setSelectedThumbprint(filtered[0].thumbprint);
			} else {
				setSelectedThumbprint("");
			}
		} catch (error) {
			console.error(error);
			showToast("Ошибка при загрузке сертификатов", "error");
		} finally {
			setFetchingCerts(false);
		}
	};

	const handleSign = async () => {
		if (!selectedThumbprint) {
			showToast("Выберите сертификат для подписания", "error");
			return;
		}
		if (activeTab === "rutoken" && !pinCode) {
			showToast("Введите PIN-код устройства", "error");
			return;
		}

		setLoading(true);
		try {
			const certInfo = certificates.find(c => c.thumbprint === selectedThumbprint);
			const deviceId = certInfo?.deviceId;
			// Generating document hash and communicating with crypto provider
			const { signatureBase64, provider } = await signatureService.signData(selectedThumbprint, diaryContent, pinCode, deviceId);
			
			// Submit to API
			const staffToken = localStorage.getItem("dente_staff_token");
			const response = await fetch(`/api/visits/${visitId}/draft/sign`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": staffToken || "",
				},
				body: JSON.stringify({
					patientId,
					signatureBase64,
					thumbprint: selectedThumbprint,
					signatureProvider: provider
				})
			});

			if (!response.ok) {
				throw new Error("Ошибка сохранения ЭЦП на сервере");
			}

			showToast("Документ успешно подписан УКЭП", "success");
			onSigned({ signatureBase64, thumbprint: selectedThumbprint, signatureProvider: provider });
			onClose();
		} catch (error: any) {
			showToast(error.message || "Ошибка подписания", "error");
		} finally {
			setLoading(false);
		}
	};

	

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div 
					className="sign-dialog-overlay" 
					onClick={onClose}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<motion.div 
						className="sign-dialog-content" 
						onClick={e => e.stopPropagation()}
						initial={{ scale: 0.95, opacity: 0, y: 20 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.95, opacity: 0, y: 20 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
					>
				<div className="sign-dialog-header">
					<div className="sign-dialog-title-row">
						<Lock className="sign-dialog-icon" />
						<h2>Подписание медицинской карты</h2>
					</div>
					<button className="sign-dialog-close" onClick={onClose}>&times;</button>
				</div>
				
				<div className="sign-dialog-tabs">
					<button 
						className={`sign-tab ${activeTab === "cryptopro" ? "active" : ""}`}
						onClick={() => setActiveTab("cryptopro")}
					>
						<Cpu size={16} /> Программный (КриптоПро)
					</button>
					<button 
						className={`sign-tab ${activeTab === "rutoken" ? "active" : ""}`}
						onClick={() => setActiveTab("rutoken")}
					>
						<Key size={16} /> Аппаратный (Рутокен)
					</button>
				</div>

				<div className="sign-dialog-body">
					{fetchingCerts ? (
						<div className="sign-loading-state">
							<Loader2 className="spinning-icon" /> Загрузка ключей...
						</div>
					) : certificates.length === 0 ? (
						<div className="sign-empty-state">
							<AlertTriangle size={32} />
							<p>Не найдено доступных {activeTab === "rutoken" ? "аппаратных ключей" : "сертификатов"}.</p>
							<span>Проверьте подключение носителя или плагин браузера.</span>
						</div>
					) : (
						<div className="sign-form">
							<label>Выберите сертификат подписи</label>
							<select 
								value={selectedThumbprint} 
								onChange={(e) => setSelectedThumbprint(e.target.value)}
								className="sign-cert-select"
							>
								{certificates.map(cert => (
									<option key={cert.thumbprint} value={cert.thumbprint}>
										{cert.name} (до {cert.validTo})
									</option>
								))}
							</select>

							{activeTab === "rutoken" && (
								<div className="sign-pin-group">
									<label>PIN-код устройства</label>
									<input 
										type="password" 
										placeholder="Введите PIN..." 
										value={pinCode}
										onChange={e => setPinCode(e.target.value)}
									/>
								</div>
							)}

							<div className="sign-preview-hint">
								<FileCheck2 size={14} /> Подписываемый документ: Дневник приема #{visitId.slice(0,6)}
							</div>
						</div>
					)}
				</div>

				<div className="sign-dialog-footer">
					<button className="btn-secondary" onClick={onClose} disabled={loading}>Отмена</button>
					<button 
						className="btn-primary sign-action-btn" 
						onClick={handleSign} 
						disabled={loading || certificates.length === 0}
					>
						{loading ? <Loader2 className="spinning-icon" size={16} /> : <Lock size={16} />} 
						{loading ? "Подписание..." : "Подписать ЭЦП"}
					</button>
				</div>
								</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}