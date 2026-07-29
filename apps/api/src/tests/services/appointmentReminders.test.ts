import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { shortDoctorName } from "../../services/communications/appointmentReminders.js";

describe("shortDoctorName formatting", () => {
    test("empty string", () => {
        assert.equal(shortDoctorName(""), "");
    });

    test("only spaces", () => {
        assert.equal(shortDoctorName("   "), "");
    });

    test("single word", () => {
        assert.equal(shortDoctorName("Иванов"), "Иванов");
    });

    test("two words", () => {
        assert.equal(shortDoctorName("Иванов Иван"), "Иванов И.");
    });

    test("three words", () => {
        assert.equal(shortDoctorName("Иванов Иван Иванович"), "Иванов И. И.");
    });

    test("more than three words ignores extra parts", () => {
        assert.equal(shortDoctorName("Салтыков-Щедрин Михаил Евграфович Писатель"), "Салтыков-Щедрин М. Е.");
    });

    test("multiple spaces between words and at edges", () => {
        assert.equal(shortDoctorName("  Иванов   Иван    Иванович  "), "Иванов И. И.");
    });

    test("handles lowercase first letters for initials", () => {
        assert.equal(shortDoctorName("иванов иван иванович"), "иванов И. И.");
    });
});
