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
	private isCryptoProAvailable: boolean = false;
	private isRutokenAvailable: boolean = false;

	constructor() {
		this.init();
	}

	private async init() {
		// CryptoPro Initialization
		try {
			this.isCryptoProAvailable = await checkCryptoProPlugin();
			if (!this.isCryptoProAvailable) {
				console.warn("[CryptoPro] Plugin not found or not working.");
			}
		} catch (e) {
			this.isCryptoProAvailable = false;
		}

		// Rutoken Initialization
		try {
			this.isRutokenAvailable = await checkRutokenPlugin();
			if (!this.isRutokenAvailable) {
				console.warn("[Rutoken] Plugin not found or not working.");
			}
		} catch (e) {
			this.isRutokenAvailable = false;
		}
	}

	async getCertificates(): Promise<CertificateInfo[]> {
		let allCerts: CertificateInfo[] = [];

		// CryptoPro Certificates
		if (this.isCryptoProAvailable) {
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
			}
		}

		// Rutoken Certificates
		if (this.isRutokenAvailable) {
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
			} catch (error) {
				console.error("Failed to fetch Rutoken certificates:", error);
			}
		}

		return allCerts;
	}

	async signData(thumbprint: string, data: string, pin?: string, deviceId?: number): Promise<{ signatureBase64: string; provider: string }> {
		const isRutoken = deviceId !== undefined || (thumbprint.length < 20); // Basic heuristic if deviceId wasn't passed directly but we know it's rutoken
		const provider = isRutoken ? "rutoken" : "cryptopro";

		if (provider === "rutoken") {
			if (!this.isRutokenAvailable) throw new Error("Rutoken plugin is not available.");
			if (deviceId === undefined) throw new Error("Device ID is required for Rutoken signing");
			if (!pin) throw new Error("PIN code is required for Rutoken signing");
			
			const signatureBase64 = await signDataWithRutoken(deviceId, thumbprint, data, pin);
			return { signatureBase64, provider: "rutoken" };
		} else {
			if (!this.isCryptoProAvailable) throw new Error("CryptoPro plugin is not available.");
			
			const base64Data = btoa(unescape(encodeURIComponent(data)));
			const signatureBase64 = await signBase64WithCertificate(base64Data, thumbprint);
			return { signatureBase64, provider: "cryptopro" };
		}
	}
}

export const signatureService = new DigitalSignatureService();
