import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';
import { convertToApiEnumFormat } from '@nikon-trimble-sok/api-sdk-d3';
import { addDays } from 'date-fns';
import {
  ConstructionActivitySubType,
  ConstructionActivityType,
  DEAULT_CONSTRUCTIONACTIVITY,
} from 'src/app/helper-utility/api-helper/projects-models';

export const MIN_DATE = new Date(2010, 0, 1);
export const MAX_DATE_INTERVAL_YEAR = 10;

export const MODAL_TITLE_ADD_ACTIVITY = '進捗確認設定の追加';
export const MODAL_PLACEHOLDER_ADD_ACTIVITY = '進捗確認設定名を入力';
export const MODAL_TITLE_CHANGE_ACTIVITY_NAME = '進捗確認設定名を変更';
export const MODAL_PLACEHOLDER_CHANGE_ACTIVITY_NAME = '進捗確認設定名を入力';
export const MODAL_TITLE_CONFIRM = '確認';
export const MODAL_MESSAGE_CONFIRM =
  '現在の進捗確認設定を保存して、推定土量を再計算します。';
export const MODAL_TITLE_CONFIRM_UPDATE = '進捗確認設定を更新';
export const MODAL_MESSAGE_CONFIRM_UPDATE =
  '現在の進捗確認設定を更新し進捗情報を再計算します。';
export const MIN_OFFSET = 0.0;
export const MAX_OFFSET = 100.0;

export const TabType = {
  SettingAction: 1,
  DateGoal: 2,
} as const;
export type TabType = (typeof TabType)[keyof typeof TabType];

export const TargetAreaType = {
  Project: 1,
  Custom: 2,
  Alignment: 3,
} as const;
export type TargetAreaType =
  (typeof TargetAreaType)[keyof typeof TargetAreaType];

export class ViewModel {
  enabledTabType: TabType;
  targetArea: TargetAreaType = TargetAreaType.Project;
  selectedTargetArea: TargetAreaType | undefined;
  currentActivity: ViewConstructionActivity;
  activityList: ConstructionActivity[];

  tabType = TabType;
  targetAreaType = TargetAreaType;
  subType = ConstructionActivitySubType;

  constructor() {
    this.currentActivity = new ViewConstructionActivity(
      DEAULT_CONSTRUCTIONACTIVITY,
    );
    this.enabledTabType = TabType.SettingAction;
    this.activityList = [];
  }

  /**
   * viewModelを内部配列に適用する
   */
  updateListWithCurrent() {
    const index = this.activityList.findIndex(
      (item) => item.id == this.currentActivity.id,
    );
    if (index >= 0) {
      this.activityList[index] = this.currentActivity.getConstructionActivity(
        this.targetArea,
      );
    }
  }

  applyConstructionActivity(activity: ConstructionActivity) {
    if (activity.boundaryId) {
      this.targetArea = TargetAreaType.Custom;
    } else if (activity.alignmentId) {
      this.targetArea = TargetAreaType.Alignment;
    } else {
      this.targetArea = TargetAreaType.Project;
    }
    this.activityList = this.activityList.map((item) =>
      item.id == activity.id
        ? {
            ...item,
            name: activity.name,
          }
        : item,
    );
    this.currentActivity.applyConstructionActivity(activity);
  }

  setTabType(tabType: TabType) {
    this.enabledTabType = tabType;
  }

  isTabTypeSelected(type: TabType): boolean {
    return this.enabledTabType == type;
  }

  isTargetAreaSelected(type: TargetAreaType): boolean {
    if (this.selectedTargetArea) {
      return this.selectedTargetArea == type;
    }
    if (this.currentActivity.boundaryId) {
      return type == TargetAreaType.Custom;
    } else if (this.currentActivity.alignmentId) {
      return type == TargetAreaType.Alignment;
    }
    return this.targetArea == type;
  }
}

export class ViewConstructionActivity {
  id: string | undefined;
  name: string | undefined;
  startTime: Date | undefined;
  endTime: Date | undefined;
  rateForOneDay: number | undefined;
  //code: string | undefined;
  activityType: ConstructionActivityType;
  activitySubType: ConstructionActivitySubType;
  designSurfaceId: string | undefined;
  existingGroundId: string | undefined;
  alignmentId: string | undefined;
  initialStartStation: number | undefined;
  initialEndStation: number | undefined;
  startStation: number | undefined;
  endStation: number | undefined;
  initialLeftOffset: number | undefined;
  initialRightOffset: number | undefined;
  leftOffset: number | undefined;
  rightOffset: number | undefined;
  boundaryId: string | undefined;

  constructor(activity: ConstructionActivity) {
    this.activityType = ConstructionActivityType.earthwork;
    this.activitySubType =
      activity.activitySubType ?? ConstructionActivitySubType.cutfill;
    this.applyConstructionActivity(activity);
  }

  applyConstructionActivity(activity: ConstructionActivity) {
    this.id = activity.id ?? undefined;
    this.name = activity.name ?? undefined;
    if (activity.startTime) {
      this.startTime = new Date(activity.startTime);
      this.startTime.setHours(0, 0, 0, 0);
    } else {
      this.startTime = undefined;
    }
    if (activity.endTime) {
      this.endTime = new Date(activity.endTime);
      this.endTime.setHours(0, 0, 0, 0);
    } else {
      this.endTime = undefined;
    }
    this.rateForOneDay = activity.rateForOneDay ?? 0;
    this.activitySubType =
      activity.activitySubType ?? ConstructionActivitySubType.cutfill;
    this.designSurfaceId = activity.designSurfaceId ?? undefined;
    this.existingGroundId = activity.existingGroundId ?? undefined;

    if (activity.boundaryId) {
      this.alignmentId = '';
      this.boundaryId = activity.boundaryId ?? '';
      this.initialStartStation = undefined;
      this.initialEndStation = undefined;
      this.startStation = undefined;
      this.endStation = undefined;
      this.initialLeftOffset = undefined;
      this.initialRightOffset = undefined;
      this.leftOffset = undefined;
      this.rightOffset = undefined;
    } else if (activity.alignmentId) {
      this.alignmentId = activity.alignmentId ?? '';
      this.boundaryId = '';
      this.initialStartStation = activity.startStation ?? undefined;
      this.initialEndStation = activity.endStation ?? undefined;
      this.startStation = 0;
      this.endStation = 0;
      this.initialLeftOffset = activity.leftOffset ?? 10;
      this.initialRightOffset = activity.rightOffset ?? 10;
      this.leftOffset = activity.leftOffset ?? this.initialLeftOffset;
      this.rightOffset = activity.rightOffset ?? this.initialRightOffset;
    } else {
      this.alignmentId = '';
      this.boundaryId = '';
      this.initialStartStation = undefined;
      this.initialEndStation = undefined;
      this.startStation = undefined;
      this.endStation = undefined;
      this.initialLeftOffset = undefined;
      this.initialRightOffset = undefined;
      this.leftOffset = undefined;
      this.rightOffset = undefined;
    }
  }

  getConstructionActivity(
    targetAreaType: TargetAreaType,
  ): ConstructionActivity {
    const activity: ConstructionActivity = {
      id: null,
      name: null,
      startTime: undefined,
      endTime: undefined,
      rateForOneDay: undefined,
      //code: null,
      activityType: undefined,
      activitySubType: undefined,
      //toleranceSettingsName: null,
      designSurfaceId: null,
      existingGroundId: null,
      alignmentId: null,
      startStation: undefined,
      endStation: undefined,
      leftOffset: undefined,
      rightOffset: undefined,
      boundaryId: null,
    };
    activity.id = this.id ?? null;
    activity.name = this.name ?? null;
    activity.startTime = this.startTime
      ? new Date(
          this.startTime.getFullYear(),
          this.startTime.getMonth(),
          this.startTime.getDate(),
          0,
          0,
          0,
          0,
        )
      : undefined;
    if (this.endTime) {
      const tmpEndDate = addDays(
        new Date(
          this.endTime.getFullYear(),
          this.endTime.getMonth(),
          this.endTime.getDate(),
          0,
          0,
          0,
          0,
        ),
        1,
      );
      activity.endTime = new Date(tmpEndDate.getTime() - 1);
    } else {
      activity.endTime = undefined;
    }
    activity.rateForOneDay = this.rateForOneDay ?? undefined;
    activity.activityType = convertToApiEnumFormat(
      ConstructionActivityType.earthwork,
    );
    activity.activitySubType = convertToApiEnumFormat(this.activitySubType);
    activity.designSurfaceId = this.designSurfaceId ?? null;
    activity.existingGroundId = this.existingGroundId ?? null;
    if (targetAreaType == TargetAreaType.Custom) {
      activity.alignmentId = '';
      activity.boundaryId = this.boundaryId ?? '';
      activity.startStation = undefined;
      activity.endStation = undefined;
      activity.leftOffset = undefined;
      activity.rightOffset = undefined;
    } else if (targetAreaType == TargetAreaType.Alignment) {
      activity.alignmentId = this.alignmentId ?? '';
      activity.boundaryId = '';
      activity.startStation = this.startStation ?? undefined;
      activity.endStation = this.endStation ?? undefined;
      activity.leftOffset = this.leftOffset ?? undefined;
      activity.rightOffset = this.rightOffset ?? undefined;
    } else {
      activity.alignmentId = '';
      activity.boundaryId = '';
      activity.startStation = undefined;
      activity.endStation = undefined;
      activity.leftOffset = undefined;
      activity.rightOffset = undefined;
    }
    return activity;
  }

  reInitiateValue(targetAreaType: TargetAreaType) {
    if (targetAreaType == TargetAreaType.Custom) {
      this.alignmentId = '';
      this.startStation = undefined;
      this.endStation = undefined;
      this.leftOffset = undefined;
      this.rightOffset = undefined;
    } else if (targetAreaType == TargetAreaType.Alignment) {
      this.boundaryId = '';
      this.startStation = this.startStation ?? undefined;
      this.endStation = this.endStation ?? undefined;
      this.leftOffset = this.leftOffset ?? undefined;
      this.rightOffset = this.rightOffset ?? undefined;
    } else {
      this.alignmentId = '';
      this.boundaryId = '';
      this.startStation = undefined;
      this.endStation = undefined;
      this.leftOffset = undefined;
      this.rightOffset = undefined;
    }
  }

  isSubTypeSelected(type: ConstructionActivitySubType): boolean {
    return this.activitySubType == type;
  }

  getSelectedTargetArea(): TargetAreaType {
    if (this.boundaryId) {
      return TargetAreaType.Custom;
    } else if (this.alignmentId) {
      return TargetAreaType.Alignment;
    }
    return TargetAreaType.Project;
  }
}
