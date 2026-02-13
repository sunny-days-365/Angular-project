export interface ViewPointCsvImportSettings {
  /**
   * Row count to be ignored
   */
  ignoreRowCount: number;
  /**
   * Column index of point names
   */
  pointNameIndex: number;
  /**
   * Column index of northing
   */
  northingIndex: number;
  /**
   * Column index of easting
   */
  eastingIndex: number;
  /**
   * Column index of elevation
   */
  elevationIndex: number;
}

export interface ViewPointCloudCsvImportSettings {
  /**
   * Row count to be ignored
   */
  ignoreRowCount: number;
  /**
   * Column index of northing
   */
  northingIndex: number;
  /**
   * Column index of easting
   */
  eastingIndex: number;
  /**
   * Column index of elevation
   */
  elevationIndex: number;
  /**
   * Column index of intensity
   */
  intensityIndex: number;
  /**
   * Column index of red
   */
  redIndex: number;
  /**
   * Column index of green
   */
  greenIndex: number;
  /**
   * Column index of blue
   */
  blueIndex: number;
}

// 指定可能最大カラム数
export const MAX_COLLUMN_NUM = 10;

// 座標系
export enum CoordinateTypeEnum {
  NEZ = 'NEZ',
  XYZ = 'XYZ',
}
export type CoordinateType = keyof typeof CoordinateTypeEnum;

export const EAST_SUFFIX = '(東)';
export const NORTH_SUFFIX = '(北)';
