import { getPersonalCertificates, signBase64WithCertificate, checkCryptoProPlugin } from "../utils/cryptoPro";
import { getRutokenCertificates, signDataWithRutoken, checkRutokenPlugin } from "../utils/rutoken";

export interface CertificateInfo {
	thumbprint: string; // For rutoken, this will be the cert id
	name: string;
	issuer: string;
	validFrom: string;
	validTo: string;
	provider: "cryptopro" | "rutoken";
	deviceId?: number; // Only for Rutoken
}

export class DigitalSignatureService {
	private isCryptoProMockMode: boolean = false;
	private isRutokenMockMode: boolean = false;

	constructor() {
		this.init();
	}

	private async init() {
		// CryptoPro Initialization
		try {
			const cpPlugin = await checkCryptoProPlugin();
			if (!cpPlugin) {
				this.isCryptoProMockMode = true;
				console.warn("[CryptoPro] Plugin not found. Using MOCK mode.");
			}
		} catch (e) {
			this.isCryptoProMockMode = true;
		}

		// Rutoken Initialization
		try {
			const rtPlugin = await checkRutokenPlugin();
			if (!rtPlugin) {
				this.isRutokenMockMode = true;
				console.warn("[Rutoken] Plugin not found. Using MOCK mode.");
			}
		} catch (e) {
			this.isRutokenMockMode = true;
		}
	}

	async getCertificates(): Promise<CertificateInfo[]> {
		let allCerts: CertificateInfo[] = [];

		// CryptoPro Certificates
		if (this.isCryptoProMockMode) {
			allCerts.push(this.getMockCryptoProCertificate());
		} else {
			try {
				const cpCerts = await getPersonalCertificates();
				allCerts.push(
					...cpCerts.map((c) => ({
						thumbprint: c.thumbprint,
						name: c.subjectName,
						issuer: c.issuerName,
						validFrom: c.validFrom,
						validTo: c.validTo,
						provider: "cryptopro" as const,
					}))
				);
			} catch (error) {
				console.error("Failed to fetch CryptoPro certificates:", error);
				allCerts.push(this.getMockCryptoProCertificate());
			}
		}

		// Rutoken Certificates
		if (this.isRutokenMockMode) {
			allCerts.push(this.getMockRutokenCertificate());
		} else {
			try {
				const rtCerts = await getRutokenCertificates();
				allCerts.push(
					...rtCerts.map((c) => ({
						thumbprint: c.id, // We use the ID as the thumbprint reference for Rutoken
						name: c.subjectName,
						issuer: c.issuerName,
						validFrom: c.validFrom,
						validTo: c.validTo,
						provider: "rutoken" as const,
						deviceId: c.deviceId,
					}))
				);
				
				// If no real rutoken devices are connected but the plugin works, 
				// we might still want to add a mock to show the UI works during testing.
				if (rtCerts.length === 0) {
					console.warn("[Rutoken] No devices found. Adding mock certificate.");
					allCerts.push(this.getMockRutokenCertificate());
				}
			} catch (error) {
				console.error("Failed to fetch Rutoken certificates:", error);
				allCerts.push(this.getMockRutokenCertificate());
			}
		}

		return allCerts;
	}

	async signData(thumbprint: string, data: string, pin?: string, deviceId?: number): Promise<{ signatureBase64: string; provider: string }> {
		const isRutoken = thumbprint.includes("RUTOKEN_MOCK") || deviceId !== undefined || (thumbprint.length < 20); // Basic heuristic if deviceId wasn't passed directly but we know it's rutoken
		const provider = isRutoken ? "rutoken" : "cryptopro";

		if (provider === "rutoken") {
			if (this.isRutokenMockMode || thumbprint === "RUTOKEN_MOCK_ID") {
				return this.mockSignData(thumbprint, data, "rutoken");
			}
			if (deviceId === undefined) throw new Error("Device ID is required for Rutoken signing");
			if (!pin) throw new Error("PIN code is required for Rutoken signing");
			
			const signatureBase64 = await signDataWithRutoken(deviceId, thumbprint, data, pin);
			return { signatureBase64, provider: "rutoken" };
		} else {
			if (this.isCryptoProMockMode || thumbprint === "CRYPTOPRO_MOCK_THUMBPRINT") {
				return this.mockSignData(thumbprint, data, "cryptopro");
			}
			
			const base64Data = btoa(unescape(encodeURIComponent(data)));
			const signatureBase64 = await signBase64WithCertificate(base64Data, thumbprint);
			return { signatureBase64, provider: "cryptopro" };
		}
	}

	// --- Mock Implementation Details ---

	private getMockCryptoProCertificate(): CertificateInfo {
		return {
			thumbprint: "CRYPTOPRO_MOCK_THUMBPRINT",
			name: "Иванов Иван Иванович (КриптоПро - Эмулятор)",
			issuer: "ООО УЦ Тензор",
			validFrom: "01.01.2025",
			validTo: "01.01.2026",
			provider: "cryptopro",
		};
	}

	private getMockRutokenCertificate(): CertificateInfo {
		return {
			thumbprint: "RUTOKEN_MOCK_ID",
			name: "Рутокен ЭЦП 3.0 (Аппаратный - Эмулятор)",
			issuer: "АО Актив-Софт",
			validFrom: "10.05.2024",
			validTo: "10.05.2027",
			provider: "rutoken",
			deviceId: 0,
		};
	}

	private async mockSignData(thumbprint: string, data: string, provider: string): Promise<{ signatureBase64: string; provider: string }> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		const mockHash = btoa(unescape(encodeURIComponent(data))).substring(0, 32);
		const signatureBase64 = `MIIB[MOCK_PKCS7_DETACHED_SIGNATURE_${mockHash}_${thumbprint}]==`;
		return { signatureBase64, provider };
	}
}

export const signatureService = new DigitalSignatureService();
