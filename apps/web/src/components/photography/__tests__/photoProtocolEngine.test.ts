/**
 * photoProtocolEngine.test.ts — Unit Test Suite for Clinical Dental Photo Protocol & Before/After Engine (@dental/web)
 *
 * Verifies:
 * 1. 8 Standard Clinical Photo Protocol Angles:
 *    - 1. Лицо в покое (анфас)
 *    - 2. Улыбка (анфас)
 *    - 3. Профиль (справа/слева)
 *    - 4. Окклюзия фронтальная с ретрактором
 *    - 5. Окклюзия боковая правая с зеркалом
 *    - 6. Окклюзия боковая левая с зеркалом
 *    - 7. Верхний зубной ряд (окклюзионный вид с зеркалом)
 *    - 8. Нижний зубной ряд (окклюзионный вид с зеркалом)
 * 2. Protocol Completeness Scoring & Gap Detection.
 * 3. Interactive Before/After Wiper Slider Math:
 *    - Split polygon clip-paths (vertical/horizontal)
 *    - Pointer tracking across container rects
 *    - Mouse wheel deltas & keyboard navigation
 *    - 2D similarity transform & alignment styles
 * 4. 1-Click Export Engine (PNG & Printable PDF):
 *    - Standard collage dimensions (16:9 HD/4K, A4 Landscape/Portrait)
 *    - Printable clinical presentation HTML generator
 *    - Legal watermark & patient metadata formatting
 *    - XSS injection prevention via HTML entity escaping
 *    - Zero cartoon emojis (Mandate 8d pt 7)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	STANDARD_8_CLINICAL_ANGLES,
	STANDARD_8_ANGLES_MAP,
	getStandard8Angle,
	calculateProtocolCompleteness,
	calculateSplitClipPath,
	calculatePointerPercent,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	calculateImageTransformStyle,
	calculateSimilarityTransform,
	calculateCollageDimensions,
	generateCollageWatermarkText,
	generateBeforeAfterPrintableHtml,
} from '../photoProtocolEngine';

describe('Clinical Dental Photo Protocol & Before/After Engine (@dental/web)', () => {
	describe('1. Standard 8 Dental Photo Protocol Angles Registry', () => {
		it('contains exactly 8 standardized clinical angles (3 extraoral + 5 intraoral)', () => {
			assert.equal(STANDARD_8_CLINICAL_ANGLES.length, 8);

			const extraoral = STANDARD_8_CLINICAL_ANGLES.filter((a) => a.category === 'extraoral');
			const intraoral = STANDARD_8_CLINICAL_ANGLES.filter((a) => a.category === 'intraoral');

			assert.equal(extraoral.length, 3, 'Must contain exactly 3 extraoral angles (покой, улыбка, профиль)');
			assert.equal(intraoral.length, 5, 'Must contain exactly 5 intraoral angles (фронт, боковые, в/ч, н/ч)');
		});

		it('maintains strict sequential order 1..8 and valid Russian medical titles', () => {
			const expectedTitles = [
				'Лицо в покое (анфас)',
				'Улыбка (анфас)',
				'Профиль (справа/слева)',
				'Окклюзия фронтальная с ретрактором',
				'Окклюзия боковая правая с зеркалом',
				'Окклюзия боковая левая с зеркалом',
				'Верхний зубной ряд (окклюзионный вид с зеркалом)',
				'Нижний зубной ряд (окклюзионный вид с зеркалом)',
			];

			STANDARD_8_CLINICAL_ANGLES.forEach((angle, idx) => {
				assert.equal(angle.sequenceNumber, idx + 1, `Angle sequence must be ${idx + 1}`);
				assert.equal(angle.titleRu, expectedTitles[idx], `Angle ${idx + 1} title mismatch`);
				assert.ok(angle.shortLabelRu.length > 0);
				assert.ok(angle.descriptionRu.length > 10);
				assert.ok(angle.guideInstructionsRu.length > 10);
				assert.ok(angle.silhouetteSvgPath.length > 0);
				assert.ok(angle.clinicalCheckpointsRu.length >= 3);
			});
		});

		it('enforces statutory retractor and mirror clinical requirements', () => {
			// Intraoral angles requiring both mirror and retractor
			const rightBuccal = getStandard8Angle('intraoral_right_buccal');
			assert.ok(rightBuccal);
			assert.equal(rightBuccal.requiresMirror, true);
			assert.equal(rightBuccal.requiresRetractor, true);

			const leftBuccal = getStandard8Angle('intraoral_left_buccal');
			assert.ok(leftBuccal);
			assert.equal(leftBuccal.requiresMirror, true);
			assert.equal(leftBuccal.requiresRetractor, true);

			const maxOcclusal = getStandard8Angle('intraoral_maxillary_occlusal');
			assert.ok(maxOcclusal);
			assert.equal(maxOcclusal.requiresMirror, true);
			assert.equal(maxOcclusal.requiresRetractor, true);

			const mandOcclusal = getStandard8Angle('intraoral_mandibular_occlusal');
			assert.ok(mandOcclusal);
			assert.equal(mandOcclusal.requiresMirror, true);
			assert.equal(mandOcclusal.requiresRetractor, true);

			// Frontal occlusion requires retractor only (no mirror)
			const frontalOcclusion = getStandard8Angle('intraoral_frontal_occlusion');
			assert.ok(frontalOcclusion);
			assert.equal(frontalOcclusion.requiresMirror, false);
			assert.equal(frontalOcclusion.requiresRetractor, true);

			// Extraoral angles require neither mirror nor retractor
			const restFace = getStandard8Angle('portrait_rest');
			assert.ok(restFace);
			assert.equal(restFace.requiresMirror, false);
			assert.equal(restFace.requiresRetractor, false);

			const smileFace = getStandard8Angle('portrait_smile');
			assert.ok(smileFace);
			assert.equal(smileFace.requiresMirror, false);
			assert.equal(smileFace.requiresRetractor, false);
		});

		it('provides fast dictionary lookup by key and slotId', () => {
			assert.ok(STANDARD_8_ANGLES_MAP['portrait_rest']);
			assert.ok(STANDARD_8_ANGLES_MAP['portrait_smile']);
			assert.ok(STANDARD_8_ANGLES_MAP['profile']);
			assert.ok(STANDARD_8_ANGLES_MAP['profile_90_rest']);
			assert.ok(STANDARD_8_ANGLES_MAP['intraoral_frontal_occlusion']);
			assert.ok(STANDARD_8_ANGLES_MAP['intraoral_right_buccal']);
			assert.ok(STANDARD_8_ANGLES_MAP['intraoral_left_buccal']);
			assert.ok(STANDARD_8_ANGLES_MAP['intraoral_maxillary_occlusal']);
			assert.ok(STANDARD_8_ANGLES_MAP['intraoral_mandibular_occlusal']);
		});
	});

	describe('2. Protocol Completeness Scoring & Clinical Readiness', () => {
		it('reports 0% completeness on empty protocol', () => {
			const res = calculateProtocolCompleteness({});
			assert.equal(res.totalRequired, 8);
			assert.equal(res.uploadedCount, 0);
			assert.equal(res.completionPercentage, 0);
			assert.equal(res.isComplete, false);
			assert.equal(res.extraoralCount, 0);
			assert.equal(res.intraoralCount, 0);
			assert.equal(res.missingAngles.length, 8);
		});

		it('accurately calculates partial progress (e.g. 4/8 = 50%)', () => {
			const slots = {
				portrait_rest: { imageUrl: 'data:image/webp;base64,AAA' },
				portrait_smile: { imageUrl: 'data:image/webp;base64,BBB' },
				intraoral_frontal_occlusion: { imageUrl: 'data:image/webp;base64,CCC' },
				intraoral_maxillary_occlusal: { imageUrl: 'data:image/webp;base64,DDD' },
			};

			const res = calculateProtocolCompleteness(slots);
			assert.equal(res.totalRequired, 8);
			assert.equal(res.uploadedCount, 4);
			assert.equal(res.completionPercentage, 50);
			assert.equal(res.isComplete, false);
			assert.equal(res.extraoralCount, 2);
			assert.equal(res.intraoralCount, 2);
			assert.equal(res.missingAngles.length, 4);

			const missingKeys = res.missingAngles.map((a) => a.key);
			assert.ok(missingKeys.includes('profile'));
			assert.ok(missingKeys.includes('intraoral_right_buccal'));
			assert.ok(missingKeys.includes('intraoral_left_buccal'));
			assert.ok(missingKeys.includes('intraoral_mandibular_occlusal'));
		});

		it('reports 100% completion when all 8 photos are loaded', () => {
			const slots: Record<string, { imageUrl: string }> = {};
			for (const angle of STANDARD_8_CLINICAL_ANGLES) {
				slots[angle.slotId] = { imageUrl: `https://storage.dente.clinic/${angle.key}.webp` };
			}

			const res = calculateProtocolCompleteness(slots);
			assert.equal(res.totalRequired, 8);
			assert.equal(res.uploadedCount, 8);
			assert.equal(res.completionPercentage, 100);
			assert.equal(res.isComplete, true);
			assert.equal(res.extraoralCount, 3);
			assert.equal(res.intraoralCount, 5);
			assert.equal(res.missingAngles.length, 0);
		});
	});

	describe('3. Interactive Before/After Wiper Slider Math', () => {
		it('computes vertical and horizontal polygon clip paths deterministically', () => {
			const v50 = calculateSplitClipPath(50, 'vertical');
			assert.equal(v50, 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)');

			const v0 = calculateSplitClipPath(0, 'vertical');
			assert.equal(v0, 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');

			const v100 = calculateSplitClipPath(100, 'vertical');
			assert.equal(v100, 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)');

			const h25 = calculateSplitClipPath(25, 'horizontal');
			assert.equal(h25, 'polygon(0% 25%, 100% 25%, 100% 100%, 0% 25%)');

			// Clamping on out-of-range inputs
			const vOver = calculateSplitClipPath(120, 'vertical');
			assert.equal(vOver, 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)');

			const vUnder = calculateSplitClipPath(-15, 'vertical');
			assert.equal(vUnder, 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');

			// Safe fallback on NaN or Infinity
			const vNan = calculateSplitClipPath(NaN, 'vertical');
			assert.equal(vNan, 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)');
		});

		it('calculates pointer percent across container bounding rects', () => {
			const containerRect = { left: 100, top: 50, width: 800, height: 400 };

			// Center point X=500 (100 + 400 = 50%)
			const pCenter = calculatePointerPercent({
				clientX: 500,
				clientY: 250,
				containerRect,
				direction: 'vertical',
			});
			assert.equal(pCenter, 50);

			// Quarter point X=300 (100 + 200 = 25%)
			const pQuarter = calculatePointerPercent({
				clientX: 300,
				clientY: 250,
				containerRect,
				direction: 'vertical',
			});
			assert.equal(pQuarter, 25);

			// Horizontal axis Y=150 (50 + 100 = 25%)
			const pHoriz = calculatePointerPercent({
				clientX: 500,
				clientY: 150,
				containerRect,
				direction: 'horizontal',
			});
			assert.equal(pHoriz, 25);

			// Edge clamping outside container
			const pLeft = calculatePointerPercent({
				clientX: 50,
				clientY: 250,
				containerRect,
				direction: 'vertical',
			});
			assert.equal(pLeft, 0);

			const pRight = calculatePointerPercent({
				clientX: 1000,
				clientY: 250,
				containerRect,
				direction: 'vertical',
			});
			assert.equal(pRight, 100);
		});

		it('handles mouse wheel delta and keyboard step navigation smoothly', () => {
			// Wheel scroll down (deltaY > 0 -> increase percent)
			assert.equal(calculateWiperWheelDelta(50, 100, 2), 52);
			// Wheel scroll up (deltaY < 0 -> decrease percent)
			assert.equal(calculateWiperWheelDelta(50, -100, 2), 48);
			// Wheel clamp
			assert.equal(calculateWiperWheelDelta(99, 100, 5), 100);
			assert.equal(calculateWiperWheelDelta(2, -100, 5), 0);

			// Keyboard navigation
			assert.equal(calculateKeyboardWiperDelta(50, 'ArrowLeft', false), 49);
			assert.equal(calculateKeyboardWiperDelta(50, 'ArrowRight', false), 51);
			assert.equal(calculateKeyboardWiperDelta(50, 'ArrowLeft', true), 45); // Shift = 5%
			assert.equal(calculateKeyboardWiperDelta(50, 'ArrowRight', true), 55); // Shift = 5%
			assert.equal(calculateKeyboardWiperDelta(50, 'Home', false), 0);
			assert.equal(calculateKeyboardWiperDelta(50, 'End', false), 100);
		});

		it('constructs CSS transform styles without NaN', () => {
			const style = calculateImageTransformStyle({
				zoom: 1.5,
				rotationDegrees: 90,
				panX: 20,
				panY: -10,
				flipHorizontal: true,
			});

			assert.ok(typeof style.transform === 'string');
			assert.ok(style.transform.includes('scale(1.5)'));
			assert.ok(style.transform.includes('rotate(90deg)'));
			assert.ok(style.transform.includes('translate(20px, -10px)'));
			assert.ok(style.transform.includes('scale(-1, 1)'));
			assert.ok(!style.transform.includes('NaN'));
		});

		it('computes 2D similarity transform between landmark points', () => {
			const bPoints: [Point2D, Point2D] = [
				{ x: 100, y: 100 },
				{ x: 300, y: 100 },
			];
			const aPoints: [Point2D, Point2D] = [
				{ x: 100, y: 100 },
				{ x: 200, y: 100 },
			];

			const transform = calculateSimilarityTransform(bPoints, aPoints);
			assert.equal(transform.scale, 2.0); // 200px vs 100px = scale 2.0
			assert.equal(transform.rotationDegrees, 0);
			assert.ok(Number.isFinite(transform.translateX));
			assert.ok(Number.isFinite(transform.translateY));
		});
	});

	describe('4. 1-Click Export Collage Engine (PNG & Printable PDF)', () => {
		it('returns accurate dimensions for standard collage formats', () => {
			const hd = calculateCollageDimensions('16_9_hd');
			assert.equal(hd.widthPx, 1920);
			assert.equal(hd.heightPx, 1080);
			assert.equal(hd.aspectRatio, 16 / 9);

			const uhd = calculateCollageDimensions('16_9_4k');
			assert.equal(uhd.widthPx, 3840);
			assert.equal(uhd.heightPx, 2160);

			const a4Land = calculateCollageDimensions('A4_landscape');
			assert.equal(a4Land.widthPx, 3508);
			assert.equal(a4Land.heightPx, 2480);
			assert.equal(a4Land.dpi, 300);

			const a4Port = calculateCollageDimensions('A4_portrait');
			assert.equal(a4Port.widthPx, 2480);
			assert.equal(a4Port.heightPx, 3508);
			assert.equal(a4Port.dpi, 300);
		});

		it('generates complete, valid, printable HTML without XSS flaws', () => {
			const html = generateBeforeAfterPrintableHtml({
				clinicName: 'DENTE CLINIC & VIP <Esthetics>',
				patientName: 'Иванова Екатерина <Сергеевна>',
				patientCardNumber: 'К-4821',
				doctorName: 'Д-р Смирнова Е. В.',
				beforeTitle: 'Анфас улыбка (исходный)',
				afterTitle: 'Анфас улыбка (виstatus: 8 керамических виниров)',
				beforeImageUrl: 'https://storage.dente.clinic/pat4821/before.webp',
				afterImageUrl: 'https://storage.dente.clinic/pat4821/after.webp',
				beforeShade: 'A3',
				afterShade: 'BL2',
				dateStr: '25.09.2026',
			});

			assert.ok(html.startsWith('<!DOCTYPE html>'));
			assert.ok(html.includes('DENTE CLINIC &amp; VIP &lt;Esthetics&gt;'));
			assert.ok(html.includes('Иванова Екатерина &lt;Сергеевна&gt;'));
			assert.ok(html.includes('К-4821'));
			assert.ok(html.includes('Д-р Смирнова Е. В.'));
			assert.ok(html.includes('ДО: Анфас улыбка'));
			assert.ok(html.includes('ПОСЛЕ: Анфас улыбка'));
			assert.ok(html.includes('A3'));
			assert.ok(html.includes('BL2'));
			assert.ok(html.includes('https://storage.dente.clinic/pat4821/before.webp'));
			assert.ok(html.includes('https://storage.dente.clinic/pat4821/after.webp'));
			assert.ok(html.includes('@page {'));
			assert.ok(html.includes('size: A4 landscape;'));
			assert.ok(html.includes('</html>'));
		});

		it('generates legal watermark text containing clinic, patient and doctor metadata', () => {
			const watermark = generateCollageWatermarkText(
				'Dente Clinic',
				'Кузнецов А. П.',
				'К-1092',
				'Д-р Смирнов А. П.',
				'25.09.2026'
			);

			assert.ok(watermark.includes('DENTE CLINIC'));
			assert.ok(watermark.includes('Кузнецов А. П.'));
			assert.ok(watermark.includes('К-1092'));
			assert.ok(watermark.includes('Д-р Смирнов А. П.'));
			assert.ok(watermark.includes('25.09.2026'));
		});

		it('proves zero cartoon emojis in generated printable HTML (Mandate 8d pt 7)', () => {
			const html = generateBeforeAfterPrintableHtml({
				clinicName: 'DENTE',
				patientName: 'Пациент',
				patientCardNumber: '100',
				doctorName: 'Врач',
				beforeTitle: 'До',
				afterTitle: 'После',
			});

			const forbiddenEmojis = ['🦷', '🎉', '🚀', '💡', '✨', '⭐', '🔥', '👏', '😁', '😷'];
			for (const emoji of forbiddenEmojis) {
				assert.equal(
					html.includes(emoji),
					false,
					`Forbidden emoji ${emoji} detected in printable presentation HTML`
				);
			}
		});
	});
});
