import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	ADULT_QUADRANTS,
	PEDIATRIC_QUADRANTS,
	getQuadrantForTooth,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
	getQuadrantTeeth,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
} from '../ToothChart';

describe('Responsive Mobile Quadrant Odontogram Adapter', () => {
	it('should have 4 adult quadrants with 8 teeth each', () => {
		assert.equal(ADULT_QUADRANTS.length, 4);

		const q1 = ADULT_QUADRANTS.find((q) => q.id === 'Q1');
		assert.ok(q1);
		assert.equal(q1.jaw, 'upper');
		assert.equal(q1.side, 'right');
		assert.deepEqual(q1.teeth, [18, 17, 16, 15, 14, 13, 12, 11]);

		const q2 = ADULT_QUADRANTS.find((q) => q.id === 'Q2');
		assert.ok(q2);
		assert.equal(q2.jaw, 'upper');
		assert.equal(q2.side, 'left');
		assert.deepEqual(q2.teeth, [21, 22, 23, 24, 25, 26, 27, 28]);

		const q3 = ADULT_QUADRANTS.find((q) => q.id === 'Q3');
		assert.ok(q3);
		assert.equal(q3.jaw, 'lower');
		assert.equal(q3.side, 'left');
		assert.deepEqual(q3.teeth, [31, 32, 33, 34, 35, 36, 37, 38]);

		const q4 = ADULT_QUADRANTS.find((q) => q.id === 'Q4');
		assert.ok(q4);
		assert.equal(q4.jaw, 'lower');
		assert.equal(q4.side, 'right');
		assert.deepEqual(q4.teeth, [48, 47, 46, 45, 44, 43, 42, 41]);
	});

	it('should have 4 pediatric quadrants with 5 teeth each', () => {
		assert.equal(PEDIATRIC_QUADRANTS.length, 4);

		const q5 = PEDIATRIC_QUADRANTS.find((q) => q.id === 'Q5');
		assert.ok(q5);
		assert.deepEqual(q5.teeth, [55, 54, 53, 52, 51]);

		const q6 = PEDIATRIC_QUADRANTS.find((q) => q.id === 'Q6');
		assert.ok(q6);
		assert.deepEqual(q6.teeth, [61, 62, 63, 64, 65]);

		const q7 = PEDIATRIC_QUADRANTS.find((q) => q.id === 'Q7');
		assert.ok(q7);
		assert.deepEqual(q7.teeth, [71, 72, 73, 74, 75]);

		const q8 = PEDIATRIC_QUADRANTS.find((q) => q.id === 'Q8');
		assert.ok(q8);
		assert.deepEqual(q8.teeth, [85, 84, 83, 82, 81]);
	});

	it('should correctly resolve quadrant for any adult tooth number', () => {
		assert.equal(getQuadrantForTooth(18), 'Q1');
		assert.equal(getQuadrantForTooth(11), 'Q1');
		assert.equal(getQuadrantForTooth(21), 'Q2');
		assert.equal(getQuadrantForTooth(28), 'Q2');
		assert.equal(getQuadrantForTooth(31), 'Q3');
		assert.equal(getQuadrantForTooth(38), 'Q3');
		assert.equal(getQuadrantForTooth(41), 'Q4');
		assert.equal(getQuadrantForTooth(48), 'Q4');
	});

	it('should correctly resolve quadrant for pediatric tooth numbers', () => {
		assert.equal(getQuadrantForTooth(55, true), 'Q5');
		assert.equal(getQuadrantForTooth(51, true), 'Q5');
		assert.equal(getQuadrantForTooth(61, true), 'Q6');
		assert.equal(getQuadrantForTooth(65, true), 'Q6');
		assert.equal(getQuadrantForTooth(71, true), 'Q7');
		assert.equal(getQuadrantForTooth(75, true), 'Q7');
		assert.equal(getQuadrantForTooth(81, true), 'Q8');
		assert.equal(getQuadrantForTooth(85, true), 'Q8');
	});

	it('should correctly navigate adjacent quadrants in adult mode', () => {
		assert.equal(getAdjacentQuadrant('Q1', 'next'), 'Q2');
		assert.equal(getAdjacentQuadrant('Q2', 'next'), 'Q3');
		assert.equal(getAdjacentQuadrant('Q3', 'next'), 'Q4');
		assert.equal(getAdjacentQuadrant('Q4', 'next'), 'Q1');

		assert.equal(getAdjacentQuadrant('Q1', 'prev'), 'Q4');
		assert.equal(getAdjacentQuadrant('Q4', 'prev'), 'Q3');
		assert.equal(getAdjacentQuadrant('Q3', 'prev'), 'Q2');
		assert.equal(getAdjacentQuadrant('Q2', 'prev'), 'Q1');
	});

	it('should correctly navigate adjacent quadrants in pediatric mode', () => {
		assert.equal(getAdjacentQuadrant('Q5', 'next', true), 'Q6');
		assert.equal(getAdjacentQuadrant('Q6', 'next', true), 'Q7');
		assert.equal(getAdjacentQuadrant('Q7', 'next', true), 'Q8');
		assert.equal(getAdjacentQuadrant('Q8', 'next', true), 'Q5');

		assert.equal(getAdjacentQuadrant('Q5', 'prev', true), 'Q8');
		assert.equal(getAdjacentQuadrant('Q8', 'prev', true), 'Q7');
		assert.equal(getAdjacentQuadrant('Q7', 'prev', true), 'Q6');
		assert.equal(getAdjacentQuadrant('Q6', 'prev', true), 'Q5');
	});

	it('should correctly identify top vs bottom quadrants', () => {
		assert.equal(isQuadrantTop('Q1'), true);
		assert.equal(isQuadrantTop('Q2'), true);
		assert.equal(isQuadrantTop('Q5'), true);
		assert.equal(isQuadrantTop('Q6'), true);

		assert.equal(isQuadrantTop('Q3'), false);
		assert.equal(isQuadrantTop('Q4'), false);
		assert.equal(isQuadrantTop('Q7'), false);
		assert.equal(isQuadrantTop('Q8'), false);
	});

	it('should return correct quadrant title strings', () => {
		assert.ok(getQuadrantTitle('Q1').includes('18–11'));
		assert.ok(getQuadrantTitle('Q2').includes('21–28'));
		assert.ok(getQuadrantTitle('Q3').includes('31–38'));
		assert.ok(getQuadrantTitle('Q4').includes('48–41'));
		assert.ok(getQuadrantTitle('Q5', true).includes('55–51'));
	});

	it('should slice correct teeth subset via getQuadrantTeeth', () => {
		const q1Teeth = getQuadrantTeeth('Q1', TOP_TEETH, BOTTOM_TEETH);
		assert.deepEqual(q1Teeth, [18, 17, 16, 15, 14, 13, 12, 11]);

		const q2Teeth = getQuadrantTeeth('Q2', TOP_TEETH, BOTTOM_TEETH);
		assert.deepEqual(q2Teeth, [21, 22, 23, 24, 25, 26, 27, 28]);

		const q3Teeth = getQuadrantTeeth('Q3', TOP_TEETH, BOTTOM_TEETH);
		assert.deepEqual(q3Teeth, [31, 32, 33, 34, 35, 36, 37, 38]);

		const q4Teeth = getQuadrantTeeth('Q4', TOP_TEETH, BOTTOM_TEETH);
		assert.deepEqual(q4Teeth, [48, 47, 46, 45, 44, 43, 42, 41]);

		const pTop = PEDIATRIC_TOP_TEETH;
		const pBottom = PEDIATRIC_BOTTOM_TEETH;
		const q5Teeth = getQuadrantTeeth('Q5', pTop, pBottom, true);
		assert.deepEqual(q5Teeth, [55, 54, 53, 52, 51]);
	});
});
