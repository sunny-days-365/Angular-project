import { TestBed } from '@angular/core/testing';
import { NumberFormatHelperService } from './number-format-helper.service';
import { MeasurementType } from './number-format-helper.definition';

describe('NumberFormatHelperService', () => {
  let service: NumberFormatHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NumberFormatHelperService);
  });

  describe('roundValue', () => {
    it('should round positive numbers correctly', () => {
      expect(service.roundValue(123.4567, MeasurementType.DISTANCE)).toBe(
        123.457,
      );
    });

    it('should round negative numbers correctly', () => {
      expect(service.roundValue(-123.4567, MeasurementType.DISTANCE)).toBe(
        -123.457,
      );
    });

    it('should round numbers with different precisions', () => {
      expect(service.roundValue(123.4567, MeasurementType.CUTFILL)).toBe(123.5);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundValue(undefined, MeasurementType.DISTANCE)).toBeNaN();
    });
  });

  describe('formatValue', () => {
    it('should format numbers with unit', () => {
      expect(service.formatValue(123.4567, MeasurementType.AREA, true)).toBe(
        '123.457 m²',
      );
    });

    it('should format numbers without unit', () => {
      expect(service.formatValue(123.4567, MeasurementType.AREA, false)).toBe(
        '123.457',
      );
    });

    it('should format numbers with trailing zeros', () => {
      expect(service.formatValue(123.45, MeasurementType.AREA)).toBe(
        '123.450 m²',
      );
      expect(service.formatValue(123, MeasurementType.CUTFILL)).toBe(
        '123.0 m³',
      );
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatValue(undefined, MeasurementType.AREA)).toBe('');
    });
  });

  describe('roundPosition', () => {
    it('should round POSITION measurement correctly', () => {
      expect(service.roundPosition(123.4567)).toBe(123.457);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundPosition(undefined)).toBeNaN();
    });
  });

  describe('roundDistance', () => {
    it('should round DISTANCE measurement correctly', () => {
      expect(service.roundDistance(123.4567)).toBe(123.457);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundDistance(undefined)).toBeNaN();
    });
  });

  describe('formatDistance', () => {
    it('should format DISTANCE measurement with unit', () => {
      expect(service.formatDistance(123.4567, true)).toBe('123.457 m');
    });

    it('should format DISTANCE measurement without unit', () => {
      expect(service.formatDistance(123.4567, false)).toBe('123.457');
    });

    it('should format DISTANCE measurement with trailing zeros', () => {
      expect(service.formatDistance(123.45)).toBe('123.450 m');
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatDistance(undefined, true)).toBe('');
    });
  });

  describe('roundElevation', () => {
    it('should round ELEVATION measurement correctly', () => {
      expect(service.roundElevation(123.4567)).toBe(123.457);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundElevation(undefined)).toBeNaN();
    });
  });

  describe('formatElevation', () => {
    it('should format ELEVATION measurement with unit', () => {
      expect(service.formatElevation(123.4567, true)).toBe('123.457 m');
    });

    it('should format ELEVATION measurement without unit', () => {
      expect(service.formatElevation(123.4567, false)).toBe('123.457');
    });

    it('should format ELEVATION measurement with trailing zeros', () => {
      expect(service.formatElevation(123.45)).toBe('123.450 m');
    });

    it('should format ELEVATION measurement with comma separator when toLocalString is true', () => {
      expect(service.formatElevation(1234.567, true, true)).toBe('1,234.567 m');
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatElevation(undefined, true)).toBe('');
    });
  });

  describe('roundArea', () => {
    it('should round AREA measurement correctly', () => {
      expect(service.roundArea(123.4567)).toBe(123.457);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundArea(undefined)).toBeNaN();
    });
  });

  describe('formatArea', () => {
    it('should format AREA measurement with unit', () => {
      expect(service.formatArea(123.4567, true)).toBe('123.457 m²');
    });

    it('should format AREA measurement without unit', () => {
      expect(service.formatArea(123.4567, false)).toBe('123.457');
    });

    it('should format AREA measurement with trailing zeros', () => {
      expect(service.formatArea(123.45)).toBe('123.450 m²');
    });

    it('should format AREA measurement with comma separator when toLocalString is true', () => {
      expect(service.formatArea(1234.567, true, true)).toBe('1,234.567 m²');
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatArea(undefined, true)).toBe('');
    });
  });

  describe('roundVolume', () => {
    it('should round VOLUME measurement correctly', () => {
      expect(service.roundVolume(123.4567)).toBe(123.457);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundVolume(undefined)).toBeNaN();
    });
  });

  describe('formatVolume', () => {
    it('should format VOLUME measurement with unit', () => {
      expect(service.formatVolume(123.4567, true)).toBe('123.457 m³');
    });

    it('should format VOLUME measurement without unit', () => {
      expect(service.formatVolume(123.4567, false)).toBe('123.457');
    });

    it('should format VOLUME measurement with trailing zeros', () => {
      expect(service.formatVolume(123.45)).toBe('123.450 m³');
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatVolume(undefined, true)).toBe('');
    });
  });

  describe('roundCutfill', () => {
    it('should round CUTFILL measurement correctly', () => {
      expect(service.roundCutfill(123.456)).toBe(123.5);
    });

    it('should return NaN for undefined values', () => {
      expect(service.roundCutfill(undefined)).toBeNaN();
    });
  });

  describe('formatCutfill', () => {
    it('should format CUTFILL measurement with unit', () => {
      expect(service.formatCutfill(123.45, true)).toBe('123.5 m³');
    });

    it('should format CUTFILL measurement without unit', () => {
      expect(service.formatCutfill(123.45, false)).toBe('123.5');
    });

    it('should format CUTFILL measurement with trailing zeros', () => {
      expect(service.formatCutfill(123)).toBe('123.0 m³');
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatCutfill(undefined, true)).toBe('');
    });
  });

  describe('roundSlope', () => {
    it('should round SLOPE measurement correctly', () => {
      expect(service.roundSlope(50, 25)).toBe(50.0); // slope = (25 / 50) * 100
    });

    it('should return NaN for undefined width or height', () => {
      expect(service.roundSlope(undefined, 25)).toBeNaN();
      expect(service.roundSlope(50, undefined)).toBeNaN();
    });

    it('should return PositiveInfinity for zero width', () => {
      expect(service.roundSlope(0, 25)).toBePositiveInfinity();
    });
  });

  describe('formatSlope', () => {
    it('should format SLOPE measurement with unit', () => {
      expect(service.formatSlope(50, true)).toBe('50.0 %');
    });

    it('should return an empty string for undefined values', () => {
      expect(service.formatSlope(undefined, true)).toBe('');
    });
  });

  describe('formatSlopeByArgs', () => {
    it('should format SLOPE measurement from width and height', () => {
      expect(service.formatSlopeByArgs(50, 25, true)).toBe('50.0 %');
    });

    it('should return an empty string for undefined width or height', () => {
      expect(service.formatSlopeByArgs(undefined, 25, true)).toBe('');
      expect(service.formatSlopeByArgs(50, undefined, true)).toBe('');
    });

    it('should return an empty string for zero width', () => {
      expect(service.formatSlopeByArgs(0, 25)).toBe('');
    });
  });

  describe('roundRatio', () => {
    it('should round RATIO measurement correctly', () => {
      expect(service.roundRatio(10, 5)).toBe(2.0); // ratio = 10 / 5
    });

    it('should return NaN for undefined width or height', () => {
      expect(service.roundRatio(undefined, 5)).toBeNaN();
      expect(service.roundRatio(10, undefined)).toBeNaN();
    });

    it('should return NaN for zero height', () => {
      expect(service.roundRatio(10, 0)).toBeNaN();
    });
  });

  describe('formatRatio', () => {
    it('should format RATIO measurement as "1:n"', () => {
      expect(service.formatRatio(10, 5, true)).toBe('1:2.0');
    });

    it('should return an empty string for undefined width or height', () => {
      expect(service.formatRatio(undefined, 5, true)).toBe('');
      expect(service.formatRatio(10, undefined, true)).toBe('');
    });

    it('should return an empty string for zero height', () => {
      expect(service.roundRatio(10, 0)).toBeNaN();
    });
  });
});
