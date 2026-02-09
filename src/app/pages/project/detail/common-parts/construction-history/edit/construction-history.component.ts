import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  ConstructionSettings,
  ModelKinds,
} from '@nikon-trimble-sok/api-sdk-d3';
import {
  PLACEHOLDER_AREA_SELECT,
  PLACEHOLDER_ICT_SELECT,
  TabType,
  ViewModel,
} from './construction-history.defination';
import { MultiSelectDataItem } from '@nikon-trimble-sok/parts-components';
import { FormControl, FormGroup } from '@angular/forms';
import { combineLatest, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import { WosWmLinkSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/right-panel/command/wos-wm-link/wos-wm-link-selector';
import {
  ConstructionFilterElevationType,
  ConstructionFilterMachineDirectionType,
  LockFuncName,
} from 'src/app/helper-utility/api-helper/projects-models';
import { BasicMultiSelectComponent } from '@nikon-trimble-sok/parts-components';
import { ConstructionFilterSelector } from 'src/app/stores/selectors/project/construction-filter.selector';
import { ConstructionFilterAction } from 'src/app/stores/actions/project/construction-filter.action';
import {
  ConstructionFilterState,
  UpdateState,
} from 'src/app/stores/states/project/construction-filter.state';
import { ConstructionSettingsSelector } from 'src/app/stores/selectors/project/construction-settings.selector';
import { ConstructionSettingsAction } from 'src/app/stores/actions/project/construction-settings.action';
import { WosWmLinkAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/wos-wm-link/wos-wm-link.action';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import { ModelSelector } from 'src/app/stores/selectors/project/model.selector';
import { ModelAction } from 'src/app/stores/actions/project/model.action';
import { ModelTypeHelper } from 'src/app/helper-utility/model-helper/model-type-helper';

@Component({
  selector: 'ntc-toolbars-3d-construction-history-edit-modal',
  templateUrl: './construction-history.component.html',
  styleUrl: './construction-history.component.scss',
})
export class ConstructionHistoryEditModalComponent
  extends BaseComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('modal') modal: BasicModalComponent | undefined;

  @ViewChild('selectAreaCutComponent', { static: true })
  selectAreaCutComponent: BasicMultiSelectComponent | undefined;

  @ViewChild('selectAreaFillComponent', { static: true })
  selectAreaFillComponent: BasicMultiSelectComponent | undefined;

  @ViewChild('selectICTComponent', { static: true })
  selectICTComponent: BasicMultiSelectComponent | undefined;

  @ViewChild('optionPanelToggleBtn', { read: ElementRef })
  optionPanelToggleBtn: ElementRef | undefined;

  @ViewChild('optionPanel') optionPanel: ElementRef | undefined;

  // すべての施工履歴を再取得するかどうか
  @Input() cleanupContructionData: boolean = false;

  @Output() closeModal = new EventEmitter<boolean>();

  @Output() cleanupContructionDataChange = new EventEmitter<boolean>();

  public placeHolderICT = PLACEHOLDER_ICT_SELECT;
  public placeHolderAreaCut = PLACEHOLDER_AREA_SELECT;
  public placeHolderAreaFill = PLACEHOLDER_AREA_SELECT;
  public optionsICT: MultiSelectDataItem[] = [];
  public optionsAreaCut: MultiSelectDataItem[] = [];
  public optionsAreaFill: MultiSelectDataItem[] = [];
  public optionsHeight = [
    { text: '最後', value: ConstructionFilterElevationType.Last },
    { text: '最初', value: ConstructionFilterElevationType.First },
    { text: '最高', value: ConstructionFilterElevationType.Highest },
    { text: '最低', value: ConstructionFilterElevationType.Lowest },
  ];
  public optionsDirection = [
    { text: '指定なし', value: ConstructionFilterMachineDirectionType.None },
    { text: '後進', value: ConstructionFilterMachineDirectionType.Backward },
    { text: '前進', value: ConstructionFilterMachineDirectionType.Forward },
  ];

  public viewModel: ViewModel;

  public form: FormGroup = new FormGroup({
    areaEnabled: new FormControl(''),
    selectAreaCut: new FormControl(''),
    selectAreaFill: new FormControl(''),
    selectICT: new FormControl(''),
    selectElevationType: new FormControl(''),
    selectDirection: new FormControl(''),
  });

  // 読み込み中の判定
  public isLoading: boolean = true;

  public projectId: string | undefined;

  // 施工条件設定
  private constructionSettings?: ConstructionSettings;

  // 施工履歴フィルタ
  private constructionFilterState?: ConstructionFilterState;

  private updating: boolean = false;

  public inputEnabled: boolean = false;

  // Error message state when call API
  protected errorList: string[] = [];

  private onDestroySubject$ = new Subject();

  public checkLocks: boolean = false;

  public isExecutable: boolean = false;

  // セレクト用タイプアイコンリスト
  public modelTypeIconList: Record<string, string> = {};

  // すべての施工履歴を再取得パネル表示制御
  public showOptionPanel: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('ConstructionHistoryEditModalComponent');

    this.viewModel = new ViewModel();

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ModelSelector.selectActiveList),
        this.store.select(WosWmLinkSelector.selectWOSDeviceState),
        this.store.select(ConstructionFilterSelector.selectConstructionFilter),
        this.store.select(
          ConstructionSettingsSelector.selectConstructionSettings,
        ),
        this.store.select(
          ConstructionFilterSelector.selectConstructionFilterUpdateState,
        ),
      ])
        .pipe(takeUntil(this.onDestroySubject$))
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return (
              prev[1]?.inProcess === curr[1]?.inProcess &&
              prev[2]?.inProcess === curr[2]?.inProcess &&
              prev[3]?.inProcess === curr[3]?.inProcess &&
              prev[4] === curr[4] &&
              prev[1]?.wOSDeviceList?.length === curr[1]?.wOSDeviceList?.length
            );
          }),
        )
        .subscribe((value) => {
          this.isLoading =
            (value[1]?.inProcess ||
              value[2]?.inProcess ||
              value[3]?.inProcess) ??
            true;

          // area
          if (
            (!this.optionsAreaCut.length || !this.optionsAreaFill.length) &&
            value[0]
          ) {
            this.optionsAreaCut = [];
            this.optionsAreaFill = [];
            if (value[0]) {
              value[0].forEach((model) => {
                if (model.modelKind === ModelKinds.NUMBER_4) {
                  this.optionsAreaCut?.push({
                    label: model.name ?? '',
                    id: '' + model.id,
                  });
                  this.optionsAreaFill?.push({
                    label: model.name ?? '',
                    id: '' + model.id,
                  });
                }
              });
            }
          }

          // wOSDeviceList
          if (!this.optionsICT.length && value[1]?.wOSDeviceList) {
            this.optionsICT = [];
            value[1].wOSDeviceList?.forEach((item) => {
              this.optionsICT.push({
                label: item.name ?? '',
                id: '' + item.id,
              });
            });
          }

          // 施工履歴フィルタ
          if (value[2]) {
            this.constructionFilterState = value[2];
          }

          // 施工条件設定
          if (value[3]?.constructionSettings) {
            this.constructionSettings = { ...value[3].constructionSettings };
          }

          if (value[4] === UpdateState.IN_PROCESS) {
            this.updating = true;
          } else if (this.updating && value[4] === UpdateState.DONE) {
            // updating true -> false
            this.updating = false;
            this.onClose();
          } else if (this.updating && value[4] === UpdateState.ERROR) {
            // updating true -> error
            this.updating = false;
          } else {
            this.updating = false;
          }

          // タイプアイコンリスト生成
          this.modelTypeIconList = ModelTypeHelper.makeTypeIconList(
            value[0] ?? [],
            this.modelTypeIconList,
          );

          // view初期化
          if (!this.isLoading) {
            this.initView();
          }
        }),
    );

    // catch api error
    this.addSubscriptionsList(
      this.store
        .select(ConstructionFilterSelector.selectErrorMessage)
        .subscribe((errorList) => {
          if (errorList && errorList.length > 0) {
            this.errorList.push(...errorList);
          }
        }),
    );

    // catch api error
    this.addSubscriptionsList(
      this.store
        .select(ConstructionSettingsSelector.selectErrorMessage)
        .subscribe((errorList) => {
          if (errorList && errorList.length > 0) {
            this.errorList.push(...errorList);
          }
        }),
    );

    // catch api error
    this.addSubscriptionsList(
      this.store
        .select(WosWmLinkSelector.selectErrorMessage)
        .subscribe((errorList) => {
          if (errorList && errorList.length > 0) {
            this.errorList.push(...errorList);
          }
        }),
    );

    // モデルリスト更新
    this.store.dispatch(ModelAction.GetListAction());
  }

  ngAfterViewInit(): void {
    // view初期化（デフォルト値）
    this.initView();
  }

  ngOnInit(): void {
    // select projectId
    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectId)
        .subscribe((projectId) => {
          this.projectId = projectId;
          if (this.projectId) {
            // 施工条件設定取得
            this.store.dispatch(
              ConstructionSettingsAction.GetConstructionSettingsAction({
                projectId: this.projectId,
              }),
            );
            // 施工履歴フィルタ取得
            this.store.dispatch(
              ConstructionFilterAction.GetConstructionFilterAction({
                projectId: this.projectId,
              }),
            );
            // ICT建機
            this.store.dispatch(
              WosWmLinkAction.GetWOSDeviceStateAction({
                projectId: this.projectId,
              }),
            );
          }
        }),
    );

    // on change areaEnabled
    this.addSubscriptionsList(
      this.form.controls['areaEnabled'].valueChanges.subscribe((value) => {
        if (value) {
          this.viewModel.setTabType(this.viewModel.previousEnabledTabType);
          this.viewModel.areaEnabled = true;
        } else {
          this.viewModel.setTabType(TabType.all);
          this.viewModel.areaEnabled = false;
        }

        this.updateView();
        this.setInputEnable();
        this.checkExecutable();
      }),
    );

    // on change selectAreaCut
    this.addSubscriptionsList(
      this.form.controls['selectAreaCut'].valueChanges.subscribe((value) => {
        this.viewModel.getFilter(TabType.cut).boundaryIds = [];
        if (value.length > 0) {
          this.viewModel.getFilter(TabType.cut).boundaryIds = value.map(
            (item: MultiSelectDataItem) => item.id,
          );
        }
        this.checkExecutable();
        this.setInputEnable();
      }),
    );

    // on change selectAreaFill
    this.addSubscriptionsList(
      this.form.controls['selectAreaFill'].valueChanges.subscribe((value) => {
        this.viewModel.getFilter(TabType.fill).boundaryIds = [];
        if (value.length > 0) {
          this.viewModel.getFilter(TabType.fill).boundaryIds = value.map(
            (item: MultiSelectDataItem) => item.id,
          );
        }
        this.checkExecutable();
        this.setInputEnable();
      }),
    );

    // on change selectICT
    this.addSubscriptionsList(
      this.form.controls['selectICT'].valueChanges.subscribe((value) => {
        this.viewModel.getSelectedFilter().machineIds = [];
        if (value.length > 0) {
          this.viewModel.getSelectedFilter().machineIds = value.map(
            (item: MultiSelectDataItem) => item.id,
          );
        }
      }),
    );

    // on change selectElevationType
    this.addSubscriptionsList(
      this.form.controls['selectElevationType'].valueChanges.subscribe(
        (value) => {
          this.viewModel.getSelectedFilter().elevationType = Number(value);
        },
      ),
    );

    // on change selectDirection
    this.addSubscriptionsList(
      this.form.controls['selectDirection'].valueChanges.subscribe((value) => {
        this.viewModel.getSelectedFilter().machineDirection = Number(value);
      }),
    );
  }

  public override ngOnDestroy(): void {
    this.store.dispatch(ConstructionSettingsAction.ResetErrorAction());
    this.store.dispatch(ConstructionFilterAction.ResetErrorAction());
    this.store.dispatch(WosWmLinkAction.ResetErrorAction());
    this.constructionFilterState = undefined;
    this.constructionSettings = undefined;
    this.viewModel = new ViewModel();
    this.onDestroySubject$.next(void 0);
    super.ngOnDestroy();
  }

  public open() {
    this.store.dispatch(ConstructionSettingsAction.ResetErrorAction());
    this.store.dispatch(ConstructionFilterAction.ResetErrorAction());
    this.store.dispatch(WosWmLinkAction.ResetErrorAction());
    this.modal?.open();
    return;
  }

  /**
   * 施工履歴取得設定 - 保存ボタン
   */
  public async onSaveConstructionHistory() {
    if (
      !this.projectId ||
      !this.viewModel ||
      !this.projectAccessControlService.isConstructionHistoryAvailable() ||
      !this.isExecutable
    ) {
      return;
    }

    this.errorList = [];

    this.checkLocks = true;
    const locked = await this.projectAccessControlService.isLocked(
      LockFuncName.ConstructionData,
      null,
    );
    this.checkLocks = false;
    // ロックされている場合は変更不可
    if (locked) {
      this.errorList.push(extractAppMessage('SOK5002'));
      return;
    }

    this.updating = true;
    this.store.dispatch(
      ConstructionFilterAction.UpdateConstructionFilterAction({
        projectId: this.projectId,
        useOnlySystemDefaultFilter: this.viewModel.areaEnabled ? false : true,
        constructionFilter: this.viewModel
          .getFilter(TabType.all)
          .getConstructionFilter(),
        cutConstructionFilter: this.viewModel
          .getFilter(TabType.cut)
          .getConstructionFilter(),
        fillConstructionFilter: this.viewModel
          .getFilter(TabType.fill)
          .getConstructionFilter(),
      }),
    );
    return;
  }

  /**
   * 施工履歴取得設定 - キャンセル/閉じるボタン
   */
  public onClose() {
    this.modal?.close();
    this.closeModal.emit(true);
    this.cleanupContructionDataChange.emit(this.cleanupContructionData);
    return;
  }

  public onToggleTabs(tabType: TabType) {
    if (this.viewModel.enabledTabType !== tabType) {
      this.viewModel.setTabType(tabType);
      this.updateView();
      this.setInputEnable();
      this.checkExecutable();
    }
  }

  /**
   * 切土選択か否か
   */
  public isCut() {
    return this.viewModel.enabledTabType == TabType.cut;
  }

  /**
   * 盛土選択か否か
   */
  public isFill() {
    return this.viewModel.enabledTabType == TabType.fill;
  }

  /**
   * すべての施工履歴を再取得パネル表示トグル
   */
  public toggleOptionPanel(): void {
    if (this.isLoading || this.checkLocks) {
      return;
    }
    this.showOptionPanel = !this.showOptionPanel;
  }

  /**
   * すべての施工履歴を再取得するかどうか
   */
  public toggleCleanupContructionData() {
    this.cleanupContructionData = !this.cleanupContructionData;
  }

  /**
   * すべての施工履歴を再取得パネル閉じる用
   */
  @HostListener('document:click', ['$event'])
  public onClick(event: MouseEvent): void {
    if (
      !this.showOptionPanel ||
      this.optionPanelToggleBtn?.nativeElement.contains(event.target)
    ) {
      return;
    }
    if (
      this.showOptionPanel &&
      this.optionPanel &&
      !this.optionPanel.nativeElement.contains(event.target)
    ) {
      this.showOptionPanel = false;
    }
  }

  /**
   * viewの初期化処理
   */
  private initView() {
    if (
      this.updating ||
      !this.constructionFilterState ||
      !this.constructionSettings ||
      !this.constructionFilterState.constructionFilter ||
      !this.constructionFilterState.cutConstructionFilter ||
      !this.constructionFilterState.fillConstructionFilter
    ) {
      return;
    }

    this.form.patchValue({
      areaEnabled: this.constructionSettings.useOnlySystemDefaultFilter
        ? false
        : true,
    });
    if (this.constructionFilterState.constructionFilter) {
      this.viewModel
        .getFilter(TabType.all)
        .applyConstructionFilter(
          this.constructionFilterState.constructionFilter,
        );
    }
    if (this.constructionFilterState.cutConstructionFilter) {
      this.viewModel
        .getFilter(TabType.cut)
        .applyConstructionFilter(
          this.constructionFilterState.cutConstructionFilter,
        );
    }
    if (this.constructionFilterState.fillConstructionFilter) {
      this.viewModel
        .getFilter(TabType.fill)
        .applyConstructionFilter(
          this.constructionFilterState.fillConstructionFilter,
        );
    }
    // selectAreaCutComponent
    this.selectAreaCutComponent?.clearSelected();
    this.form.patchValue({
      selectAreaCut: this.optionsAreaCut.filter((item) =>
        this.viewModel.getFilter(TabType.cut).boundaryIds?.includes(item.id),
      ),
    });
    this.selectAreaCutComponent?.handlePlaceHolder();

    // selectAreaFillComponent
    this.selectAreaFillComponent?.clearSelected();
    this.form.patchValue({
      selectAreaFill: this.optionsAreaFill.filter((item) =>
        this.viewModel.getFilter(TabType.fill).boundaryIds?.includes(item.id),
      ),
    });
    this.selectAreaFillComponent?.handlePlaceHolder();

    this.updateView();
    this.setInputEnable();
  }

  /**
   * viewの更新処理
   */
  private updateView() {
    // selectICTComponent
    this.selectICTComponent?.clearSelected();
    this.viewModel.getSelectedFilter().machineIds?.forEach((item) => {
      this.selectICTComponent?.selectItemNoTouch('' + item);
    });
    this.selectICTComponent?.handlePlaceHolder();

    this.form.patchValue({
      selectElevationType: this.viewModel.getSelectedFilter().elevationType,
      selectDirection: this.viewModel.getSelectedFilter().machineDirection,
    });
  }

  /**
   * 領域指定有効化しているときのしている時の入力可否制御
   */
  private setInputEnable() {
    if (this.viewModel.areaEnabled) {
      const currentFilter = this.viewModel.getSelectedFilter();
      if (
        currentFilter &&
        currentFilter.boundaryIds &&
        currentFilter.boundaryIds.length > 0
      ) {
        this.inputEnabled = true;
      } else {
        this.inputEnabled = false;
      }
    } else {
      this.inputEnabled = true;
    }

    if (this.inputEnabled) {
      this.selectICTComponent?.setDisabled(false);
      this.form.controls['selectElevationType'].enable();
      this.form.controls['selectDirection'].enable();
    } else {
      this.selectICTComponent?.setDisabled(true);
      this.form.controls['selectElevationType'].disable();
      this.form.controls['selectDirection'].disable();
    }
  }

  private checkExecutable() {
    if (this.viewModel.areaEnabled) {
      this.isExecutable =
        (this.viewModel.getSelectedFilter().boundaryIds?.length ?? 0) > 0;
    } else {
      this.isExecutable = true;
    }
  }
}
