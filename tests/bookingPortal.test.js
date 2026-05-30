const { getTimezoneOffsetString } = require('../server');
const listenerManager = require('../lib/listenerManager');

describe('Booking Portal & Meeting System Tests', () => {
	describe('Dynamic Timezone Offset Calculations (DST Support)', () => {
		test('should return correct offset for Asia/Kolkata (IST is always +05:30)', () => {
			const summerDate = new Date('2026-07-01T12:00:00Z');
			const winterDate = new Date('2026-01-01T12:00:00Z');
			
			expect(getTimezoneOffsetString('Asia/Kolkata', summerDate)).toBe('+05:30');
			expect(getTimezoneOffsetString('Asia/Kolkata', winterDate)).toBe('+05:30');
		});

		test('should return correct offset for America/New_York (EDT is -04:00, EST is -05:00)', () => {
			// Summer (EDT - Daylight Saving Time active)
			const summerDate = new Date('2026-07-01T12:00:00Z');
			expect(getTimezoneOffsetString('America/New_York', summerDate)).toBe('-04:00');

			// Winter (EST - Standard Time active)
			const winterDate = new Date('2026-01-01T12:00:00Z');
			expect(getTimezoneOffsetString('America/New_York', winterDate)).toBe('-05:00');
		});

		test('should return correct offset for Europe/London (BST is +01:00, GMT is +00:00)', () => {
			// Summer (BST - British Summer Time active)
			const summerDate = new Date('2026-07-01T12:00:00Z');
			expect(getTimezoneOffsetString('Europe/London', summerDate)).toBe('+01:00');

			// Winter (GMT - Greenwich Mean Time active)
			const winterDate = new Date('2026-01-01T12:00:00Z');
			expect(getTimezoneOffsetString('Europe/London', winterDate)).toBe('+00:00');
		});

		test('should return correct offset for UTC', () => {
			const date = new Date('2026-05-30T12:00:00Z');
			expect(getTimezoneOffsetString('UTC', date)).toBe('+00:00');
		});

		test('should fallback gracefully for invalid or empty timezone', () => {
			const date = new Date('2026-05-30T12:00:00Z');
			expect(getTimezoneOffsetString('Invalid/Timezone', date)).toBe('+05:30');
		});
	});

	describe('Listener Pool Status calculations', () => {
		test('should return accurate pool status', () => {
			const status = listenerManager.getListenerStatus();
			expect(status).toHaveProperty('total');
			expect(status).toHaveProperty('busy');
			expect(status).toHaveProperty('available');
			
			// Total should equal busy + available
			expect(status.total).toBe(status.busy + status.available);
		});
	});
});
