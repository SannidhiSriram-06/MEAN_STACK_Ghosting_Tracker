const { isThresholdExceeded } = require('./ghostingService');

describe('Ghosting Service - Threshold Logic', () => {
  const referenceDate = new Date('2026-07-17T12:00:00.000Z');

  test('should return true when lastStatusChange is older than threshold', () => {
    // 11 days ago
    const lastStatusChange = new Date('2026-07-06T12:00:00.000Z');
    const thresholdDays = 10;
    
    expect(isThresholdExceeded(lastStatusChange, thresholdDays, referenceDate)).toBe(true);
  });

  test('should return false when lastStatusChange is within threshold', () => {
    // 9 days ago
    const lastStatusChange = new Date('2026-07-08T12:00:00.000Z');
    const thresholdDays = 10;
    
    expect(isThresholdExceeded(lastStatusChange, thresholdDays, referenceDate)).toBe(false);
  });

  test('should return true when lastStatusChange is exactly on threshold boundary', () => {
    // Exactly 10 days ago
    const lastStatusChange = new Date('2026-07-07T12:00:00.000Z');
    const thresholdDays = 10;
    
    expect(isThresholdExceeded(lastStatusChange, thresholdDays, referenceDate)).toBe(true);
  });
});
