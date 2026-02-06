import {
  ConstructionActivity,
  ConstructionActivitySubTypes,
  ConstructionActivityTypes,
  ConstructionFilter,
  ConstructionFilterDateTypes,
  ConstructionFilterElevationTypes,
  ConstructionFilterMachineDirectionTypes,
  ConstructionFilterVibeStateTypes,
  LinearUnitTypes,
  ModelKinds,
  ModelTypes,
  PointCloudScaleTypes,
  ProjectCoordinateSystem,
  QuerySendWMDesignModelParam,
  RoleTypes,
  ServiceTypes,
  WMDesignModelTypes,
  WMDeviceControllerFieldData,
} from '@nikon-trimble-sok/api-sdk-d3';
import { convertToApiEnumFormat } from '@nikon-trimble-sok/api-sdk-d3';
import { Project, User, UserDetails } from 'trimble-connect-sdk';

/**
 * [memo]
 * "ModelCategoryType" is redefinition for "ModelTypes".
 * ("ModelTypes" types from  auto generated api definition.)
 * why defined this , because of "ModelTypes" was defined as number ,
 * not include intention in name so it difficult to understand intention.
 * For the Design check function to clearly , we redefinition "ModelCategoryType".
 */

/** MEMO: old model type */
export enum ModelCategoryType {
  'その他' = '0', // unknown
  'ポイント' = '1', // controlPoint
  '線形' = '2', // alignment
  '面データ' = '3', // surface
  '点群データ' = '5', // pointCloud
  '図面' = '6', // backmap
  '3Dモデル' = '8', // 3dModel
  // 'レポート' = '9', // report
  'コリドー' = '10', // alignment with corridor
  '境界線データ' = '11', // boundary
  '計測オブジェクト' = '13', // measuredObject
}

// 注記の定数（モデルツリー用）
export const MODEL_CATEGORY_NOTE = 'note';

export enum ModelKindCategory {
  'ポイント' = '6', // point
  '測量データ' = '1', // survey
  '設計データ' = '3', // design
  '施工データ' = '2', // asBuilt
  '境界線データ' = '4', // boundary
  '図面' = '7', // backmap
  '3Dモデル' = '5', // model3D
  'ヒートマップ' = '8', // heatmap
  // 'レポート' = '9', // report
  'その他' = '0', // unknown
  '計測オブジェクト（距離）' = '15', // measuredObjectDistance
  '計測オブジェクト（面積）' = '16', // measuredObjectArea
  '計測オブジェクト（体積）' = '17', // measuredObjectVolume
  '計測オブジェクト（標高較差）' = '18', // measuredObjectElevationDisparity
  'ゴミ箱' = 'ゴミ箱',
  '注記' = MODEL_CATEGORY_NOTE, // 特殊：注記
}

export enum EnumModelCateModelType {
  Unknown = ModelTypes.NUMBER_0,
  ControlPoint = ModelTypes.NUMBER_1,
  Alignment = ModelTypes.NUMBER_2,
  Surface = ModelTypes.NUMBER_3,
  PointCloud = ModelTypes.NUMBER_5,
  Backmap = ModelTypes.NUMBER_6,
  Model3d = ModelTypes.NUMBER_8,
  // Report = ModelTypes.NUMBER_9,
  CorridorAlignment = ModelTypes.NUMBER_10,
  Boundary = ModelTypes.NUMBER_11,
  MeasuredObject = ModelTypes.NUMBER_13,
}

// Sort model to display in tree 6, 1, 3, 2, 4, 7, 5, 8
export const CategoryTreeSortedIndex: ModelKindCategory[] = [
  ModelKindCategory.ポイント,
  ModelKindCategory.測量データ,
  ModelKindCategory.設計データ,
  ModelKindCategory.施工データ,
  ModelKindCategory.境界線データ,
  ModelKindCategory.図面,
  ModelKindCategory['3Dモデル'],
  ModelKindCategory.ヒートマップ,
  // ModelKindCategory.レポート,
  ModelKindCategory.その他,
  ModelKindCategory.注記,
  ModelKindCategory.ゴミ箱,
];

// 施工履歴 - フィルタタイプ
export const ConstructionFilterType = {
  SystemDefault: 'SystemDefault',
  SystemCutting: 'SystemCutting',
  SystemFilling: 'SystemFilling',
} as const;
export type ConstructionFilterType =
  (typeof ConstructionFilterType)[keyof typeof ConstructionFilterType];
export function toConstructionFilterType(
  filterType: string | undefined | null,
): ConstructionFilterType | null {
  switch (filterType) {
    case ConstructionFilterType.SystemDefault:
      return ConstructionFilterType.SystemDefault;
    case ConstructionFilterType.SystemCutting:
      return ConstructionFilterType.SystemCutting;
    case ConstructionFilterType.SystemFilling:
      return ConstructionFilterType.SystemFilling;
    default:
      return null;
  }
}

// 施工履歴 - 期間
export enum ConstructionFilterDateType {
  Custom = ConstructionFilterDateTypes.NUMBER_0,
  Today = ConstructionFilterDateTypes.NUMBER_1,
  Yesterday = ConstructionFilterDateTypes.NUMBER_2,
  ThisWeek = ConstructionFilterDateTypes.NUMBER_3,
  LastWeek = ConstructionFilterDateTypes.NUMBER_4,
  ThisMonth = ConstructionFilterDateTypes.NUMBER_5,
  LastMonth = ConstructionFilterDateTypes.NUMBER_6,
  Last31Days = ConstructionFilterDateTypes.NUMBER_7,
  ProjectExtents = ConstructionFilterDateTypes.NUMBER_8,
}

// 施工履歴 - 高さ
export enum ConstructionFilterElevationType {
  Last = ConstructionFilterElevationTypes.NUMBER_0,
  First = ConstructionFilterElevationTypes.NUMBER_1,
  Highest = ConstructionFilterElevationTypes.NUMBER_2,
  Lowest = ConstructionFilterElevationTypes.NUMBER_3,
}

// 施工履歴 -
export enum ConstructionFilterVibeStateType {
  None = ConstructionFilterVibeStateTypes.NUMBER_0,
  Off = ConstructionFilterVibeStateTypes.NUMBER_1,
  On = ConstructionFilterVibeStateTypes.NUMBER_2,
}

// 施工履歴 - 稼働方向
export enum ConstructionFilterMachineDirectionType {
  None = ConstructionFilterMachineDirectionTypes.NUMBER_0,
  Backward = ConstructionFilterMachineDirectionTypes.NUMBER_1,
  Forward = ConstructionFilterMachineDirectionTypes.NUMBER_2,
}

// 施工履歴 - デフォルトフィルタ
export const DEFAULT_CONSTRUCTIONFILTER: ConstructionFilter = {
  id: '',
  name: 'デフォルトフィルター',
  filterType: '',
  dateType: convertToApiEnumFormat<ConstructionFilterDateTypes>(
    ConstructionFilterDateType.ProjectExtents,
  ),
  stateUtc: undefined,
  endUtc: undefined,
  machineIds: [],
  onMachineDesignId: undefined,
  elevationType: convertToApiEnumFormat<ConstructionFilterElevationTypes>(
    ConstructionFilterElevationType.Last,
  ),
  vibeState: convertToApiEnumFormat<ConstructionFilterVibeStateTypes>(
    ConstructionFilterVibeStateTypes.NUMBER_0,
  ),
  machineDirection:
    convertToApiEnumFormat<ConstructionFilterMachineDirectionTypes>(
      ConstructionFilterMachineDirectionType.None,
    ),
  boundaryIds: [],
};

// 進捗確認設定 - アクティビティタイプ
export enum ConstructionActivityType {
  earthwork = ConstructionActivityTypes.NUMBER_0,
}

// 進捗確認設定 - 工種タイプ
export enum ConstructionActivitySubType {
  cutfill = ConstructionActivitySubTypes.NUMBER_0,
  cut = ConstructionActivitySubTypes.NUMBER_1,
  fill = ConstructionActivitySubTypes.NUMBER_2,
}

// 進捗確認設定 - デフォルト設定
export const DEAULT_CONSTRUCTIONACTIVITY: ConstructionActivity = {
  id: '',
  name: '',
  startTime: undefined,
  endTime: undefined,
  rateForOneDay: 0,
  code: undefined,
  activityType: convertToApiEnumFormat<ConstructionActivityTypes>(
    ConstructionActivityType.earthwork,
  ),
  activitySubType: convertToApiEnumFormat<ConstructionActivitySubTypes>(
    ConstructionActivitySubType.cutfill,
  ),
  toleranceSettingsName: undefined,
  designSurfaceId: '',
  existingGroundId: '',
  alignmentId: '',
  startStation: 0,
  endStation: undefined,
  leftOffset: 10,
  rightOffset: 10,
  boundaryId: '',
};

// 設計データタイプ
export enum WMDesignModelType {
  none = WMDesignModelTypes.NUMBER_0,
  surface = WMDesignModelTypes.NUMBER_1,
  alignments = WMDesignModelTypes.NUMBER_2,
  roadSurface = WMDesignModelTypes.NUMBER_3,
  lineworks = WMDesignModelTypes.NUMBER_4,
}

export const DEFAULT_WM_DESIGN_MODEL_PARAM: QuerySendWMDesignModelParam = {
  accountId: '',
  projectId: '',
  designName: '',
  designModelType: convertToApiEnumFormat<WMDesignModelTypes>(
    WMDesignModelType.none,
  ),
  surfaceId: '',
  surfaceBoundaryId: '',
  alignmentIds: [],
  lineworkIds: [],
  stakeOutPointIds: [],
  cadBackmapIds: [],
};

export interface ModelCategory {
  id: ModelKindCategory;
  name: string;
}

function transformCategoryName(): { [key: string]: string } {
  const model: { [key: string]: string } = {};

  Object.keys(ModelKindCategory).forEach((key) => {
    const value = ModelKindCategory[key as keyof typeof ModelKindCategory];

    model[value] = key;
  });

  return model;
}

export function modelTypeToModelCategory(
  category: ModelKindCategory,
): ModelCategory | undefined {
  const model = transformCategoryName();

  if (category && model[category]) {
    return {
      id: category,
      name: model[category],
    };
  }

  return undefined;
}

/**
 * [memo]
 * "ModelTypeDesignCheck" is redefinition for "ModelTypes".
 * ("ModelTypes" types from  auto generated api definition.)
 * Why defined this , because of "ModelTypes" was defined as number ,
 * not include intention in name so it difficult to understand intention.
 * For the Design check function to clearly , we redefinition "ModelTypeDesignCheck".
 *
 * "ModelCategoryType" and "ModelTypeDesignCheck" is essentially the same meaning.
 * But we defined separately these types for type compatibility.
 */
export const ModelTypeDesignCheck = {
  alignment: EnumModelCateModelType.Alignment,
  designSurface: EnumModelCateModelType.Surface,
  corridorAlignment: EnumModelCateModelType.CorridorAlignment,
};

export enum ModelKindDesignCheck {
  survey = ModelKinds.NUMBER_1,
  design = ModelKinds.NUMBER_3,
}

/**
 * [memo]
 * "ModelTypeReport" is redefinition for "ModelTypes".
 * ("ModelTypes" types from  auto generated api definition.)
 * Why defined this , because of "ModelTypes" was defined as number ,
 * not include intention in name so it difficult to understand intention.
 * For the Design check function to clearly , we redefinition "ModelTypeReport".
 *
 * "ModelCategoryType" and "ModelTypeReport" is essentially the same meaning.
 * But we defined separately these types for type compatibility.
 */
export const ModelTypeReport = {
  designSurface: EnumModelCateModelType.Surface,
  pointCloud: EnumModelCateModelType.PointCloud,
};

export const ModelTypePointCloud = EnumModelCateModelType.PointCloud;

// サービス
export enum ServiceType {
  trimbleConnect = ServiceTypes.NUMBER_0,
  worksManager = ServiceTypes.NUMBER_1,
  worksOs = ServiceTypes.NUMBER_2,
  siteCompactor = ServiceTypes.NUMBER_3,
}

// ロール
export enum RoleType {
  admin = RoleTypes.NUMBER_0,
  user = RoleTypes.NUMBER_1,
}

// ユーザーにアサインされたロール
export enum UserAssignedRoleType {
  NONE,
  TrimbleConnectAdmin,
  WorksManagerAdmin,
  WorksOSAdmin,
  TrimbleConnectUser,
  WorksManagerUser,
  WorksOSUser,
}

// 現場リンク状態
export const ProjectLink = {
  NONE: 0,
  WorksManager: 1,
  WorksOS: 2,
} as const;
export type ProjectLink = (typeof ProjectLink)[keyof typeof ProjectLink];

export function toProjectLinkState(
  projectType: number | undefined | null,
): ProjectLink {
  switch (projectType) {
    case 0:
      return ProjectLink.NONE;
    case 1:
      return ProjectLink.WorksManager;
    case 2:
      return ProjectLink.WorksOS;
    default:
      return ProjectLink.NONE;
  }
}

export const LockFuncName = {
  ConstructionData: 'ConstructionData',
  ConstructionFilter: 'ConstructionFilter',
  ConstructionActivity: 'ConstructionActivity',
  Map3D: 'Map3D',
  Model: 'Model',
  File: 'File',
};
export type LockFuncName = (typeof LockFuncName)[keyof typeof LockFuncName];

export const pointTypeNames = [
  '基準点',
  '水準点',
  '工事基準点',
  '標定点',
  '検証点',
  '出来形計測点',
];

export interface NTCWMDeviceControllerFieldData
  extends WMDeviceControllerFieldData {
  name: string;
  path: string;
  deviceId: string;
}

export enum MapLayerEnum {
  PROJECT_AREA = 'PROJECT_AREA',
  AVOID_ZONE = 'AVOID_ZONE',
  CONTROL_POINTS = 'CONTROL_POINTS',
  BACK_MAP = 'BACK_MAP',
  HEAT_MAP = 'HEAT_MAP',
  MARKER = 'MARKER',
  BACKGROUND = 'BACKGROUND',
}
export type MapLayer = keyof typeof MapLayerEnum;

export const LatestConstructionDataPattern = '最新施工進捗';

// スケールタイプ
export enum PointCloudScaleType {
  else = PointCloudScaleTypes.NUMBER_0,
  grid = PointCloudScaleTypes.NUMBER_1,
  ground_surface = PointCloudScaleTypes.NUMBER_2,
}

// 作図単位
export enum LinearUnitType {
  mm = LinearUnitTypes.NUMBER_0,
  cm = LinearUnitTypes.NUMBER_1,
  m = LinearUnitTypes.NUMBER_2,
}

export function toLinearUnitTypes(unitType: LinearUnitType): LinearUnitTypes {
  switch (unitType) {
    case LinearUnitType.mm:
      return LinearUnitTypes.NUMBER_0;
    case LinearUnitType.cm:
      return LinearUnitTypes.NUMBER_1;
    case LinearUnitType.m:
      return LinearUnitTypes.NUMBER_2;
  }
}

export interface SOKUserDetails extends UserDetails {
  hasImage: boolean;
}

// ライセンス状態
export const EntitlementStatusName = {
  InPreparation: 'InPreparation', // 準備中
  NotActivated: 'NotActivated', // アクティベーション待ち
  Activated: 'Activated', // アクティベーション済み
  Locked: 'Locked', // ロック
};
export type EntitlementStatusName =
  (typeof EntitlementStatusName)[keyof typeof EntitlementStatusName];

export enum ProjectType {
  Type3DDisabled = 0,
  Type3DEnabled = 1,
}

export interface NtcProject extends Project {
  startDate?: string;
  endDate?: string;
  role?: string;
  createdBy?: User & {
    company?: {
      name?: string;
    };
  };
  address?: {
    text?: string;
    geometry?: string;
  };
  crs?: ProjectCoordinateSystem;
  geoidName?: string;
  linkToSC: boolean;
  linkToWM: boolean;
  linkToWOS: boolean;
  accountId?: string;
}

// 画面遷移中のエラー
export enum NavigationErrorCode {
  SYSTEM_ERROR,
  PROJECT_NOT_FOUND,
  PROJECT_ACCOUNT_ID_UNDEFINED,
  PROJECT_ACCOUNT_ID_UNAUTHORIZED,
}
