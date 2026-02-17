import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DeletableSelectDataItem } from '@nikon-trimble-sok/parts-components';
import { ActivitySettingsSaveActivityModalComponent } from './modal/save-activity/save-activity.component';
import {
  Alignment,
  AlignmentsService,
  AlignmentStationsService,
  ConstructionActivity,
  ConstructionSettings,
  CutFillVolume,
  Model,
  ModelKinds,
  ModelStatusTypes,
  ModelTypes,
  ResponseAlignmentStations,
  StationAndText,
} from '@nikon-trimble-sok/api-sdk-d3';
import {
  MAX_DATE_INTERVAL_YEAR,
  MAX_OFFSET,
  MIN_DATE,
  MIN_OFFSET,
  MODAL_MESSAGE_CONFIRM,
  MODAL_MESSAGE_CONFIRM_UPDATE,
  MODAL_PLACEHOLDER_ADD_ACTIVITY,
  MODAL_PLACEHOLDER_CHANGE_ACTIVITY_NAME,
  MODAL_TITLE_ADD_ACTIVITY,
  MODAL_TITLE_CHANGE_ACTIVITY_NAME,
  MODAL_TITLE_CONFIRM,
  MODAL_TITLE_CONFIRM_UPDATE,
  TabType,
  TargetAreaType,
  ViewModel,
} from './activity-settings.defination';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { Store } from '@ngrx/store';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { AreaDisplayControlAction } from 'src/app/stores/actions/project/are-display-control.action';
import {
  ConstructionActivitySubType,
  DEAULT_CONSTRUCTIONACTIVITY,
  LockFuncName,
} from 'src/app/helper-utility/api-helper/projects-models';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  Subject,
  takeUntil,
} from 'rxjs';
import { ConstructionActivitySelector } from 'src/app/stores/selectors/project/construction-activity.selector';
import { BasicDeletableSelectComponent } from '@nikon-trimble-sok/parts-components';
import { ConstructionActivityAction } from 'src/app/stores/actions/project/construction-activity.action';
import { Actions, ofType } from '@ngrx/effects';
import {
  NtcModusDateInputComponent,
  NtcModusSelectComponentOptionType,
} from '@nikon-trimble-sok/modus-wrapper';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { UpdateState } from 'src/app/stores/states/project/construction-activity.state';
import { ActivitySettingsConfirmModalComponent } from './modal/confirm/confirm.component';
import { ConstructionSettingsSelector } from 'src/app/stores/selectors/project/construction-settings.selector';
import {
  isError,
  ValidatorMax,
} from 'src/app/helper-utility/form-helper/form-helper';
import { BaseUnitInputComponent } from '@nikon-trimble-sok/parts-components';
import { NotificationManipulator } from 'src/app/stores/states/delayed-task/notification-management';
import {
  ExecutionManagementState,
  ExecutiveFunctions,
} from 'src/app/stores/states/delayed-task/delayed-task-definitions';
import { NotificationManagementAction } from 'src/app/stores/actions/delayed-task/notification-management.action';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { DigitPipe } from '@nikon-trimble-sok/parts-components';
import {
  nonWorkingDays,
  remainingNonWorkingDays,
  remainingWorkingDays,
} from '../../dashboard-view.defination';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import { ProjectListSelector } from 'src/app/stores/selectors/project-list/ProjectListState.selector';
import { ModelSelector } from 'src/app/stores/selectors/project/model.selector';
import { ModelAction } from 'src/app/stores/actions/project/model.action';
import { ConstructionProgressSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/construction-progress.selector';
import { NumberFormatHelperService } from 'src/app/helper-utility/number-format-helper/number-format-helper.service';
import { ModelTypeHelper } from 'src/app/helper-utility/model-helper/model-type-helper';

export type AlignmentCache = {
  alignmentId: string;
  alignment: Alignment;
  alignmentStations: ResponseAlignmentStations;
};

export type StationTextCache = {
  key: string;
  value: string;
};

@Component({
  selector: 'ntc-project-dashboard-view-activity-settings',
  templateUrl: './activity-settings.component.html',
  styleUrl: './activity-settings.component.scss',
})
export class ActivitySettingsComponent
  extends BaseComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  public isLoading: boolean = true;

  // Loading state for alignment station data
  public isAlignmentLoading: boolean = false;

  public projectId: string | undefined;

  protected readonly DIGIT_DISPLAY = 1;

  @Input() public openSaveModal: boolean = false;

  @Output() emitOnCloseSaveModal = new EventEmitter();

  @ViewChild('saveActivityModal') saveActivityModal:
    | ActivitySettingsSaveActivityModalComponent
    | undefined;

  @ViewChild('confirmModal') confirmModal:
    | ActivitySettingsConfirmModalComponent
    | undefined;

  @ViewChild('selectActivityComponent')
  selectActivityComponent: BasicDeletableSelectComponent | undefined;

  @ViewChild('startDateInput') startDateInput:
    | NtcModusDateInputComponent
    | undefined;

  @ViewChild('endDateInput') endDateInput:
    | NtcModusDateInputComponent
    | undefined;

  @ViewChild('rateForOneDayInput') rateForOneDayInput:
    | BaseUnitInputComponent
    | undefined;

  @ViewChild('leftOffsetInput') leftOffsetInput:
    | BaseUnitInputComponent
    | undefined;

  @ViewChild('rightOffsetInput') rightOffsetInput:
    | BaseUnitInputComponent
    | undefined;

  protected form = new FormGroup({
    selectActivity: new FormControl<{ label: string; id: string } | undefined>(
      undefined,
      { nonNullable: true },
    ),
    selectSubType: new FormControl<number>(
      ConstructionActivitySubType.cutfill,
      { nonNullable: true },
    ),
    selectDesignSurface: new FormControl<NtcModusSelectComponentOptionType>(
      { id: '', display: '' },
      { nonNullable: true },
    ),
    selectExistingGround: new FormControl<NtcModusSelectComponentOptionType>(
      { id: '', display: '' },
      { nonNullable: true },
    ),
    selectTargetArea: new FormControl<number>(TargetAreaType.Project, {
      nonNullable: true,
    }),
    selectBoundary: new FormControl<NtcModusSelectComponentOptionType>(
      { id: '', display: '' },
      { nonNullable: true },
    ),
    selectAlignment: new FormControl<NtcModusSelectComponentOptionType>(
      { id: '', display: '' },
      { nonNullable: true },
    ),
    startStation: new FormControl<number>(0, { nonNullable: true }),
    endStation: new FormControl<number>(0, { nonNullable: true }),
    selectStartStation: new FormControl<number>(0, { nonNullable: true }),
    selectEndStation: new FormControl<number>(0, { nonNullable: true }),
    leftOffset: new FormControl<number>(0, [
      ValidatorMax(MIN_OFFSET, MAX_OFFSET),
    ]),
    rightOffset: new FormControl<number>(0, [
      ValidatorMax(MIN_OFFSET, MAX_OFFSET),
    ]),
    startDate: new FormControl<string | null>('', [Validators.required]),
    endDate: new FormControl<string | null>('', [Validators.required]),
    rateForOneDay: new FormControl<number>(0, { nonNullable: true }),
  });

  // 計算条件設定
  private constructionSettings?: ConstructionSettings;

  public sliderMax: number = 0;

  // Station selection dropdown options
  public startStationOptions: { id: number; display: string }[] = [];
  public endStationOptions: { id: number; display: string }[] = [];

  // Filtered station options based on current selection
  public filteredStartStationOptions: { id: number; display: string }[] = [];
  public filteredEndStationOptions: { id: number; display: string }[] = [];

  // Current selected station values for dropdowns
  public selectedStartStationIndex: number = 0;
  public selectedEndStationIndex: number = 0;

  // Flag to prevent infinite loop during synchronization
  private isSynchronizing: boolean = false;

  public minOffsetWidth: string = `${MIN_OFFSET}`;

  public maxOffsetWidth: string = `${MAX_OFFSET}`;

  public optionsActivity: DeletableSelectDataItem[] | undefined;

  public optionsSubType = [
    { text: '切土盛土', value: ConstructionActivitySubType.cutfill },
    { text: '切土', value: ConstructionActivitySubType.cut },
    { text: '盛土', value: ConstructionActivitySubType.fill },
  ];
  public optionsDesignSurface: NtcModusSelectComponentOptionType[] = [];
  public optionsExistingGround: NtcModusSelectComponentOptionType[] = [];
  public optionsTargetArea = [
    { text: '現場全体', value: TargetAreaType.Project },
    { text: 'カスタム領域を指定', value: TargetAreaType.Custom },
    { text: '線形ステーションを指定', value: TargetAreaType.Alignment },
  ];
  public optionsBoundary: NtcModusSelectComponentOptionType[] = [];
  public optionsAlignment: NtcModusSelectComponentOptionType[] = [];
  public strEndDate: string = '';
  public workingDayCount: string = '--';

  public modelListExistingGround: Model[] = [];

  public surveyDateTime: Date | undefined;

  public viewModel: ViewModel;

  protected errorList: string[] = [];

  private initialized: boolean = false;

  private updating: boolean = false;

  private lastSelectedActivityId: string | null = null;

  public isDateRangeValid: boolean = true;

  private alignmentCacheList: AlignmentCache[] = [];

  private alignmentId: string | undefined;

  private stationInterval: number | undefined;

  public isStationDisabled: boolean = true;

  public startStationText: string | undefined;

  public endStationText: string | undefined;

  private stationList: StationAndText[] = [];

  private currentVolume: CutFillVolume | undefined;
  public cutEstimateVolume: number = 0.0;
  public fillEstimateVolume: number = 0.0;
  public totalEstimateVolume: number = 0.0;

  public isUpdatable: boolean = false;
  public isCurrentActivitySelected: boolean = false;
  private updateActivityList: boolean = false;
  public mouseDown: boolean = false;
  private closeOnEnd: boolean = false;
  private onDestroySubject$ = new Subject();
  public checkLocks: boolean = false;

  public today: Date = new Date();

  public readonly todayStr = this.today
    .toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replaceAll('/', '-');

  public readonly minDateStr = MIN_DATE.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replaceAll('/', '-');

  public readonly maxDateStr = new Date(
    this.today.getFullYear() + MAX_DATE_INTERVAL_YEAR,
    this.today.getMonth(),
    this.today.getDate(),
  )
    .toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replaceAll('/', '-');

  public initialStartStation: number = 0;
  public initialEndStation: number = 0;

  private is3DEnabled: boolean = false;

  protected readonly formatter = new NumberFormatHelperService();

  // セレクト用タイプアイコンリスト
  public modelTypeIconList: Record<string, string> = {};

  constructor(
    private actions$: Actions,
    private store: Store<ApplicationState>,
    private alignmentsService: AlignmentsService,
    private alignmentStationsService: AlignmentStationsService,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('ActivitySettingsComponent');
    this.viewModel = new ViewModel();

    // select projectId
    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectId)
        .subscribe((projectId) => {
          this.projectId = projectId;
        }),
    );

    // on add activity
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            ConstructionActivityAction.PostConstructionActivityCompleteAction,
          ),
        )
        .subscribe((result) => {
          if (
            result.addedConstructionActivity &&
            result.addedConstructionActivity.id &&
            result.addedConstructionActivity.name
          ) {
            this.selectActivityComponent?.select({
              id: result.addedConstructionActivity.id,
              label: result.addedConstructionActivity.name ?? '',
            });
            this.lastSelectedActivityId = result.addedConstructionActivity.id;
            this.applyValueByActivity(result.addedConstructionActivity);
          }
        }),
    );

    // on patch activity
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            ConstructionActivityAction.PatchConstructionActivityCompleteAction,
          ),
        )
        .subscribe((result) => {
          if (
            result.patchedConstructionActivity &&
            result.patchedConstructionActivity.id &&
            result.patchedConstructionActivity.name
          ) {
            this.selectActivityComponent?.select({
              id: result.patchedConstructionActivity.id,
              label: result.patchedConstructionActivity.name ?? '',
            });
            this.lastSelectedActivityId = result.patchedConstructionActivity.id;
            this.applyValueByActivity(result.patchedConstructionActivity);
          }
        }),
    );

    // on delete activity
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            ConstructionActivityAction.DeleteConstructionActivityCompleteAction,
          ),
        )
        .subscribe((result) => {
          if (!result.activityId || !this.optionsActivity) {
            return;
          }
          if (this.optionsActivity.length <= 0) {
            this.isStationDisabled = true;
            this.isCurrentActivitySelected = false;
            this.lastSelectedActivityId = null;
            this.selectActivityComponent?.handlePlaceHolder();
            this.viewModel.applyConstructionActivity(
              DEAULT_CONSTRUCTIONACTIVITY,
            );
            this.viewModel.selectedTargetArea = undefined;
            this.updateForm(true);
            this.form.controls['selectSubType'].disable({ emitEvent: false });
            this.form.controls['selectDesignSurface'].disable({
              emitEvent: false,
            });
            this.form.controls['selectExistingGround'].disable({
              emitEvent: false,
            });
            this.form.controls['selectTargetArea'].disable({
              emitEvent: false,
            });
            this.form.controls['startDate'].disable({ emitEvent: false });
            this.form.controls['endDate'].disable({ emitEvent: false });
            this.form.controls['rateForOneDay'].disable({ emitEvent: false });

            this.form.controls['selectBoundary'].disable({ emitEvent: false });
            this.form.controls['selectAlignment'].disable({ emitEvent: false });
            this.form.controls['startStation'].disable({ emitEvent: false });
            this.form.controls['endStation'].disable({ emitEvent: false });
            this.form.controls['leftOffset'].disable({ emitEvent: false });
            this.form.controls['rightOffset'].disable({ emitEvent: false });
          } else {
            if (this.lastSelectedActivityId == result.activityId) {
              if (
                this.constructionSettings?.constructionActivityId &&
                this.constructionSettings.constructionActivityId !=
                  result.activityId
              ) {
                this.applyValueByActivity(
                  this.constructionSettings?.constructionActivityId,
                );
              } else {
                this.lastSelectedActivityId = this.optionsActivity[0].id;
                this.selectActivityComponent?.select(
                  this.optionsActivity[0].id,
                );
                this.lastSelectedActivityId = this.optionsActivity[0].id;
                this.applyValueByActivity(this.optionsActivity[0].id);
              }
            }
          }
        }),
    );

    // catch api error
    this.addSubscriptionsList(
      this.store
        .select(ConstructionActivitySelector.selectErrorMessage)
        .subscribe((errorList) => {
          this.errorList = [];
          if (errorList && errorList.length > 0) {
            this.errorList = errorList;
          }
        }),
    );

    // wmProject取得
    this.addSubscriptionsList(
      this.store
        .select(ProjectListSelector.selectorWmProjectLinkWithName)
        .subscribe((wmProjectLinkWithName) => {
          this.is3DEnabled =
            ((!wmProjectLinkWithName || wmProjectLinkWithName.projectType) ??
              0) === 1;
        }),
    );

    // constructionProgress取得
    this.addSubscriptionsList(
      this.store
        .select(ConstructionProgressSelector.selectorConstructionProgress)
        .subscribe((constructionProgressState) => {
          // カレントアクティビティ計算結果
          if (
            constructionProgressState?.rawData &&
            constructionProgressState?.rawData.length > 0 &&
            constructionProgressState?.rawData[0].design
          ) {
            this.currentVolume = constructionProgressState?.rawData[0].design;
            this.calculateTotal();
          }
        }),
    );

    // モデルリスト更新
    this.store.dispatch(ModelAction.GetListAction());
  }

  ngAfterViewInit(): void {
    this.checkTargetArea();

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ModelSelector.selectActiveList),
        this.store.select(
          ConstructionActivitySelector.selectConstructionActivityState,
        ),
        this.store.select(
          ConstructionActivitySelector.selectConstructionActivityUpdateState,
        ),
        this.store.select(
          ConstructionSettingsSelector.selectConstructionSettings,
        ),
      ])
        .pipe(takeUntil(this.onDestroySubject$))
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return (
              prev[0]?.length === curr[0]?.length &&
              prev[1]?.inProcess === curr[1]?.inProcess &&
              this.isArrayEqual(
                prev[1]?.constructionActivityList,
                curr[1]?.constructionActivityList,
              ) &&
              prev[2] === curr[2] &&
              prev[3]?.inProcess === curr[3]?.inProcess &&
              JSON.stringify(prev[3]) == JSON.stringify(curr[3])
            );
          }),
        )
        .subscribe((value) => {
          this.isLoading =
            (!value[0] || value[1]?.inProcess || value[3]?.inProcess) ?? true;

          // model
          if (!this.initialized && value[0]) {
            this.initialized = true;
            this.optionsDesignSurface = [];
            this.optionsExistingGround = [];
            this.modelListExistingGround = [];
            this.optionsBoundary = [];
            this.optionsBoundary.push({ id: '', display: '指定なし' });
            this.optionsAlignment = [];
            this.optionsAlignment.push({ id: '', display: '指定なし' });
            if (value[0]) {
              value[0].forEach((model) => {
                // 設計データ
                if (
                  model.modelType === ModelTypes.NUMBER_3 &&
                  model.modelKind === ModelKinds.NUMBER_3 &&
                  model.modelStatus === ModelStatusTypes.NUMBER_0
                ) {
                  this.optionsDesignSurface?.push({
                    display: model.name ?? '',
                    id: '' + model.id,
                  });
                }
                // 起工測量データ
                if (
                  ((model.modelType === ModelTypes.NUMBER_3 &&
                    model.modelKind === ModelKinds.NUMBER_1) ||
                    (model.modelType === ModelTypes.NUMBER_5 &&
                      model.modelKind === ModelKinds.NUMBER_1)) &&
                  model.modelStatus === ModelStatusTypes.NUMBER_0
                ) {
                  this.optionsExistingGround?.push({
                    display: model.name ?? '',
                    id: '' + model.id,
                  });
                  this.modelListExistingGround.push(model);
                }
                // 境界線データ
                if (
                  model.modelType === ModelTypes.NUMBER_11 &&
                  model.modelStatus === ModelStatusTypes.NUMBER_0
                ) {
                  this.optionsBoundary?.push({
                    display: model.name ?? '',
                    id: '' + model.id,
                  });
                }
                // 線形データ
                if (
                  (model.modelType === ModelTypes.NUMBER_2 ||
                    model.modelType === ModelTypes.NUMBER_10) &&
                  model.modelStatus === ModelStatusTypes.NUMBER_0
                ) {
                  this.optionsAlignment?.push({
                    display: model.name ?? '',
                    id: '' + model.id,
                  });
                }
              });

              // タイプアイコンリスト生成
              this.modelTypeIconList = ModelTypeHelper.makeTypeIconList(
                value[0] ?? [],
                this.modelTypeIconList,
              );

              this.checkTargetArea();
            }
          }

          // 進捗確認設定
          if (
            value[1]?.constructionActivityList &&
            this.viewModel.activityList.length !=
              value[1].constructionActivityList.length
          ) {
            if (!this.optionsActivity) {
              this.updateActivityList = true;
            }
            const tmpConstructionActivityList = [
              ...value[1].constructionActivityList,
            ];
            const constructionActivityList = tmpConstructionActivityList.sort(
              constructionActivitySortByName,
            );
            this.viewModel.activityList = [...constructionActivityList];
            this.optionsActivity = [];
            constructionActivityList?.forEach((item) => {
              this.optionsActivity?.push({
                label: item.name ?? '',
                id: '' + item.id,
              });
            });
          } else if (
            // 空で初期化
            value[1]?.constructionActivityList &&
            value[1]?.constructionActivityList.length <= 0
          ) {
            this.optionsActivity = [];
          }

          // 進捗確認設定が１件もない場合は追加モーダルを開く
          if (this.optionsActivity && this.optionsActivity.length <= 0) {
            this.onAddActivity();
          }

          // 更新フラグ
          if (value[2] === UpdateState.IN_PROCESS) {
            this.updating = true;
          } else if (this.updating && value[2] === UpdateState.DONE) {
            // updating true -> false
            this.updating = false;
          } else if (this.updating && value[2] === UpdateState.ERROR) {
            // updating true -> error
            this.updating = false;
          } else {
            this.updating = false;
          }

          // 計算条件設定
          if (
            value[3]?.constructionSettings &&
            JSON.stringify(this.constructionSettings) !=
              JSON.stringify(value[3].constructionSettings)
          ) {
            this.constructionSettings = {
              ...value[3].constructionSettings,
            };
          }

          if (!this.isLoading) {
            // 計算条件設定に応じて進捗確認設定選択タブの状態切り替え
            if (!this.constructionSettings) {
              if (this.selectActivityComponent) {
                this.form.controls['selectActivity'].disable({
                  emitEvent: false,
                });
              }
            } else {
              if (this.selectActivityComponent) {
                this.form.controls['selectActivity'].enable({
                  emitEvent: false,
                });
              }
            }
          }

          if (!this.isLoading && this.updateActivityList) {
            this.updateActivityList = false;

            // タイミングをずらしてForm/viewModel初期化
            setTimeout(() => {
              this.initView();
            });
          }
        }),
    );

    // 進捗確認からの呼び出し時
    if (this.openSaveModal) {
      this.onAddActivity();
    }
  }

  ngOnInit(): void {
    this.isStationDisabled = true;
    this.isCurrentActivitySelected = false;

    this.form.controls['selectActivity'].disable({ emitEvent: false });
    this.form.controls['selectSubType'].disable({ emitEvent: false });
    this.form.controls['selectDesignSurface'].disable({ emitEvent: false });
    this.form.controls['selectExistingGround'].disable({ emitEvent: false });
    this.form.controls['selectTargetArea'].disable({ emitEvent: false });
    this.form.controls['startDate'].disable({ emitEvent: false });
    this.form.controls['endDate'].disable({ emitEvent: false });
    this.form.controls['rateForOneDay'].disable({ emitEvent: false });

    this.form.controls['selectBoundary'].disable({ emitEvent: false });
    this.form.controls['selectAlignment'].disable({ emitEvent: false });
    this.form.controls['startStation'].disable({ emitEvent: false });
    this.form.controls['endStation'].disable({ emitEvent: false });
    this.form.controls['leftOffset'].disable({ emitEvent: false });
    this.form.controls['rightOffset'].disable({ emitEvent: false });

    // on change selectActivity
    this.addSubscriptionsList(
      this.form.controls['selectActivity'].valueChanges.subscribe((value) => {
        if (value) {
          this.isCurrentActivitySelected = true;
          this.form.controls['selectSubType'].enable({ emitEvent: false });
          this.form.controls['selectDesignSurface'].enable({
            emitEvent: false,
          });
          this.form.controls['selectExistingGround'].enable({
            emitEvent: false,
          });
          this.form.controls['selectTargetArea'].enable({ emitEvent: false });
          this.form.controls['startDate'].enable({ emitEvent: false });
          this.form.controls['endDate'].enable({ emitEvent: false });
          this.form.controls['rateForOneDay'].enable({ emitEvent: false });
        } else {
          this.isCurrentActivitySelected = false;
          this.form.controls['selectSubType'].disable({ emitEvent: false });
          this.form.controls['selectDesignSurface'].disable({
            emitEvent: false,
          });
          this.form.controls['selectExistingGround'].disable({
            emitEvent: false,
          });
          this.form.controls['selectTargetArea'].disable({ emitEvent: false });
          this.form.controls['startDate'].disable({ emitEvent: false });
          this.form.controls['endDate'].disable({ emitEvent: false });
          this.form.controls['rateForOneDay'].disable({ emitEvent: false });
        }
        if (this.lastSelectedActivityId === value?.id) {
          return;
        }

        if (value?.id) {
          this.lastSelectedActivityId = value?.id;
          this.applyValueByActivity(value.id);
        } else {
          this.lastSelectedActivityId = null;
          this.viewModel.applyConstructionActivity(DEAULT_CONSTRUCTIONACTIVITY);
          this.viewModel.selectedTargetArea = undefined;
          this.updateForm(true);
        }
      }),
    );

    // on change selectSubType
    this.addSubscriptionsList(
      this.form.controls['selectSubType'].valueChanges.subscribe((value) => {
        this.viewModel.currentActivity.activitySubType = value;
        this.calculateTotal();
      }),
    );

    // on change selectDesignSurface
    this.addSubscriptionsList(
      this.form.controls['selectDesignSurface'].valueChanges.subscribe(
        (value) => {
          if (value) {
            this.viewModel.currentActivity.designSurfaceId = '' + value.id;
          } else {
            this.viewModel.currentActivity.designSurfaceId = undefined;
          }
          this.checkUpdatable();
        },
      ),
    );

    // on change selectExistingGround
    this.addSubscriptionsList(
      this.form.controls['selectExistingGround'].valueChanges.subscribe(
        (value) => {
          if (value) {
            this.viewModel.currentActivity.existingGroundId = '' + value.id;
          } else {
            this.viewModel.currentActivity.existingGroundId = undefined;
          }
          this.checkUpdatable();
          const model = this.modelListExistingGround.find(
            (model) => model.id == '' + value.id,
          );
          if (model) {
            this.surveyDateTime = model.dateTime;
            this.validateModelDate(model);
          } else {
            this.surveyDateTime = undefined;
          }
        },
      ),
    );

    // on change selectTargetArea
    this.addSubscriptionsList(
      this.form.controls['selectTargetArea'].valueChanges.subscribe(
        (value: number) => {
          this.viewModel.targetArea = value as TargetAreaType;
          this.viewModel.selectedTargetArea = value as TargetAreaType;
          this.checkTargetArea();
        },
      ),
    );

    // on change selectBoundary
    this.addSubscriptionsList(
      this.form.controls['selectBoundary'].valueChanges.subscribe((value) => {
        if (value) {
          this.viewModel.currentActivity.boundaryId = '' + value.id;
        } else {
          this.viewModel.currentActivity.boundaryId = undefined;
        }
      }),
    );

    // on change selectAlignment
    this.addSubscriptionsList(
      this.form.controls['selectAlignment'].valueChanges.subscribe((value) => {
        let alignmentId: string | undefined = undefined;
        if (value) {
          alignmentId = '' + value.id;
        } else {
          // do nothing
        }

        if (this.viewModel.currentActivity.alignmentId == alignmentId) {
          return;
        }
        this.viewModel.currentActivity.alignmentId = alignmentId;

        this.initializeStation();

        if (!alignmentId) {
          this.alignmentId = undefined;
          return;
        }
        this.selectAlignmentModel();
      }),
    );

    // on change startStation
    this.addSubscriptionsList(
      this.form.controls['startStation'].valueChanges.subscribe((value) => {
        if (this.isSynchronizing) return;

        const startStationValue = this.getStationValueFromIndex(
          this.stationList,
          value,
        );
        if (value <= this.form.controls['endStation'].value) {
          this.viewModel.currentActivity.startStation = startStationValue;
          // Update dropdown to match slider
          this.isSynchronizing = true;
          this.form.controls['selectStartStation'].patchValue(value, {
            emitEvent: false,
          });
          this.selectedStartStationIndex = value;
          // Update filtered options when slider changes
          this.updateFilteredStationOptions();
          this.isSynchronizing = false;
        } else {
          const endStationValue = this.getStationValueFromIndex(
            this.stationList,
            this.form.controls['endStation'].value,
          );
          this.viewModel.currentActivity.startStation = endStationValue;

          this.form.controls['startStation'].patchValue(
            this.form.controls['endStation'].value,
            { emitEvent: false },
          );
          // Update dropdown to match corrected slider value
          this.isSynchronizing = true;
          this.form.controls['selectStartStation'].patchValue(
            this.form.controls['endStation'].value,
            { emitEvent: false },
          );
          this.selectedStartStationIndex =
            this.form.controls['endStation'].value;
          // Update filtered options when slider changes
          this.updateFilteredStationOptions();
          this.isSynchronizing = false;
        }
      }),
    );

    // on change startStation
    this.addSubscriptionsList(
      this.form.controls['startStation'].valueChanges.subscribe(() => {
        this.getStartStationText();
      }),
    );

    // on change endStation
    this.addSubscriptionsList(
      this.form.controls['endStation'].valueChanges.subscribe((value) => {
        if (this.isSynchronizing) return;

        const endStationValue = this.getStationValueFromIndex(
          this.stationList,
          value,
        );
        this.viewModel.currentActivity.endStation = endStationValue;
        // Update dropdown to match slider
        this.isSynchronizing = true;
        this.form.controls['selectEndStation'].patchValue(value, {
          emitEvent: false,
        });
        this.selectedEndStationIndex = value;
        // Update filtered options when slider changes
        this.updateFilteredStationOptions();
        this.isSynchronizing = false;

        if (this.form.controls['startStation'].value > value) {
          this.form.controls['startStation'].patchValue(value);
          // Update start station dropdown as well
          this.isSynchronizing = true;
          this.form.controls['selectStartStation'].patchValue(value, {
            emitEvent: false,
          });
          this.selectedStartStationIndex = value;
          // Update filtered options when both stations change
          this.updateFilteredStationOptions();
          this.isSynchronizing = false;
        }
      }),
    );

    // on change endStation
    this.addSubscriptionsList(
      this.form.controls['endStation'].valueChanges.subscribe(() => {
        this.getEndStationText();
      }),
    );

    // on change leftOffset
    this.addSubscriptionsList(
      this.form.controls['leftOffset'].valueChanges
        .pipe(filter((value): value is number => value !== null))
        .subscribe((value: number) => {
          this.viewModel.currentActivity.leftOffset = value;
          if (!this.leftOffsetInput) {
            return;
          }
          if (this.form.controls['leftOffset'].errors?.['max']) {
            this.leftOffsetInput.errorText = this.extractAppMessage('SOK1016', [
              this.minOffsetWidth,
              this.maxOffsetWidth,
            ]);
          } else {
            this.leftOffsetInput.errorText = '';
          }
        }),
    );

    // on change rightOffset
    this.addSubscriptionsList(
      this.form.controls['rightOffset'].valueChanges
        .pipe(filter((value): value is number => value !== null))
        .subscribe((value: number) => {
          this.viewModel.currentActivity.rightOffset = value;
          if (!this.rightOffsetInput) {
            return;
          }
          if (this.form.controls['rightOffset'].errors?.['max']) {
            this.rightOffsetInput.errorText = this.extractAppMessage(
              'SOK1016',
              [this.minOffsetWidth, this.maxOffsetWidth],
            );
          } else {
            this.rightOffsetInput.errorText = '';
          }
        }),
    );

    // on change startDate
    this.addSubscriptionsList(
      this.form.controls['startDate'].valueChanges.subscribe((value) => {
        if (!this.startDateInput) {
          return;
        }

        if (!value) {
          this.isDateRangeValid = false;
          this.viewModel.currentActivity.startTime = undefined;
          // 日当たり施工数量のゼロ初期化
          this.resetRateForOneDay('--');
          this.startDateInput.errorText = this.extractAppMessage(
            'SOK1001',
            '開始日',
          );
        }

        if (
          !value ||
          !this.form.controls['endDate'].getRawValue() ||
          !this.startDateInput.isValidFormatDate ||
          !this.endDateInput?.isValidFormatDate
        ) {
          this.isDateRangeValid = false;
          return;
        }

        const startDate = new Date(value);
        const endDate = new Date(
          this.form.controls['endDate'].getRawValue() ?? '',
        );
        if (startDate.getTime() > endDate.getTime()) {
          this.startDateInput.errorText = this.extractAppMessage('SOK1006');
          this.isDateRangeValid = false;

          // 日当たり施工数量のゼロ初期化
          this.resetRateForOneDay('--');
        } else {
          this.startDateInput.errorText = undefined;
          this.isDateRangeValid = true;
          this.viewModel.currentActivity.startTime = startDate;

          // 日当たり施工数量更新
          this.updateRateForOneDay(startDate, endDate);
        }
      }),
    );

    // on change endDate
    this.addSubscriptionsList(
      this.form.controls['endDate'].valueChanges.subscribe((value) => {
        if (!this.endDateInput || !this.startDateInput) {
          return;
        }

        if (!value) {
          this.isDateRangeValid = false;
          this.viewModel.currentActivity.endTime = undefined;
          this.endDateInput.errorText = this.extractAppMessage(
            'SOK1001',
            '終了日',
          );

          // 日当たり施工数量のゼロ初期化
          this.resetRateForOneDay('--');
        } else if (this.endDateInput.isValidFormatDate) {
          this.endDateInput.errorText = undefined;
        }

        if (
          this.form.controls['startDate'].getRawValue() &&
          this.startDateInput.isValidFormatDate
        ) {
          this.startDateInput.errorText = undefined;
        }

        if (
          !value ||
          !this.form.controls['startDate'].getRawValue() ||
          !this.startDateInput.isValidFormatDate ||
          !this.endDateInput?.isValidFormatDate
        ) {
          this.isDateRangeValid = false;
          return;
        }

        const startDate = new Date(
          this.form.controls['startDate'].getRawValue() ?? '',
        );
        const endDate = new Date(value);
        if (startDate.getTime() > endDate.getTime()) {
          this.startDateInput.errorText = this.extractAppMessage('SOK1006');
          this.isDateRangeValid = false;

          // 日当たり施工数量のゼロ初期化
          this.resetRateForOneDay('--');
        } else {
          this.startDateInput.errorText = undefined;
          this.isDateRangeValid = true;
          this.viewModel.currentActivity.endTime = endDate;

          // 日当たり施工数量更新
          this.updateRateForOneDay(startDate, endDate);
        }
      }),
    );

    // on change rateForOneDay
    this.addSubscriptionsList(
      this.form.controls['rateForOneDay'].valueChanges.subscribe(
        (value: number) => {
          if (
            this.isDateRangeValid &&
            this.viewModel.currentActivity.rateForOneDay != value
          ) {
            const startDate = new Date(
              this.form.controls['startDate'].getRawValue() ?? '',
            );
            this.updateEndDate(startDate, value);
          }
        },
      ),
    );
  }

  /**
   * 終了日更新
   */
  private updateEndDate(startDate: Date, rateForOneDay: number) {
    let dayCount = undefined;
    if (
      this.totalEstimateVolume &&
      this.totalEstimateVolume > 0 &&
      rateForOneDay &&
      rateForOneDay > 0
    ) {
      dayCount = Math.ceil(this.totalEstimateVolume / rateForOneDay);
    } else {
      dayCount = 0;
    }

    // 開始日分減算
    if (dayCount > 0) {
      dayCount--;
    }

    const toDate = new Date(startDate);
    let tmpEndDate = new Date(toDate);
    tmpEndDate.setDate(toDate.getDate() + dayCount);
    tmpEndDate = this.getNextWorkingDay(tmpEndDate);

    const actualDayCount =
      dayCount + remainingNonWorkingDays(toDate, tmpEndDate);

    toDate.setDate(toDate.getDate() + actualDayCount);

    this.strEndDate = toDate
      .toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replaceAll('/', '-');

    this.updateRateForOneDay(startDate, toDate);
  }

  /**
   * 開始終了日変更時の日当たり施工数量計算
   */
  private updateRateForOneDay(startDate: Date, endDate: Date) {
    const dayCount = remainingWorkingDays(startDate, endDate);
    let rateForOneDay: number | undefined = undefined;

    if (
      this.totalEstimateVolume &&
      this.totalEstimateVolume > 0 &&
      dayCount &&
      dayCount > 0
    ) {
      this.workingDayCount = '' + dayCount;
      rateForOneDay = this.totalEstimateVolume / dayCount;
      this.rateForOneDayInput?.setValueNoTouch('' + rateForOneDay);
      this.viewModel.currentActivity.rateForOneDay = Number(
        rateForOneDay.toFixed(1),
      );
    } else {
      // 日当たり施工数量のゼロ初期化
      this.resetRateForOneDay(dayCount && dayCount > 0 ? '' + dayCount : '--');
    }
  }

  /**
   * 日当たり施工数量のゼロ初期化
   */
  private resetRateForOneDay(workingDayCount: string) {
    this.workingDayCount = workingDayCount;
    const rateForOneDay = 0;
    this.rateForOneDayInput?.setValueNoTouch('' + rateForOneDay);
    this.viewModel.currentActivity.rateForOneDay = Number(
      rateForOneDay.toFixed(1),
    );
  }

  /**
   * 次の稼働日取得
   * 指定日が非稼働日の場合は次の稼働日まで１日ずつ足していく
   */
  private getNextWorkingDay(date: Date) {
    while (nonWorkingDays(date)) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  /**
   * 線形データモデル取得
   */
  private async selectAlignmentModel() {
    if (
      !this.projectId ||
      !this.viewModel.currentActivity.alignmentId ||
      this.form.controls['selectAlignment'].disabled
    ) {
      return;
    }

    if (
      !this.viewModel.currentActivity.alignmentId ||
      this.alignmentId == this.viewModel.currentActivity.alignmentId
    ) {
      return;
    }

    this.startStationText = '';
    this.endStationText = '';
    this.isStationDisabled = true;
    this.isAlignmentLoading = true;

    this.alignmentId = this.viewModel.currentActivity.alignmentId;
    const alignMentCache = await this.getAlignment(
      this.projectId,
      this.alignmentId,
    );
    const cachedAlignment = alignMentCache?.alignment;
    const cachedAlignmentStations = alignMentCache?.alignmentStations;

    this.stationList = cachedAlignmentStations?.stations ?? [];
    const stationCount =
      this.stationList.length == 0 ? 1 : this.stationList.length;

    // 線形データ選択状態 -> 他の線形データ選択時
    this.sliderMax = stationCount - 1;
    this.stationInterval = cachedAlignment?.stationInterval ?? undefined;
    this.isStationDisabled = false;
    this.isAlignmentLoading = false;
    this.form.controls['startStation'].enable({ emitEvent: false });
    this.form.controls['endStation'].enable({ emitEvent: false });
    this.form.controls['selectStartStation'].enable({ emitEvent: false });
    this.form.controls['selectEndStation'].enable({ emitEvent: false });
    this.form.controls['leftOffset'].enable({ emitEvent: false });
    this.form.controls['rightOffset'].enable({ emitEvent: false });

    // Populate station dropdown options
    this.startStationOptions = [];
    this.endStationOptions = [];
    this.stationList.forEach((station, index) => {
      const option = {
        id: index,
        display: station.description ?? `${index}`,
      };
      this.startStationOptions.push(option);
      this.endStationOptions.push(option);
    });

    const initialStartStationIndex = this.getClosestStationIndex(
      this.stationList,
      this.viewModel.currentActivity.initialStartStation,
      true,
    );
    const initialEndStationIndex = this.getClosestStationIndex(
      this.stationList,
      this.viewModel.currentActivity.initialEndStation,
      false,
    );

    this.initialStartStation = initialStartStationIndex;
    this.initialEndStation =
      initialEndStationIndex > 0 ? initialEndStationIndex : this.sliderMax;

    // Set selected station indices for dropdowns
    this.selectedStartStationIndex = this.initialStartStation;
    this.selectedEndStationIndex = this.initialEndStation;

    // Update filtered options based on initial selection
    this.updateFilteredStationOptions();

    // sliderのmax値(0)更新後は値が変化しないと描画が更新されないので 0 -> initial(APIの値) と変化させる
    this.form.controls['endStation'].patchValue(this.initialEndStation);
    this.form.controls['startStation'].patchValue(this.initialStartStation);

    // Set initial values for select controls after options are populated
    // Use setTimeout to ensure the component has finished initializing
    setTimeout(() => {
      this.form.controls['selectStartStation'].patchValue(
        this.initialStartStation,
        { emitEvent: false },
      );
      this.form.controls['selectEndStation'].patchValue(
        this.initialEndStation,
        {
          emitEvent: false,
        },
      );

      // Force update value and validity to ensure UI reflects the values
      this.form.controls['selectStartStation'].updateValueAndValidity();
      this.form.controls['selectEndStation'].updateValueAndValidity();

      // Mark as touched to show the selected value instead of placeholder
      this.form.controls['selectStartStation'].markAsTouched();
      this.form.controls['selectEndStation'].markAsTouched();
    }, 100);
  }

  public override ngOnDestroy(): void {
    this.store.dispatch(ConstructionActivityAction.ResetErrorAction());
    this.isLoading = true;
    this.optionsActivity = undefined;
    this.constructionSettings = undefined;
    this.viewModel = new ViewModel();
    this.onDestroySubject$.next(void 0);
    super.ngOnDestroy();
  }

  /**
   * タブ切り替え
   */
  public onToggleTabs(tabType: TabType) {
    if (this.viewModel.enabledTabType !== tabType) {
      this.viewModel.setTabType(tabType);
    }
  }

  /**
   * 進捗確認設定追加
   */
  public onAddActivity() {
    if (
      !this.projectId ||
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      return;
    }
    if (this.projectId) {
      this.saveActivityModal?.open(
        MODAL_TITLE_ADD_ACTIVITY,
        MODAL_PLACEHOLDER_ADD_ACTIVITY,
        this.projectId,
        DEAULT_CONSTRUCTIONACTIVITY,
      );
    }
  }

  /**
   * 進捗確認設定名編集
   */
  public onEditActivity(selectedItem: DeletableSelectDataItem) {
    if (
      !this.projectId ||
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      return;
    }
    const selectedActivity = this.viewModel.activityList?.find(
      (item) => item.id === selectedItem.id,
    );
    if (this.projectId && selectedActivity) {
      this.saveActivityModal?.open(
        MODAL_TITLE_CHANGE_ACTIVITY_NAME,
        MODAL_PLACEHOLDER_CHANGE_ACTIVITY_NAME,
        this.projectId,
        selectedActivity,
      );
    }
  }

  /**
   * 進捗確認設定削除
   */
  public onDeleteActivity(item: DeletableSelectDataItem | undefined) {
    if (
      !this.projectId ||
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      return;
    }
    if (this.projectId && item && item.id) {
      // エラーリセット
      this.store.dispatch(ConstructionActivityAction.ResetErrorAction());

      // 進捗確認設定削除
      this.store.dispatch(
        ConstructionActivityAction.DeleteConstructionActivityAction({
          projectId: this.projectId,
          activityId: item.id,
        }),
      );
    }
  }

  /**
   * 計算、更新ボタン
   * 更新(isUpdate: true)
   * 計算のみ(isUpdate: false)
   */
  public async openConfirmModal(isUpdate: boolean) {
    if (
      !this.projectId ||
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      return;
    }

    this.errorList = [];

    // アクティビティのロック確認
    if (this.projectId && this.lastSelectedActivityId) {
      this.checkLocks = true;
      const locked = await this.projectAccessControlService.isLocked(
        LockFuncName.ConstructionActivity,
        this.lastSelectedActivityId ?? undefined,
      );
      this.checkLocks = false;

      // ロックされている場合は変更不可
      if (locked) {
        this.form.controls['selectActivity'].patchValue(
          this.optionsActivity?.find(
            (item) => item.id === this.lastSelectedActivityId,
          ),
          { emitEvent: false },
        );
        this.errorList.push(extractAppMessage('SOK5002'));
        return;
      }
    }

    const paramGetLatestContructionData = this.is3DEnabled ? isUpdate : false;
    if (isUpdate) {
      // 通知メッセージ管理処理を初期化する
      this.store.dispatch(
        NotificationManagementAction.SetNotificationManipulatorAction({
          executiveFunctions:
            ExecutiveFunctions.gpuWosConstructionDataCurrentActivityPost,
          manipulator: makeNotificationManipulator(
            this.viewModel.currentActivity.name ?? '',
          ),
        }),
      );

      // 最新の施工データ取得・再計算・更新
      this.confirmModal?.open(
        this.projectId,
        MODAL_TITLE_CONFIRM_UPDATE, // 進捗確認設定を更新
        MODAL_MESSAGE_CONFIRM_UPDATE,
        paramGetLatestContructionData,
        true, // 遅延タスクで実行するかどうか
        this.viewModel.currentActivity.getConstructionActivity(
          this.viewModel.targetArea,
        ),
      );
    } else {
      // 再計算のみ
      this.confirmModal?.open(
        this.projectId,
        MODAL_TITLE_CONFIRM, // 確認
        MODAL_MESSAGE_CONFIRM,
        paramGetLatestContructionData,
        false, // 遅延タスクで実行するかどうか
        this.viewModel.currentActivity.getConstructionActivity(
          this.viewModel.targetArea,
        ),
      );
    }
  }

  /**
   * 追加モーダルが閉じた時
   */
  public onCloseSaveModal() {
    if (this.openSaveModal) {
      this.emitOnCloseSaveModal.emit();
    }
  }

  /**
   * 確認モーダルが閉じた時
   */
  public onCloseConfirmModal(getLatestContructionData: boolean) {
    this.closeOnEnd = getLatestContructionData;
    if (this.closeOnEnd) {
      this.onClose();
    }
  }

  /**
   * キャンセルボタン
   */
  public onClose() {
    this.store.dispatch(AreaDisplayControlAction.HideRightAreaAction());
  }

  /**
   * Get station description for tooltip
   */
  public getStationDescription(index: number): string {
    if (this.stationList && this.stationList[index]) {
      return this.stationList[index].description || `Station ${index}`;
    }
    return '';
  }

  /**
   * Station dropdown change handler for start station
   */
  public onStartStationChange(
    event: NtcModusSelectComponentOptionType<string | number>,
  ) {
    const selectedIndex =
      typeof event === 'object' && 'id' in event
        ? (event.id as number)
        : Number(event);
    // 不正な値チェック
    if (
      selectedIndex === null ||
      selectedIndex === undefined ||
      this.isSynchronizing ||
      isNaN(selectedIndex)
    ) {
      return;
    }

    this.isSynchronizing = true;

    // Update form control for dropdown
    this.form.controls['selectStartStation'].patchValue(selectedIndex, {
      emitEvent: false,
    });
    this.selectedStartStationIndex = selectedIndex;

    // Update slider directly with event emission to trigger all handlers
    this.form.controls['startStation'].patchValue(selectedIndex, {
      emitEvent: true,
    });

    // Update filtered options to prevent invalid selections
    this.updateFilteredStationOptions();

    // update viewModel
    this.viewModel.currentActivity.startStation = this.getStationValueFromIndex(
      this.stationList,
      selectedIndex,
    );

    this.isSynchronizing = false;

    // Ensure start station doesn't exceed end station and is not equal
    if (selectedIndex >= this.form.controls['endStation'].value) {
      this.isSynchronizing = true;
      const newEndStation = selectedIndex + 1;
      this.form.controls['endStation'].patchValue(newEndStation, {
        emitEvent: true,
      });
      this.form.controls['selectEndStation'].patchValue(newEndStation, {
        emitEvent: false,
      });
      this.selectedEndStationIndex = newEndStation;
      this.updateFilteredStationOptions();
      this.isSynchronizing = false;
    }
  }

  /**
   * Station dropdown change handler for end station
   */
  public onEndStationChange(
    event: NtcModusSelectComponentOptionType<string | number>,
  ) {
    const selectedIndex =
      typeof event === 'object' && 'id' in event
        ? (event.id as number)
        : Number(event);
    // 不正な値チェック
    if (
      selectedIndex === null ||
      selectedIndex === undefined ||
      this.isSynchronizing ||
      isNaN(selectedIndex)
    ) {
      return;
    }

    this.isSynchronizing = true;

    // Update form control for dropdown
    this.form.controls['selectEndStation'].patchValue(selectedIndex, {
      emitEvent: false,
    });
    this.selectedEndStationIndex = selectedIndex;

    // Update slider directly with event emission to trigger all handlers
    this.form.controls['endStation'].patchValue(selectedIndex, {
      emitEvent: true,
    });

    // Update filtered options to prevent invalid selections
    this.updateFilteredStationOptions();

    // update viewModel
    this.viewModel.currentActivity.endStation = this.getStationValueFromIndex(
      this.stationList,
      selectedIndex,
    );

    this.isSynchronizing = false;

    // Ensure end station doesn't go below start station and is not equal
    if (selectedIndex <= this.form.controls['startStation'].value) {
      this.isSynchronizing = true;
      const newStartStation = selectedIndex - 1;
      this.form.controls['startStation'].patchValue(newStartStation, {
        emitEvent: true,
      });
      this.form.controls['selectStartStation'].patchValue(newStartStation, {
        emitEvent: false,
      });
      this.selectedStartStationIndex = newStartStation;
      this.updateFilteredStationOptions();
      this.isSynchronizing = false;
    }
  }

  /**
   * 開始日エラー
   */
  public getErrorStartDate(): string {
    const control = this.form.get('startDate');
    if (isError('required', control)) {
      return this.extractAppMessage('SOK1001', '開始日');
    } else {
      return '';
    }
  }

  /**
   * 終了日エラー
   */
  public getErrorEndDate(): string {
    const control = this.form.get('endDate');
    if (isError('required', control)) {
      return this.extractAppMessage('SOK1001', '終了日');
    } else {
      return '';
    }
  }

  /**
   * 表示単位
   */
  public toFixedString(volume: number | undefined) {
    return this.formatter.formatCutfill(volume ?? 0.0, true, true);
  }

  /**
   * 選択中のフィルタの値でForm更新
   */
  private applyValueByActivity(activity: ConstructionActivity): void;
  private applyValueByActivity(activity: string): void;
  private applyValueByActivity(activity: string | ConstructionActivity) {
    // 線形データ選択状態クリア
    this.alignmentId = undefined;
    if (typeof activity === 'string') {
      // 選択中のフィルタ取得
      const selectedActivity = this.viewModel.activityList?.find(
        (item) => item.id === activity,
      );
      if (selectedActivity) {
        // viewModel更新
        this.viewModel.applyConstructionActivity(selectedActivity);
        this.selectActivityComponent?.select({
          id: selectedActivity.id ?? '',
          label: selectedActivity.name ?? '',
        });
        // form更新
        this.updateForm();
      }
    } else {
      // viewModel更新
      this.viewModel.applyConstructionActivity(activity);
      this.selectActivityComponent?.select({
        id: activity.id ?? '',
        label: activity.name ?? '',
      });
      // form更新
      this.updateForm();
    }
  }

  /**
   * viewModel初期化
   */
  private initView() {
    if (this.updating || !this.constructionSettings) {
      return;
    }
    if (this.constructionSettings.constructionActivityId) {
      const selectedActivity = this.viewModel.activityList?.find(
        (item) => item.id === this.constructionSettings?.constructionActivityId,
      );
      if (selectedActivity) {
        // viewModel更新
        this.viewModel.applyConstructionActivity(selectedActivity);
        if (selectedActivity.id) {
          this.form.controls['selectActivity'].patchValue(
            this.optionsActivity?.find(
              (item) => item.id === selectedActivity.id,
            ),
            {
              emitEvent: false,
            },
          );
        } else {
          this.form.controls['selectActivity'].patchValue(undefined, {
            emitEvent: false,
          });
        }
        this.selectActivityComponent?.select({
          id: selectedActivity.id ?? '',
          label: selectedActivity.name ?? '',
        });
        this.updateForm();
      }
    } else if (this.viewModel.activityList.length <= 0) {
      this.viewModel.applyConstructionActivity(DEAULT_CONSTRUCTIONACTIVITY);
      this.updateForm();
    }
    this.checkUpdatable();
  }

  /**
   * form更新
   */
  private updateForm(force: boolean = false) {
    if (!force && this.updating) {
      return;
    }

    this.viewModel.currentActivity.reInitiateValue(this.viewModel.targetArea);
    if (!this.viewModel.isTargetAreaSelected(TargetAreaType.Alignment)) {
      this.startStationText = '';
      this.endStationText = '';
    }

    let startTime = this.viewModel.currentActivity.startTime ?? new Date();
    if (!startTime) {
      startTime = this.today;
    } else if (typeof startTime === 'string') {
      startTime = new Date(startTime);
    }
    if (startTime.getTime() < 0) {
      startTime = this.today;
    }
    let endTime = this.viewModel.currentActivity.endTime ?? new Date();
    if (!endTime) {
      endTime = this.today;
    } else if (typeof endTime === 'string') {
      endTime = new Date(endTime);
    }
    if (endTime.getTime() < 0) {
      endTime = this.today;
    }
    const startDateStr = startTime
      .toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replaceAll('/', '-');
    const endDateStr = endTime
      .toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replaceAll('/', '-');

    this.viewModel.currentActivity.startTime = startTime;
    this.viewModel.currentActivity.endTime = endTime;

    let designSurface = this.optionsDesignSurface.find(
      (item) => item.id === this.viewModel.currentActivity.designSurfaceId,
    );
    if (!designSurface) {
      designSurface = { id: '', display: '' };
    }
    let existingGround = this.optionsExistingGround.find(
      (item) => item.id === this.viewModel.currentActivity.existingGroundId,
    );
    if (!existingGround) {
      existingGround = { id: '', display: '' };
    }
    let boundary = this.optionsBoundary.find(
      (item) => item.id === this.viewModel.currentActivity.boundaryId,
    );
    if (!boundary) {
      boundary = { id: '', display: '' };
    }
    let alignment = this.optionsAlignment.find(
      (item) => item.id === this.viewModel.currentActivity.alignmentId,
    );
    if (!alignment) {
      alignment = { id: '', display: '' };
    }

    this.form.patchValue({
      selectSubType: this.viewModel.currentActivity.activitySubType,
      selectDesignSurface: designSurface,
      selectExistingGround: existingGround,
      selectTargetArea: this.viewModel.currentActivity.getSelectedTargetArea(),
      selectBoundary: boundary,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    if (!this.viewModel.currentActivity.alignmentId) {
      this.initializeStation();
    } else {
      this.form.patchValue({
        selectAlignment: alignment,
        leftOffset: this.viewModel.currentActivity.leftOffset ?? 0,
        rightOffset: this.viewModel.currentActivity.rightOffset ?? 0,
      });
    }

    // onchangeを発生させない
    this.form.controls['rateForOneDay'].patchValue(
      this.viewModel.currentActivity.rateForOneDay ?? 0,
      { emitEvent: false },
    );

    this.selectAlignmentModel();
  }

  /**
   * 更新可否チェック
   */
  private checkUpdatable() {
    this.isUpdatable =
      this.constructionSettings !== undefined &&
      this.viewModel.activityList.length > 0 &&
      !!this.viewModel.currentActivity.designSurfaceId &&
      !!this.viewModel.currentActivity.existingGroundId;
  }

  /**
   * 計算値の合計算出
   */
  private calculateTotal() {
    const digitPipe = new DigitPipe();
    this.cutEstimateVolume = digitPipe.toFixedNum(
      this.currentVolume?.cutVolume ?? 0.0,
      this.DIGIT_DISPLAY,
    );
    this.fillEstimateVolume = digitPipe.toFixedNum(
      this.currentVolume?.fillVolume ?? 0.0,
      this.DIGIT_DISPLAY,
    );
    if (
      this.viewModel.currentActivity.isSubTypeSelected(
        this.viewModel.subType.fill,
      )
    ) {
      this.totalEstimateVolume = this.fillEstimateVolume;
    } else if (
      this.viewModel.currentActivity.isSubTypeSelected(
        this.viewModel.subType.cut,
      )
    ) {
      this.totalEstimateVolume = this.cutEstimateVolume;
    } else {
      this.totalEstimateVolume =
        this.fillEstimateVolume + this.cutEstimateVolume;
    }
    const startDate = new Date(
      this.form.controls['startDate'].getRawValue() ?? '',
    );
    const endDate = new Date(this.form.controls['endDate'].getRawValue() ?? '');
    this.updateRateForOneDay(startDate, endDate);
  }

  /**
   * startStationキャプション取得
   */
  private async getStartStationText() {
    if (
      !this.projectId ||
      !this.alignmentId ||
      !this.stationInterval ||
      this.form.controls['selectAlignment'].disabled
    ) {
      return;
    }

    this.startStationText = this.getClosestStationText(
      this.stationList,
      this.viewModel.currentActivity.startStation,
      true,
    );
  }

  /**
   * endStationキャプション取得
   */
  private async getEndStationText() {
    if (
      !this.projectId ||
      !this.alignmentId ||
      !this.stationInterval ||
      this.form.controls['selectAlignment'].disabled
    ) {
      return;
    }

    this.endStationText = this.getClosestStationText(
      this.stationList,
      this.viewModel.currentActivity.endStation,
      false,
    );
  }

  /**
   * 対象エリアに応じて入力可否を変更する
   */
  private checkTargetArea() {
    if (!this.viewModel.isTargetAreaSelected(TargetAreaType.Alignment)) {
      this.form.controls['selectAlignment'].disable({ emitEvent: false });
    } else if (this.viewModel.isTargetAreaSelected(TargetAreaType.Alignment)) {
      if (this.optionsAlignment.length > 1) {
        this.form.controls['selectAlignment'].enable({ emitEvent: false });
      }
    }
    if (!this.viewModel.isTargetAreaSelected(TargetAreaType.Custom)) {
      this.form.controls['selectBoundary'].disable({ emitEvent: false });
    } else if (this.viewModel.isTargetAreaSelected(TargetAreaType.Custom)) {
      if (this.optionsBoundary.length > 1) {
        this.form.controls['selectBoundary'].enable({ emitEvent: false });
      }
    }
  }

  /**
   * モデルの測量日時チェック
   */
  private validateModelDate(model: Model) {
    this.errorList = [];
    if (!model.dateTime) {
      this.errorList.push(extractAppMessage('SOK1035'));
      return;
    }
    const modelTime = new Date(model.dateTime).getTime();
    if (MIN_DATE.getTime() > modelTime) {
      this.errorList.push(extractAppMessage('SOK1035'));
      return;
    }
  }

  private initializeStation() {
    this.isStationDisabled = true;

    if (!this.viewModel.currentActivity.alignmentId) {
      this.form.patchValue({
        selectAlignment: { id: '', display: '' },
      });
    }

    this.form.patchValue({
      startStation: 0,
      endStation: 0,
      selectStartStation: 0,
      selectEndStation: 0,
      leftOffset: this.viewModel.currentActivity.initialLeftOffset ?? 10,
      rightOffset: this.viewModel.currentActivity.initialRightOffset ?? 10,
    });

    this.startStationText = '';
    this.endStationText = '';

    this.form.controls['startStation'].disable({ emitEvent: false });
    this.form.controls['endStation'].disable({ emitEvent: false });
    this.form.controls['selectStartStation'].disable({ emitEvent: false });
    this.form.controls['selectEndStation'].disable({ emitEvent: false });
    this.form.controls['leftOffset'].disable({ emitEvent: false });
    this.form.controls['rightOffset'].disable({ emitEvent: false });

    // Clear station dropdown options
    this.startStationOptions = [];
    this.endStationOptions = [];
    this.filteredStartStationOptions = [];
    this.filteredEndStationOptions = [];
    this.selectedStartStationIndex = 0;
    this.selectedEndStationIndex = 0;

    // Initialize with full options initially
    this.filteredStartStationOptions = [...this.startStationOptions];
    this.filteredEndStationOptions = [...this.endStationOptions];
  }

  /**
   * Alignment取得（キャッシュあり）
   */
  private async getAlignment(
    projectId: string,
    alignmentId: string,
  ): Promise<AlignmentCache | undefined> {
    let cached = this.alignmentCacheList.find(
      (model) => model.alignmentId == alignmentId,
    );

    if (!cached) {
      const responseAlignment = await firstValueFrom(
        this.alignmentsService.projectsProjectIdAlignmentsModelIdGet(
          projectId,
          alignmentId,
        ),
      );

      const responseAlignmentStations = await firstValueFrom(
        this.alignmentStationsService.alignmentStationsGet(
          projectId,
          alignmentId,
          responseAlignment.stationInterval,
        ),
      );

      if (responseAlignment && responseAlignmentStations) {
        cached = {
          alignmentId: responseAlignment.id ?? '',
          alignment: responseAlignment,
          alignmentStations: responseAlignmentStations,
        };
        this.alignmentCacheList.push(cached);
      }
    }
    return Promise.resolve(cached);
  }

  private getStationValueFromIndex(
    list: StationAndText[],
    index: number,
  ): number {
    if (index >= list.length || !list[index]) {
      return 0;
    }
    return list[index].station ?? 0;
  }

  /**
   * stationのリストから近似値を返す
   */
  private getClosestStationIndex(
    stationList: StationAndText[],
    value: number | undefined,
    start: boolean,
  ): number {
    if (!stationList || stationList.length <= 0 || !value) {
      return 0;
    }
    const list = [...stationList];
    let ret = 0;
    if (start) {
      ret = this._getClosestStationStartIndex(list, value);
    } else {
      list.reverse();
      ret = list.length - 1 - this._getClosestStationEndIndex(list, value);
    }
    return ret;
  }

  /**
   * stationのリストから近似値を返す
   */
  private getClosestStationValue(
    stationList: StationAndText[],
    value: number | undefined,
    start: boolean,
  ): number {
    if (!stationList || stationList.length <= 0 || !value) {
      return 0;
    }
    const list = [...stationList];
    let stationAndText: StationAndText;
    if (start) {
      stationAndText = this._getClosestStationStart(list, value);
    } else {
      list.reverse();
      stationAndText = this._getClosestStationEnd(list, value);
    }
    if (!stationAndText) {
      return 0;
    }
    return stationAndText.station ?? 0;
  }

  /**
   * stationのリストから近似値を返す
   */
  private getClosestStationText(
    stationList: StationAndText[],
    value: number | undefined,
    start: boolean,
  ): string {
    if (!stationList || stationList.length <= 0 || (!value && value !== 0)) {
      return '';
    }
    const list = [...stationList];
    let stationAndText: StationAndText;
    if (start) {
      stationAndText = this._getClosestStationStart(list, value);
    } else {
      list.reverse();
      stationAndText = this._getClosestStationEnd(list, value);
    }
    if (!stationAndText) {
      return '';
    }
    return stationAndText.description ?? '';
  }

  /**
   * stationのリストから近似値のStationAndTextを返す（start）
   */
  private _getClosestStationStart(
    list: StationAndText[],
    target: number,
  ): StationAndText {
    const index = this._getClosestStationStartIndex(list, target);
    return list[index];
  }

  /**
   * stationのリストから近似値のStationAndTextを返す（end）
   */
  private _getClosestStationEnd(
    list: StationAndText[],
    target: number,
  ): StationAndText {
    const index = this._getClosestStationEndIndex(list, target);
    return list[index];
  }

  /**
   * stationのリストから近似値のIndexを返す（start）
   */
  private _getClosestStationStartIndex(list: StationAndText[], target: number) {
    const listLength = list.length;
    let i;

    // Find the first larger element of target in arr
    for (i = 1; i < listLength; i++) {
      if ((list[i].station ?? 0) >= target) break;
    }

    // If all elements are smaller, return the last element
    if (i === listLength) {
      return listLength - 1;
    }

    // Check the current and previous element for closest
    if ((list[i].station ?? 0) - target < target - (list[i - 1].station ?? 0)) {
      return i;
    } else {
      return i - 1;
    }
  }

  /**
   * stationのリストから近似値のIndexを返す（end）
   */
  private _getClosestStationEndIndex(list: StationAndText[], target: number) {
    const listLength = list.length;
    let i;

    // Find the first larger element of target in arr
    for (i = 1; i < listLength; i++) {
      if ((list[i].station ?? 0) <= target) break;
    }

    // If all elements are smaller, return the last element
    if (i === listLength) {
      return listLength - 1;
    }

    // Check the current and previous element for closest
    if ((list[i].station ?? 0) - target > target - (list[i - 1].station ?? 0)) {
      return i;
    } else {
      return i - 1;
    }
  }

  /**
   * 簡易配列比較
   */
  private isArrayEqual(
    array1: ConstructionActivity[] | undefined,
    array2: ConstructionActivity[] | undefined,
  ) {
    if (!array1 && !array2) {
      return true;
    } else if (!array1 || !array2) {
      return false;
    }

    array1 = [...array1];
    array2 = [...array2];

    let i = array1.length;
    if (i != array2.length) return false;

    // IDでソート
    array1 = array1.sort(constructionActivitySortByID);
    array2 = array2.sort(constructionActivitySortByID);

    while (i--) {
      if (JSON.stringify(array1[i]) !== JSON.stringify(array2[i])) return false;
    }
    return true;
  }

  /**
   * Update filtered station options based on current selection
   */
  private updateFilteredStationOptions() {
    const currentStartIndex = this.selectedStartStationIndex;
    const currentEndIndex = this.selectedEndStationIndex;

    // Filter start station options: can't be greater than or equal to end station
    this.filteredStartStationOptions = this.startStationOptions.filter(
      (option) => option.id < currentEndIndex,
    );

    // Filter end station options: can't be less than or equal to start station
    this.filteredEndStationOptions = this.endStationOptions.filter(
      (option) => option.id > currentStartIndex,
    );

    // Ensure form controls have valid values after filtering
    if (this.filteredStartStationOptions.length > 0) {
      const startValue = this.form.controls['selectStartStation'].value;
      const isStartValueValid = this.filteredStartStationOptions.some(
        (option) => option.id === startValue,
      );
      if (!isStartValueValid && currentStartIndex >= 0) {
        this.form.controls['selectStartStation'].patchValue(currentStartIndex, {
          emitEvent: false,
        });
      }
    }

    if (this.filteredEndStationOptions.length > 0) {
      const endValue = this.form.controls['selectEndStation'].value;
      const isEndValueValid = this.filteredEndStationOptions.some(
        (option) => option.id === endValue,
      );
      if (!isEndValueValid && currentEndIndex >= 0) {
        this.form.controls['selectEndStation'].patchValue(currentEndIndex, {
          emitEvent: false,
        });
      }
    }
  }
}

// 補助関数

// メッセージ通知時にメッセージ内容を指定する関数
function makeNotificationManipulator(
  activitySettingName: string,
): NotificationManipulator {
  return {
    makeNotificationMessage: (data) => {
      switch (data.executionManagementState) {
        case ExecutionManagementState.Request:
          return {
            message: '進捗確認設定の更新を開始しました。',
            showToast: true,
          };
        case ExecutionManagementState.DelayedTaskOccurred:
          return {
            message: `${activitySettingName}を更新中 ...`,
            showToast: false,
          };
        case ExecutionManagementState.Completed:
          return {
            message: '進捗確認設定の更新が完了しました。',
            showToast: true,
          };
        case ExecutionManagementState.Error:
          return {
            message: '進捗確認設定の更新に失敗しました。',
            showToast: true,
          };
        default:
          return { message: '', showToast: false };
      }
    },
    makeOperationName: () => {
      return '進捗確認設定';
    },
  };
}

/**
 * 進捗確認設定配列ソート用
 */
function constructionActivitySortByID(
  a: ConstructionActivity,
  b: ConstructionActivity,
): number {
  if (!a.id || !b.id) {
    if (!a.id && b.id) {
      return 1;
    } else if (a.id && !b.id) {
      return -1;
    } else {
      return 0;
    }
  } else {
    if (a.id == b.id) {
      return 0;
    } else if (a.id > b.id) {
      return -1;
    } else {
      return 1;
    }
  }
}
function constructionActivitySortByName(
  a: ConstructionActivity,
  b: ConstructionActivity,
): number {
  if (!a.name || !b.name) {
    if (!a.name && b.name) {
      return -1;
    } else if (a.name && !b.name) {
      return 1;
    } else {
      return 0;
    }
  } else {
    if (a.name == b.name) {
      return constructionActivitySortByID(a, b);
    } else if (a.name > b.name) {
      return 1;
    } else {
      return -1;
    }
  }
}
