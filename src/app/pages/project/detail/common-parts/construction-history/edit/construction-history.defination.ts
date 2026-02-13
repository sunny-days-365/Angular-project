import {
  ConstructionFilter,
  ConstructionFilterDateTypes,
  ConstructionFilterElevationTypes,
  ConstructionFilterMachineDirectionTypes,
  ConstructionFilterVibeStateTypes,
} from '@nikon-trimble-sok/api-sdk-d3';
import { convertToApiEnumFormat } from '@nikon-trimble-sok/api-sdk-d3';
import {
  ConstructionFilterDateType,
  ConstructionFilterElevationType,
  ConstructionFilterMachineDirectionType,
  ConstructionFilterType,
  ConstructionFilterVibeStateType,
  DEFAULT_CONSTRUCTIONFILTER,
  toConstructionFilterType,
} from 'src/app/helper-utility/api-helper/projects-models';

export const PLACEHOLDER_ICT_SELECT = 'ICT建機を選択';
export const PLACEHOLDER_AREA_SELECT = '領域を選択';
export const TabType = {
  all: 0,
  cut: 1,
  fill: 2,
} as const;
export type TabType = (typeof TabType)[keyof typeof TabType];
export class ViewModel {
  areaEnabled: boolean;
  enabledTabType: TabType;
  enabledTabTypeIsCut: boolean;
  enabledTabTypeIsFill: boolean;
  previousEnabledTabType: TabType;
  filterList: ViewConstructionFilter[];
  tabTypeCut: TabType = TabType.cut;
  tabTypeFill: TabType = TabType.fill;

  constructor() {
    this.areaEnabled = false;
    this.enabledTabType = TabType.all;
    this.enabledTabTypeIsCut = false;
    this.enabledTabTypeIsFill = false;
    this.previousEnabledTabType = TabType.cut;
    this.filterList = [];
    const defaultFilter = DEFAULT_CONSTRUCTIONFILTER;
    defaultFilter.filterType = ConstructionFilterType.SystemDefault;
    this.filterList[TabType.all] = new ViewConstructionFilter(defaultFilter);
    defaultFilter.filterType = ConstructionFilterType.SystemCutting;
    this.filterList[TabType.cut] = new ViewConstructionFilter(defaultFilter);
    defaultFilter.filterType = ConstructionFilterType.SystemFilling;
    this.filterList[TabType.fill] = new ViewConstructionFilter(defaultFilter);
  }

  setTabType(tabType: TabType) {
    if (this.enabledTabType !== TabType.all) {
      this.previousEnabledTabType = this.enabledTabType;
    }
    this.enabledTabType = tabType;
    this.enabledTabTypeIsCut = tabType === TabType.cut;
    this.enabledTabTypeIsFill = tabType !== TabType.cut;
  }

  getFilter(tabType: TabType): ViewConstructionFilter {
    return this.filterList[tabType];
  }

  getSelectedFilter(): ViewConstructionFilter {
    return this.filterList[this.enabledTabType];
  }
}

export class ViewConstructionFilter {
  id?: string | null;
  name?: string | null;
  filterType?: ConstructionFilterType | null;
  dateType?: ConstructionFilterDateType;
  stateUtc?: Date;
  endUtc?: Date;
  machineIds?: Array<number> | null;
  onMachineDesignId?: number;
  elevationType?: ConstructionFilterElevationType;
  vibeState?: ConstructionFilterVibeStateType;
  machineDirection?: ConstructionFilterMachineDirectionType;
  boundaryIds?: Array<string> | null;

  constructor(filter: ConstructionFilter) {
    this.applyConstructionFilter(filter);
  }

  applyConstructionFilter(filter: ConstructionFilter) {
    this.id = filter.id;
    this.name = filter.name;
    this.filterType = toConstructionFilterType(filter.filterType);
    this.dateType = filter.dateType;
    this.stateUtc = filter.stateUtc;
    this.endUtc = filter.endUtc;
    this.machineIds = filter.machineIds;
    this.onMachineDesignId = filter.onMachineDesignId;
    this.elevationType = filter.elevationType;
    this.vibeState = filter.vibeState;
    this.machineDirection = filter.machineDirection;
    this.boundaryIds = filter.boundaryIds;
  }

  getConstructionFilter(): ConstructionFilter {
    const filter: ConstructionFilter = {
      id: null,
      name: null,
      filterType: '',
      dateType: undefined,
      stateUtc: undefined,
      endUtc: undefined,
      machineIds: null,
      onMachineDesignId: undefined,
      elevationType: undefined,
      vibeState: undefined,
      machineDirection: undefined,
      boundaryIds: [],
    };
    filter.id = this.id;
    filter.name = this.name;
    filter.filterType = this.filterType;
    if (this.dateType === 0 || this.dateType) {
      filter.dateType = convertToApiEnumFormat<ConstructionFilterDateTypes>(
        this.dateType,
      );
    }
    filter.stateUtc = this.stateUtc;
    filter.endUtc = this.endUtc;
    if (this.machineIds) {
      filter.machineIds = [];
      this.machineIds.forEach((item) => {
        filter.machineIds?.push(Number(item));
      });
    }
    filter.onMachineDesignId = Number(this.onMachineDesignId);

    if (this.elevationType === 0 || this.elevationType) {
      filter.elevationType =
        convertToApiEnumFormat<ConstructionFilterElevationTypes>(
          this.elevationType,
        );
    }

    if (this.vibeState === 0 || this.vibeState) {
      filter.vibeState =
        convertToApiEnumFormat<ConstructionFilterVibeStateTypes>(
          this.vibeState,
        );
    }

    if (this.machineDirection === 0 || this.machineDirection) {
      filter.machineDirection =
        convertToApiEnumFormat<ConstructionFilterMachineDirectionTypes>(
          this.machineDirection,
        );
    }
    if (this.filterType === ConstructionFilterType.SystemDefault) {
      filter.boundaryIds = [];
    } else {
      filter.boundaryIds = this.boundaryIds;
    }

    return filter;
  }
}
