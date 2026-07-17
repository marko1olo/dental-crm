import { getUserCertificates, createDetachedSignature, isValidSystemSetup } from "crypto-pro";

export interface CertificateInfo {
	thumbprint: string;
	name: string;
	issuer: string;
	validFrom: string;
	validTo: string;
	provider: "cryptopro" | "rutoken";
}

export class DigitalSignatureService {
	private isMockMode: boolean = false;

	constructor() {
		this.init();
	}

	private async init() {
		try {
			const isValid = await isValidSystemSetup();
			if (!isValid) {
				this.isMockMode = true;
				console.warn("[CryptoPro] System setup invalid. Using MOCK mode.");
			}
		} catch (e) {
			this.isMockMode = true;
			console.warn("[CryptoPro] Plugin not found. Using MOCK mode.", e);
		}
	}

	async getCertificates(): Promise<CertificateInfo[]> {
		if (this.isMockMode) {
			return this.getMockCertificates();
		}

		try {
			const certs = await getUserCertificates();
			return certs.map((cert) => ({
				thumbprint: cert.thumbprint,
				name: cert.subjectName || cert.name,
				issuer: cert.issuerName,
				validFrom: cert.validFrom,
				validTo: cert.validTo,
				provider: "cryptopro",
			}));
		} catch (error) {
			console.error("Failed to fetch real certificates:", error);
			// Fallback to mock if real fetch fails
			return this.getMockCertificates();
		}
	}

	async signData(thumbprint: string, data: string, pin?: string): Promise<{ signatureBase64: string; provider: string }> {
		if (this.isMockMode) {
			return this.mockSignData(thumbprint, data);
		}

		try {
			// Real Detached Signature using GOST
			const signatureBase64 = await createDetachedSignature(thumbprint, data);
			return {
				signatureBase64,
				provider: "cryptopro",
			};
		} catch (error) {
			console.error("Failed to sign data:", error);
			throw new Error("Failed to sign data using CryptoPro plugin: " + (error as Error).message);
		}
	}

	// --- Mock Implementation Details ---

	private async getMockCertificates(): Promise<CertificateInfo[]> {
		return [
			{
				thumbprint: "F2C99D8B...[MOCK]...A4E88",
				name: "Иванов Иван Иванович (Врач-стоматолог)",
				issuer: "ООО УЦ Тензор",
				validFrom: "2025-01-01",
				validTo: "2026-01-01",
				provider: "cryptopro",
			},
			{
				thumbprint: "D5E11F4A...[MOCK]...C2B99",
				name: "Рутокен ЭЦП 3.0 (Аппаратный)",
				issuer: "АО Актив-Софт",
				validFrom: "2024-05-10",
				validTo: "2027-05-10",
				provider: "rutoken",
			},
		];
	}

	private async mockSignData(thumbprint: string, data: string): Promise<{ signatureBase64: string; provider: string }> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		
		const mockHash = btoa(unescape(encodeURIComponent(data))).substring(0, 32);
		const signatureBase64 = `MIIB[MOCK_PKCS7_DETACHED_SIGNATURE_${mockHash}_${thumbprint}]==`;
		
		const provider = thumbprint.includes("D5E11F4A") ? "rutoken" : "cryptopro";

		return {
			signatureBase64,
			provider,
		};
	}
}

export const signatureService = new DigitalSignatureService();
