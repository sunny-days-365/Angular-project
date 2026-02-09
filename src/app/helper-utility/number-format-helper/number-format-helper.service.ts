import { Injectable } from '@angular/core';
import {
  MeasurementType,
  RoundingPrecisionMap,
  UnitMap,
} from './number-format-helper.definition';

@Injectable({
  providedIn: 'root',
})
export class NumberFormatHelperService {
  /**
   * Rounds the number to the specified precision for the measurement type.
   * @param value The number to round.
   * @param type The measurement type (e.g., DISTANCE, AREA).
   * @returns Rounded number.
   */
  public roundValue(value: number | undefined, type: MeasurementType): number {
    if (value === undefined) {
      return NaN;
    }

    const precision = RoundingPrecisionMap[type];
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * Formats the number as a text with the specified measurement type and optional unit.
   * @param value The number to format.
   * @param type The measurement type (e.g., DISTANCE, AREA).
   * @param withUnit Whether to include the unit in the formatted string.
   * @returns Formatted text.
   */
  public formatValue(
    value: number | undefined,
    type: MeasurementType,
    withUnit: boolean = true,
    toLocalStringOption: Intl.NumberFormatOptions | undefined = undefined,
  ): string {
    if (value === undefined) {
      return '';
    }

    if (value === Infinity) {
      return '無限大';
    }

    const roundedValue = this.roundValue(value, type);
    const precision = RoundingPrecisionMap[type];

    // Format number to fixed decimal places
    let formattedNumber = '0';

    // Format number to fixed decimal places
    if (toLocalStringOption) {
      formattedNumber = roundedValue.toLocaleString(
        undefined,
        toLocalStringOption,
      );
    } else {
      formattedNumber = roundedValue.toFixed(precision);
    }

    // Append unit if required
    const unit = withUnit && UnitMap[type].length ? ` ${UnitMap[type]}` : '';
    return `${formattedNumber}${unit}`;
  }

  // Helper function for position
  public roundPosition(value: number | undefined): number {
    return this.roundValue(value, MeasurementType.POSITION);
  }

  // Helper functions for distance
  public roundDistance(value: number | undefined): number {
    return this.roundValue(value, MeasurementType.DISTANCE);
  }

  public formatDistance(
    value: number | undefined,
    withUnit: boolean = true,
  ): string {
    const toLocalStringOption = {
      minimumFractionDigits: RoundingPrecisionMap[MeasurementType.DISTANCE],
      maximumFractionDigits: RoundingPrecisionMap[MeasurementType.DISTANCE],
    };
    return this.formatValue(
      value,
      MeasurementType.DISTANCE,
      withUnit,
      toLocalStringOption,
    );
  }

  // Helper functions for elevation
  public roundElevation(value: number | undefined): number {
    return this.roundValue(value, MeasurementType.ELEVATION);
  }

  public formatElevation(
    value: number | undefined,
    withUnit: boolean = true,
    toLocalString: boolean = false,
  ): string {
    let toLocalStringOption: Intl.NumberFormatOptions | undefined = undefined;
    if (toLocalString) {
      toLocalStringOption = {
        minimumFractionDigits: RoundingPrecisionMap[MeasurementType.ELEVATION],
        maximumFractionDigits: RoundingPrecisionMap[MeasurementType.ELEVATION],
      };
    }
    return this.formatValue(
      value,
      MeasurementType.ELEVATION,
      withUnit,
      toLocalStringOption,
    );
  }

  // Helper functions for area
  public roundArea(value: number | undefined): number {
    return this.roundValue(value, MeasurementType.AREA);
  }

  public formatArea(
    value: number | undefined,
    withUnit: boolean = true,
    toLocalString: boolean = false,
  ): string {
    let toLocalStringOption: Intl.NumberFormatOptions | undefined = undefined;
    if (toLocalString) {
      toLocalStringOption = {
        minimumFractionDigits: RoundingPrecisionMap[MeasurementType.AREA],
        maximumFractionDigits: RoundingPrecisionMap[MeasurementType.AREA],
      };
    }
    return this.formatValue(
      value,
      MeasurementType.AREA,
      withUnit,
      toLocalStringOption,
    );
  }

  // Helper functions for volume
  public roundVolume(value: number | undefined): number {
    return this.roundValue(value, MeasurementType.VOLUME);
  }

  public formatVolume(
    value: number | undefined,
    withUnit: boolean = true,
  ): string {
    return this.formatValue(value, MeasurementType.VOLUME, withUnit);
  }

  // Helper functions for cutfill
  public roundCutfill(value: number | undefined): number {
    return this.roundValue(value, MeasurementType.CUTFILL);
  }

  public formatCutfill(
    value: number | undefined,
    withUnit: boolean = true,
    toLocalString: boolean = false,
  ): string {
    let toLocalStringOption: Intl.NumberFormatOptions | undefined = undefined;
    if (toLocalString) {
      toLocalStringOption = {
        minimumFractionDigits: RoundingPrecisionMap[MeasurementType.CUTFILL],
        maximumFractionDigits: RoundingPrecisionMap[MeasurementType.CUTFILL],
      };
    }
    return this.formatValue(
      value,
      MeasurementType.CUTFILL,
      withUnit,
      toLocalStringOption,
    );
  }

  // Helper functions for slope
  public roundSlope(
    width: number | undefined,
    height: number | undefined,
  ): number {
    if (width === undefined || height === undefined) {
      return NaN;
    }

    if (width === 0) {
      return Infinity;
    }

    const slope = (height / width) * 100;
    return this.roundValue(slope, MeasurementType.SLOPE);
  }

  public formatSlope(
    value: number | undefined,
    withUnit: boolean = true,
  ): string {
    return this.formatValue(value, MeasurementType.SLOPE, withUnit);
  }

  public formatSlopeByArgs(
    width: number | undefined,
    height: number | undefined,
    withUnit: boolean = true,
  ): string {
    if (!width || height === undefined) {
      return '';
    }
    const slope = (height / width) * 100;
    return this.formatValue(slope, MeasurementType.SLOPE, withUnit);
  }

  // Helper functions for ratio
  public roundRatio(
    width: number | undefined,
    height: number | undefined,
  ): number {
    if (width === undefined || !height) {
      return NaN;
    }
    const ratio = width / height;
    return this.roundValue(ratio, MeasurementType.RATIO);
  }

  public formatRatio(
    width: number | undefined,
    height: number | undefined,
    withUnit: boolean = true,
  ): string {
    if (width === undefined || !height) {
      return '';
    }
    const ratio = width / height;
    return `1:${this.formatValue(ratio, MeasurementType.RATIO, withUnit)}`;
  }
}
