/**
 * cloudBackupEngine.ts — Zero-Knowledge Cloud Backup & 152-ФЗ Storage Engine
 *
 * КРИПТОГРАФИЧЕСКИЙ СТАНДАРТ БЕЗОПАСНОСТИ:
 * 1. Zero-Knowledge: Облако S3 (Selectel / Yandex Cloud) хранит ТОЛЬКО непрозрачные
 *    зашифрованные блобы (.dente.enc). Ни провайдер S3, ни злоумышленник не имеют
 *    ключа и не могут прочитать клинические данные (100% соответствие 152-ФЗ).
 * 2. Мастер-ключ формируется из 12 слов мнемоники (BIP-39), которые владелец
 *    клиники записывает на бумаге и хранит в сейфе.
 * 3. Деривация ключа: scrypt(mnemonic, salt="DENTE:" + ogrn + orgId, N=32768, r=8, p=1).
 * 4. Шифрование: потоковое AES-256-GCM с 96-bit IV и 128-bit Auth Tag. Заголовок
 *    контейнера защищен через AAD (Additional Authenticated Data).
 * 5. Ротация (GFS): хранение 7 ежедневных, 4 еженедельных и 12 ежемесячных копий.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { Readable, Transform, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";

export const DENTE_ZK_MAGIC = "DENTE_ZK_BACKUP_V1\n";
export const DENTE_ZK_VERSION = 1;
export const GCM_IV_LENGTH = 12;
export const GCM_TAG_LENGTH = 16;
export const SCRYPT_KEY_LENGTH = 32;
export const SCRYPT_N = 32768;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;

export type CloudBackupType = "daily" | "weekly" | "monthly";

export interface CloudBackupMetadata {
	magic: "DENTE_ZK_BACKUP_V1";
	version: number;
	backupId: string;
	orgId: string;
	ogrn: string;
	backupType: CloudBackupType;
	createdAt: string;
	ivHex: string;
	algorithm: "aes-256-gcm";
	kdf: {
		algorithm: "scrypt";
		salt: string;
		n: number;
		r: number;
		p: number;
	};
	dumpStats?: {
		copyBlocks?: number | undefined;
		dataRows?: number | undefined;
		populatedTables?: number | undefined;
		uncompressedSizeBytes?: number | undefined;
	} | undefined;
	meta?: Record<string, unknown> | undefined;
}

export interface CloudBackupObjectInfo {
	key: string;
	size: number;
	lastModified: Date;
	backupType?: CloudBackupType;
	backupId?: string;
}

export interface IS3StorageAdapter {
	upload(key: string, data: Buffer | Readable, contentType?: string): Promise<{ key: string; size: number }>;
	download(key: string): Promise<Readable>;
	downloadBuffer(key: string): Promise<Buffer>;
	list(prefix: string): Promise<CloudBackupObjectInfo[]>;
	delete(key: string): Promise<void>;
	exists(key: string): Promise<boolean>;
}

export interface S3StorageConfig {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	forcePathStyle?: boolean;
}

// -----------------------------------------------------------------------------
// BIP-39 WORDLIST (2048 WORDS, 64 PER LINE = 32 LINES)
// -----------------------------------------------------------------------------
const BIP39_CHUNKS: readonly string[] = [
	"abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among",
	"amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado",
	"avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood",
	"blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable",
	"cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child",
	"chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper",
	"copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn",
	"day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide",
	"divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator",
	"elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit",
	"exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness",
	"fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment",
	"gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun",
	"gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband",
	"hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel",
	"job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend",
	"length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin",
	"marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning",
	"mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey",
	"object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper",
	"parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony",
	"pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz",
	"quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire",
	"retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say",
	"scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side",
	"siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup",
	"source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject",
	"submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that",
	"theme then theory there they thing this thought three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree",
	"trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful",
	"useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave",
	"way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo",
];

export const BIP39_WORDLIST: readonly string[] = Object.freeze(
	BIP39_CHUNKS.join(" ").trim().split(/\s+/),
);

const BIP39_INDEX_MAP: ReadonlyMap<string, number> = new Map(
	BIP39_WORDLIST.map((word, index) => [word, index]),
);

export function generateMnemonic(entropyBuffer?: Buffer): string {
	const entropy = entropyBuffer ?? crypto.randomBytes(16);
	if (entropy.length !== 16) {
		throw new Error(`BIP-39 12-word mnemonic requires 16 bytes entropy, got ${entropy.length}`);
	}
	const checksumByte = crypto.createHash("sha256").update(entropy).digest()[0] ?? 0;
	let bitString = "";
	for (let i = 0; i < entropy.length; i++) {
		bitString += (entropy[i] ?? 0).toString(2).padStart(8, "0");
	}
	bitString += checksumByte.toString(2).padStart(8, "0").slice(0, 4);

	const words: string[] = [];
	for (let i = 0; i < 12; i++) {
		const slice = bitString.slice(i * 11, (i + 1) * 11);
		const index = Number.parseInt(slice, 2);
		const word = BIP39_WORDLIST[index];
		if (!word) throw new Error(`Invalid index derived for word ${i}: ${index}`);
		words.push(word);
	}
	return words.join(" ");
}

export function validateMnemonic(mnemonic: string): boolean {
	if (!mnemonic || typeof mnemonic !== "string") return false;
	const words = mnemonic.trim().toLowerCase().split(/\s+/);
	if (words.length !== 12) return false;

	let bitString = "";
	for (const word of words) {
		const index = BIP39_INDEX_MAP.get(word);
		if (index === undefined) return false;
		bitString += index.toString(2).padStart(11, "0");
	}
	const entropyBits = bitString.slice(0, 128);
	const checksumBits = bitString.slice(128);
	const entropy = Buffer.alloc(16);
	for (let i = 0; i < 16; i++) {
		entropy[i] = Number.parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
	}
	const hashByte = crypto.createHash("sha256").update(entropy).digest()[0] ?? 0;
	const expectedChecksumBits = hashByte.toString(2).padStart(8, "0").slice(0, 4);
	return checksumBits === expectedChecksumBits;
}

export function mnemonicToEntropy(mnemonic: string): Buffer {
	if (!validateMnemonic(mnemonic)) {
		throw new Error("Invalid BIP-39 mnemonic: checksum mismatch or unrecognized word");
	}
	const words = mnemonic.trim().toLowerCase().split(/\s+/);
	let bitString = "";
	for (const word of words) {
		bitString += (BIP39_INDEX_MAP.get(word) ?? 0).toString(2).padStart(11, "0");
	}
	const entropy = Buffer.alloc(16);
	for (let i = 0; i < 16; i++) {
		entropy[i] = Number.parseInt(bitString.slice(i * 8, (i + 1) * 8), 2);
	}
	return entropy;
}

// -----------------------------------------------------------------------------
// MASTER KEY DERIVATION (SCRYPT)
// -----------------------------------------------------------------------------
export function buildClinicSalt(ogrn: string, orgId: string): string {
	const cleanOgrn = (ogrn || "").trim();
	const cleanOrgId = (orgId || "").trim();
	if (!cleanOgrn && !cleanOrgId) {
		throw new Error("Clinic OGRN and Organization ID are required to compute Zero-Knowledge salt");
	}
	return `DENTE:${cleanOgrn}${cleanOrgId}`;
}

export async function deriveMasterKey(mnemonic: string, ogrn: string, orgId: string): Promise<Buffer> {
	if (!validateMnemonic(mnemonic)) {
		throw new Error("Cannot derive master key: BIP-39 mnemonic is invalid or checksum failed");
	}
	const salt = buildClinicSalt(ogrn, orgId);
	const normalizedMnemonic = mnemonic.trim().toLowerCase();
	return new Promise((resolve, reject) => {
		crypto.scrypt(
			normalizedMnemonic,
			salt,
			SCRYPT_KEY_LENGTH,
			{ N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 },
			(err, derivedKey) => {
				if (err) reject(err);
				else resolve(derivedKey);
			},
		);
	});
}

export function deriveMasterKeySync(mnemonic: string, ogrn: string, orgId: string): Buffer {
	if (!validateMnemonic(mnemonic)) {
		throw new Error("Cannot derive master key: BIP-39 mnemonic is invalid or checksum failed");
	}
	const salt = buildClinicSalt(ogrn, orgId);
	const normalizedMnemonic = mnemonic.trim().toLowerCase();
	return crypto.scryptSync(normalizedMnemonic, salt, SCRYPT_KEY_LENGTH, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P,
		maxmem: 64 * 1024 * 1024,
	});
}

// -----------------------------------------------------------------------------
// STREAMING AES-256-GCM CIPHER & DECIPHER
// -----------------------------------------------------------------------------
export class GcmStreamCipher extends Transform {
	private cipher: crypto.CipherGCM;

	constructor(key: Buffer, iv: Buffer, aad?: Buffer) {
		super();
		this.cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
		if (aad && aad.length > 0) this.cipher.setAAD(aad);
	}

	override _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void {
		try {
			const out = this.cipher.update(chunk);
			if (out.length > 0) this.push(out);
			done();
		} catch (error) {
			done(error as Error);
		}
	}

	override _flush(done: TransformCallback): void {
		try {
			const finalChunk = this.cipher.final();
			if (finalChunk.length > 0) this.push(finalChunk);
			this.push(this.cipher.getAuthTag());
			done();
		} catch (error) {
			done(error as Error);
		}
	}
}

export class GcmStreamDecipher extends Transform {
	private decipher: crypto.DecipherGCM;
	private tail = Buffer.alloc(0);

	constructor(key: Buffer, iv: Buffer, aad?: Buffer) {
		super();
		this.decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
		if (aad && aad.length > 0) this.decipher.setAAD(aad);
	}

	override _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void {
		try {
			this.tail = Buffer.concat([this.tail, chunk]);
			if (this.tail.length > GCM_TAG_LENGTH) {
				const toProcess = this.tail.subarray(0, this.tail.length - GCM_TAG_LENGTH);
				this.tail = this.tail.subarray(this.tail.length - GCM_TAG_LENGTH);
				const out = this.decipher.update(toProcess);
				if (out && out.length > 0) this.push(out);
			}
			done();
		} catch (error) {
			done(error as Error);
		}
	}

	override _flush(done: TransformCallback): void {
		try {
			if (this.tail.length !== GCM_TAG_LENGTH) {
				return done(new Error(`Invalid GCM payload: expected ${GCM_TAG_LENGTH} bytes tag, got ${this.tail.length}`));
			}
			this.decipher.setAuthTag(this.tail);
			const finalBytes = this.decipher.final();
			if (finalBytes && finalBytes.length > 0) this.push(finalBytes);
			done();
		} catch (error) {
			done(error as Error);
		}
	}
}

// -----------------------------------------------------------------------------
// CONTAINER HEADER SERIALIZATION & PARSING
// -----------------------------------------------------------------------------
export function serializeContainerHeader(metadata: CloudBackupMetadata): Buffer {
	const jsonBuf = Buffer.from(JSON.stringify(metadata), "utf8");
	const magicBuf = Buffer.from(DENTE_ZK_MAGIC, "utf8");
	const lengthBuf = Buffer.alloc(4);
	lengthBuf.writeUInt32BE(jsonBuf.length, 0);
	return Buffer.concat([magicBuf, lengthBuf, jsonBuf]);
}

export function parseContainerHeader(buffer: Buffer): { header: CloudBackupMetadata; headerBuffer: Buffer; offset: number } {
	const magicBuf = Buffer.from(DENTE_ZK_MAGIC, "utf8");
	if (buffer.length < magicBuf.length + 4) {
		throw new Error("Buffer too short to contain DENTE Zero-Knowledge backup header");
	}
	const magic = buffer.subarray(0, magicBuf.length).toString("utf8");
	if (magic !== DENTE_ZK_MAGIC) {
		throw new Error(`Invalid backup magic header: expected '${DENTE_ZK_MAGIC.trim()}', got '${magic.trim()}'`);
	}
	const jsonLength = buffer.readUInt32BE(magicBuf.length);
	const offset = magicBuf.length + 4 + jsonLength;
	if (buffer.length < offset) {
		throw new Error(`Incomplete backup header: expected ${offset} bytes, available ${buffer.length}`);
	}
	const headerBuffer = buffer.subarray(0, offset);
	const jsonBytes = buffer.subarray(magicBuf.length + 4, offset);
	const header = JSON.parse(jsonBytes.toString("utf8")) as CloudBackupMetadata;
	return { header, headerBuffer, offset };
}

// -----------------------------------------------------------------------------
// AWS SIGV4 UTILITIES (NATIVE ZERO-DEPENDENCY S3)
// -----------------------------------------------------------------------------
function hmacSha256(key: Buffer | string, data: string): Buffer {
	return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string | Buffer): string {
	return crypto.createHash("sha256").update(data).digest("hex");
}

function getSigV4Key(secret: string, dateStamp: string, region: string, service: string): Buffer {
	const kDate = hmacSha256(`AWS4${secret}`, dateStamp);
	const kRegion = crypto.createHmac("sha256", kDate).update(region, "utf8").digest();
	const kService = crypto.createHmac("sha256", kRegion).update(service, "utf8").digest();
	return crypto.createHmac("sha256", kService).update("aws4_request", "utf8").digest();
}

export class NativeS3Adapter implements IS3StorageAdapter {
	constructor(private readonly config: S3StorageConfig) {}

	private getEndpointUrl(objectKey = ""): URL {
		const base = this.config.endpoint.endsWith("/") ? this.config.endpoint : `${this.config.endpoint}/`;
		const cleanKey = objectKey.startsWith("/") ? objectKey.slice(1) : objectKey;
		if (this.config.forcePathStyle) {
			return new URL(`${this.config.bucket}/${cleanKey}`, base);
		}
		const url = new URL(base);
		url.hostname = `${this.config.bucket}.${url.hostname}`;
		url.pathname = `/${cleanKey}`;
		return url;
	}

	private signRequest(method: string, url: URL, payloadSha = "UNSIGNED-PAYLOAD"): Record<string, string> {
		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
		const dateStamp = amzDate.slice(0, 8);
		const host = url.host;

		const headers: Record<string, string> = {
			host,
			"x-amz-date": amzDate,
			"x-amz-content-sha256": payloadSha,
		};

		const signedHeaders = Object.keys(headers).sort().join(";");
		const canonicalHeaders = Object.keys(headers)
			.sort()
			.map((h) => `${h.toLowerCase()}:${headers[h]?.trim()}\n`)
			.join("");

		const canonicalRequest = [
			method,
			url.pathname,
			url.search.slice(1),
			canonicalHeaders,
			signedHeaders,
			payloadSha,
		].join("\n");

		const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
		const stringToSign = [
			"AWS4-HMAC-SHA256",
			amzDate,
			credentialScope,
			sha256Hex(canonicalRequest),
		].join("\n");

		const signingKey = getSigV4Key(this.config.secretAccessKey, dateStamp, this.config.region, "s3");
		const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

		headers.Authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
		return headers;
	}

	async upload(key: string, data: Buffer | Readable, contentType = "application/octet-stream"): Promise<{ key: string; size: number }> {
		const url = this.getEndpointUrl(key);
		const payloadBuf = Buffer.isBuffer(data) ? data : await streamToBuffer(data);
		const payloadHash = sha256Hex(payloadBuf);
		const signedHeaders = this.signRequest("PUT", url, payloadHash);
		signedHeaders["content-type"] = contentType;
		signedHeaders["content-length"] = String(payloadBuf.length);

		const response = await fetch(url.toString(), {
			method: "PUT",
			headers: signedHeaders,
			body: new Uint8Array(payloadBuf),
		});

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`S3 upload failed HTTP ${response.status} for ${key}: ${errText}`);
		}
		return { key, size: payloadBuf.length };
	}

	async download(key: string): Promise<Readable> {
		const buffer = await this.downloadBuffer(key);
		return Readable.from(buffer);
	}

	async downloadBuffer(key: string): Promise<Buffer> {
		const url = this.getEndpointUrl(key);
		const signedHeaders = this.signRequest("GET", url, "UNSIGNED-PAYLOAD");
		const response = await fetch(url.toString(), { method: "GET", headers: signedHeaders });
		if (!response.ok) {
			throw new Error(`S3 download failed HTTP ${response.status} for ${key}`);
		}
		const arrayBuf = await response.arrayBuffer();
		return Buffer.from(arrayBuf);
	}

	async list(prefix: string): Promise<CloudBackupObjectInfo[]> {
		const url = this.getEndpointUrl();
		url.searchParams.set("list-type", "2");
		if (prefix) url.searchParams.set("prefix", prefix);

		const signedHeaders = this.signRequest("GET", url, "UNSIGNED-PAYLOAD");
		const response = await fetch(url.toString(), { method: "GET", headers: signedHeaders });
		if (!response.ok) {
			throw new Error(`S3 list failed HTTP ${response.status} for prefix ${prefix}`);
		}
		const xml = await response.text();
		return parseS3ListXml(xml);
	}

	async delete(key: string): Promise<void> {
		const url = this.getEndpointUrl(key);
		const signedHeaders = this.signRequest("DELETE", url, "UNSIGNED-PAYLOAD");
		const response = await fetch(url.toString(), { method: "DELETE", headers: signedHeaders });
		if (!response.ok && response.status !== 404) {
			throw new Error(`S3 delete failed HTTP ${response.status} for ${key}`);
		}
	}

	async exists(key: string): Promise<boolean> {
		const url = this.getEndpointUrl(key);
		const signedHeaders = this.signRequest("HEAD", url, "UNSIGNED-PAYLOAD");
		const response = await fetch(url.toString(), { method: "HEAD", headers: signedHeaders });
		return response.ok;
	}
}

function parseS3ListXml(xml: string): CloudBackupObjectInfo[] {
	const objects: CloudBackupObjectInfo[] = [];
	const itemRegex = /<Contents>[\s\S]*?<Key>(.*?)<\/Key>[\s\S]*?<LastModified>(.*?)<\/LastModified>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g;
	let match = itemRegex.exec(xml);
	while (match !== null) {
		const key = match[1] ?? "";
		const lastModified = new Date(match[2] ?? "");
		const size = Number.parseInt(match[3] ?? "0", 10);
		const typeMatch = /dente_(daily|weekly|monthly)_/i.exec(key);
		const backupType = (typeMatch?.[1] as CloudBackupType) ?? undefined;
		objects.push({ key, lastModified, size, backupType });
		match = itemRegex.exec(xml);
	}
	return objects;
}

// -----------------------------------------------------------------------------
// LOCAL MOCK S3 ADAPTER (OFFLINE, TESTS & DISASTER FALLBACK)
// -----------------------------------------------------------------------------
export class LocalMockS3Adapter implements IS3StorageAdapter {
	constructor(public readonly rootDir: string) {
		fs.mkdirSync(rootDir, { recursive: true });
	}

	private resolvePath(key: string): string {
		const safeKey = key.replace(/^[/\\]+/, "").replace(/[\\/]/g, path.sep);
		return path.join(this.rootDir, safeKey);
	}

	async upload(key: string, data: Buffer | Readable): Promise<{ key: string; size: number }> {
		const target = this.resolvePath(key);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		if (Buffer.isBuffer(data)) {
			await fsPromises.writeFile(target, data);
			return { key, size: data.length };
		}
		const writeStream = fs.createWriteStream(target);
		await pipeline(data, writeStream);
		const stat = await fsPromises.stat(target);
		return { key, size: stat.size };
	}

	async download(key: string): Promise<Readable> {
		const target = this.resolvePath(key);
		if (!fs.existsSync(target)) throw new Error(`Object not found: ${key}`);
		return fs.createReadStream(target);
	}

	async downloadBuffer(key: string): Promise<Buffer> {
		const target = this.resolvePath(key);
		if (!fs.existsSync(target)) throw new Error(`Object not found: ${key}`);
		return fsPromises.readFile(target);
	}

	async list(prefix: string): Promise<CloudBackupObjectInfo[]> {
		const results: CloudBackupObjectInfo[] = [];
		const scanDir = async (dir: string) => {
			if (!fs.existsSync(dir)) return;
			const entries = await fsPromises.readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					await scanDir(full);
				} else {
					const rel = path.relative(this.rootDir, full).replace(/\\/g, "/");
					if (!prefix || rel.startsWith(prefix)) {
						const st = await fsPromises.stat(full);
						const typeMatch = /dente_(daily|weekly|monthly)_/i.exec(rel);
						const backupType = (typeMatch?.[1] as CloudBackupType) ?? undefined;
						results.push({ key: rel, lastModified: st.mtime, size: st.size, backupType });
					}
				}
			}
		};
		await scanDir(this.rootDir);
		return results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
	}

	async delete(key: string): Promise<void> {
		const target = this.resolvePath(key);
		if (fs.existsSync(target)) await fsPromises.unlink(target);
	}

	async exists(key: string): Promise<boolean> {
		return fs.existsSync(this.resolvePath(key));
	}
}

export function resolveS3Storage(config?: Partial<S3StorageConfig>): IS3StorageAdapter {
	const endpoint = config?.endpoint || process.env.S3_ENDPOINT || process.env.SELECTEL_S3_ENDPOINT;
	const bucket = config?.bucket || process.env.S3_BUCKET || process.env.DENTE_CLOUD_BACKUP_BUCKET;
	const accessKeyId = config?.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = config?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
	const region = config?.region || process.env.S3_REGION || "ru-1";

	if (endpoint && bucket && accessKeyId && secretAccessKey) {
		return new NativeS3Adapter({
			endpoint,
			bucket,
			accessKeyId,
			secretAccessKey,
			region,
			forcePathStyle: config?.forcePathStyle ?? true,
		});
	}
	const fallbackDir = process.env.DENTE_CLOUD_LOCAL_VAULT || path.resolve(process.cwd(), ".data/cloud-vault");
	return new LocalMockS3Adapter(fallbackDir);
}

// -----------------------------------------------------------------------------
// GFS ROTATION ENGINE (7 DAILY, 4 WEEKLY, 12 MONTHLY)
// -----------------------------------------------------------------------------
export const GFS_RETENTION_LIMITS: Record<CloudBackupType, number> = {
	daily: 7,
	weekly: 4,
	monthly: 12,
};

export interface RotationResult {
	orgId: string;
	retained: string[];
	deleted: string[];
}

export async function rotateCloudBackups(storage: IS3StorageAdapter, orgId: string): Promise<RotationResult> {
	const prefix = `backups/${orgId}/`;
	const allObjects = await storage.list(prefix);
	const grouped: Record<CloudBackupType, CloudBackupObjectInfo[]> = { daily: [], weekly: [], monthly: [] };

	for (const obj of allObjects) {
		let type: CloudBackupType = "daily";
		if (obj.key.includes("/monthly/") || obj.backupType === "monthly") type = "monthly";
		else if (obj.key.includes("/weekly/") || obj.backupType === "weekly") type = "weekly";
		grouped[type].push(obj);
	}

	const retained: string[] = [];
	const deleted: string[] = [];

	for (const [typeKey, list] of Object.entries(grouped) as [CloudBackupType, CloudBackupObjectInfo[]][]) {
		list.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
		const maxKeep = GFS_RETENTION_LIMITS[typeKey];
		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			if (!item) continue;
			if (i < maxKeep) {
				retained.push(item.key);
			} else {
				await storage.delete(item.key);
				deleted.push(item.key);
			}
		}
	}
	return { orgId, retained, deleted };
}

// -----------------------------------------------------------------------------
// HIGH-LEVEL ZERO-KNOWLEDGE BACKUP & RESTORE PIPELINE
// -----------------------------------------------------------------------------
export interface CreateCloudBackupOptions {
	mnemonic: string;
	orgId: string;
	ogrn: string;
	payload: Buffer | Readable;
	backupType?: CloudBackupType | undefined;
	storage?: IS3StorageAdapter | undefined;
	dumpStats?: CloudBackupMetadata["dumpStats"] | undefined;
	meta?: Record<string, unknown> | undefined;
}

export interface CreateCloudBackupResult {
	backupId: string;
	key: string;
	size: number;
	header: CloudBackupMetadata;
	rotation: RotationResult;
}

export async function createCloudBackup(options: CreateCloudBackupOptions): Promise<CreateCloudBackupResult> {
	const { mnemonic, orgId, ogrn, payload } = options;
	const masterKey = await deriveMasterKey(mnemonic, ogrn, orgId);
	const backupType = options.backupType ?? resolveBackupTypeFromDate(new Date());
	const iv = crypto.randomBytes(GCM_IV_LENGTH);
	const nowIso = new Date().toISOString();
	const backupId = `dente_${backupType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
	const storage = options.storage ?? resolveS3Storage();

	const metadata: CloudBackupMetadata = {
		magic: "DENTE_ZK_BACKUP_V1",
		version: DENTE_ZK_VERSION,
		backupId,
		orgId,
		ogrn,
		backupType,
		createdAt: nowIso,
		ivHex: iv.toString("hex"),
		algorithm: "aes-256-gcm",
		kdf: {
			algorithm: "scrypt",
			salt: buildClinicSalt(ogrn, orgId),
			n: SCRYPT_N,
			r: SCRYPT_R,
			p: SCRYPT_P,
		},
		...(options.dumpStats !== undefined ? { dumpStats: options.dumpStats } : {}),
		...(options.meta !== undefined ? { meta: options.meta } : {}),
	};

	const headerBuf = serializeContainerHeader(metadata);
	const cipher = new GcmStreamCipher(masterKey, iv, headerBuf);

	const inputStream = Buffer.isBuffer(payload) ? Readable.from(payload) : payload;
	const encryptedChunks: Buffer[] = [headerBuf];

	cipher.on("data", (chunk: Buffer) => encryptedChunks.push(chunk));
	await pipeline(inputStream, cipher);

	const finalEncryptedBlob = Buffer.concat(encryptedChunks);
	const s3Key = `backups/${orgId}/${backupType}/${backupId}.dente.enc`;

	const uploadResult = await storage.upload(s3Key, finalEncryptedBlob, "application/octet-stream");
	const rotation = await rotateCloudBackups(storage, orgId);

	return {
		backupId,
		key: uploadResult.key,
		size: uploadResult.size,
		header: metadata,
		rotation,
	};
}

export interface RestoreCloudBackupOptions {
	mnemonic: string;
	orgId?: string | undefined;
	ogrn?: string | undefined;
	key?: string | undefined;
	backupBuffer?: Buffer | undefined;
	storage?: IS3StorageAdapter | undefined;
}

export interface RestoreCloudBackupResult {
	header: CloudBackupMetadata;
	plaintext: Buffer;
}

export async function restoreCloudBackup(options: RestoreCloudBackupOptions): Promise<RestoreCloudBackupResult> {
	const storage = options.storage ?? resolveS3Storage();
	let blobBuffer = options.backupBuffer;
	if (!blobBuffer) {
		let targetKey = options.key;
		if (!targetKey) {
			if (!options.orgId) throw new Error("Either backupBuffer, key, or orgId must be provided to restore backup");
			const prefix = `backups/${options.orgId}/`;
			const list = await storage.list(prefix);
			if (list.length === 0) throw new Error(`No backups found in cloud storage for organization ${options.orgId}`);
			list.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
			targetKey = list[0]?.key;
		}
		if (!targetKey) throw new Error("Could not resolve backup key in cloud storage");
		blobBuffer = await storage.downloadBuffer(targetKey);
	}

	const { header, headerBuffer, offset } = parseContainerHeader(blobBuffer);
	const orgId = options.orgId || header.orgId;
	const ogrn = options.ogrn || header.ogrn;
	const masterKey = await deriveMasterKey(options.mnemonic, ogrn, orgId);
	const iv = Buffer.from(header.ivHex, "hex");

	const ciphertextWithTag = blobBuffer.subarray(offset);
	const decipher = new GcmStreamDecipher(masterKey, iv, headerBuffer);
	const chunks: Buffer[] = [];
	decipher.on("data", (c: Buffer) => chunks.push(c));

	await pipeline(Readable.from(ciphertextWithTag), decipher);
	return { header, plaintext: Buffer.concat(chunks) };
}

export function resolveBackupTypeFromDate(date: Date): CloudBackupType {
	if (date.getDate() === 1) return "monthly";
	if (date.getDay() === 0) return "weekly";
	return "daily";
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}
