import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ChangeDetectorRef,
  EventEmitter,
  Output,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { AreaDisplayControlAction } from 'src/app/stores/actions/project/are-display-control.action';
import { NtCommand } from 'src/app/stores/states/project/area-display-control.state';
import { FileTreeViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.action';
import { TrimbleConnect3DViewerAction } from 'src/app/stores/actions/project/detail/data-3d-view/trimble-connect-3d-viewer.action';
import { select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { FileTreeViewSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  CategoryForView,
  ClassifiedFileForView,
  FileForView,
  LoadingStatusMode,
  TcModelFileInfo,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.state';
import { ModelPropertyViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/model-property/model-property-view.action';
import { MultiSelectDataItem } from '@nikon-trimble-sok/parts-components';
import { TagRelation } from 'src/app/stores/definitions/definition';
import { ModelObjects, WorkspaceAPI } from 'trimble-connect-workspace-api';
import { TrimbleConnect3DViewerSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/trimble-connect-3d-viewer.selector';
import { Observable } from 'rxjs';
import { Data3DViewWideSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/data-3d-view-wide.selector';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import { Actions, ofType } from '@ngrx/effects';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { ExportAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/export/export.action';
import { HeightChangeAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/height-change/height-change.action';
import { ConstructionTopographyAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/construction-topography/construction-topography.action';
import {
  ModelStatusTypes,
  QueryUpdateModelParam,
} from '@nikon-trimble-sok/api-sdk-d3';
import {
  ModusCheckbox,
  ModusModal,
} from '@trimble-oss/modus-angular-components';
import { ModelCheckedType } from '../file-tree-item/file-tree-item.definition';
import cloneDeep from 'lodash/cloneDeep';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import _ from 'lodash';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-tree-list-file',
  templateUrl: './accordion-list-file.component.html',
  styleUrls: ['./accordion-list-file.component.scss'],
})
export class AccordionListFileComponent
  extends BaseComponent
  implements OnInit, OnChanges
{
  @Input() dataAccordion: ClassifiedFileForView[] = [];

  @Input() isEditMode: boolean = false;

  @Input() checkTree: boolean[][] = [];

  @Input() checkParent: boolean[] = [];

  @Input() hideTagsInList: boolean = false;

  // タグ編集モード関連のInput
  @Input() isTagEditMode: boolean = false;
  @Input() shouldShowTagChips: boolean = false;
  @Input() tagSources: MultiSelectDataItem[] = [];
  @Input() tagRelation: TagRelation = {};

  // 出力イベント
  @Output() exitTagEditMode = new EventEmitter<void>();

  @Output() tagClicked = new EventEmitter<string>();

  checkTreeCopy: boolean[][] = [];
  checkParentCopy: boolean[] = [];

  /**
   * タグをリスト内で表示するかどうかを判定
   */
  public shouldShowTags(): boolean {
    return !this.hideTagsInList;
  }

  public classifiedModelLoadStatus:
    | Record<string, LoadingStatusMode>
    | undefined;

  public classifiedModelExpandCategory: Record<string, boolean> | undefined;

  // Trimble connect file model info (for show revision)
  public modelTcFileInfo: Record<string, TcModelFileInfo> | undefined;

  public modelsColor: ModelObjects[] | undefined;

  public trimbleWorkSpaceAPI: WorkspaceAPI | undefined;

  public readonly isLoading$: Observable<boolean>;

  public currentModel: FileForView | undefined;

  public isFirstChange: boolean = true;

  public lastSelectedCategory: number | undefined = undefined;

  public lastSelectedItem: number | undefined = undefined;

  public isTrashSelected: boolean | undefined = undefined;

  public checkCount: number = 0;

  @ViewChild('CheckBoxInput') checkBoxInput: ModusCheckbox | undefined =
    undefined;

  @ViewChild('confirmDeleteMultiModels') confirmDeleteMultiModels:
    | ModusModal
    | undefined;
  @ViewChild('confirmRestoreMultiModels') confirmRestoreMultiModels:
    | ModusModal
    | undefined;

  public checkLocks = false;

  public errorMessage: string | undefined;

  @Output() exitEditMode: EventEmitter<void> = new EventEmitter();

  @Output() isTrashSelectedEvent: EventEmitter<boolean | undefined> =
    new EventEmitter();

  @Output() checkTreeChanged: EventEmitter<boolean[][]> = new EventEmitter();

  constructor(
    public projectAccessControlService: ProjectAccessControlService,
    private changeDetector: ChangeDetectorRef,
    private store: Store<ApplicationState>,
    private action$: Actions,
  ) {
    super('AccordionListFileComponent');

    this.isLoading$ = this.store.pipe(
      select(Data3DViewWideSelector.selectorData3DViewInProcess),
    );
  }

  ngOnInit(): void {
    this.addSubscriptionsList(
      this.store
        .pipe(select(FileTreeViewSelector.selectorClassifiedModelLoadStatus))
        .subscribe((classifiedModelLoadStatus) => {
          this.classifiedModelLoadStatus = classifiedModelLoadStatus;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(FileTreeViewSelector.selectorTcFileInfo))
        .subscribe((modelTcFileInfo) => {
          this.modelTcFileInfo = modelTcFileInfo;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(
          select(FileTreeViewSelector.selectorClassifiedModelExpandCategory),
        )
        .subscribe((classifiedModelExpandCategory) => {
          this.classifiedModelExpandCategory = classifiedModelExpandCategory;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(Data3DViewWideSelector.selectorModelsColor)
        .subscribe((modelsColor) => {
          this.modelsColor = modelsColor;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(
          select(
            TrimbleConnect3DViewerSelector.View3DViewerSelector
              .selectorTrimbleWorkspaceAPI,
          ),
        )
        .subscribe((API) => {
          this.trimbleWorkSpaceAPI = API;
        }),
    );

    this.addSubscriptionsList(
      this.action$
        .pipe(ofType(AreaDisplayControlAction.HideRightAreaAction))
        .subscribe(() => {
          this.currentModel = undefined;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.RightSideAreaSelector.selectorViewType)
        .subscribe((viewType) => {
          if (
            !viewType ||
            ![
              NtCommand.Property3D,
              NtCommand.FormEditProperty3D,
              NtCommand.Export,
              NtCommand.ConstructionTopography,
            ].includes(viewType)
          ) {
            this.currentModel = undefined;
          }
        }),
    );

    this.addSubscriptionsList(
      this.action$
        .pipe(
          ofType(
            FileTreeViewAction.FileTreeViewWideAction.ClearCheckStatusAction,
          ),
        )
        .subscribe(() => {
          this.isTrashSelected = undefined;
        }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataAccordion']) {
      const {
        currentValue,
        previousValue,
      }: {
        currentValue: ClassifiedFileForView[];
        previousValue: ClassifiedFileForView[];
      } = changes['dataAccordion'];
      currentValue.forEach((value, i: number) => {
        let same = true;

        if (
          !previousValue ||
          !previousValue[i] ||
          value.rawData.models.length !== previousValue[i].rawData.models.length
        ) {
          same = false;
        } else {
          value.rawData.models.forEach((item, index: number) => {
            if (
              same === true &&
              !_.isEqual(previousValue[i].rawData.models[index], item)
            ) {
              same = false;
            }
          });
        }
        if (!same) {
          if (this?.dataAccordion?.[i].categoryForView.id === 'ゴミ箱') {
            if (this.isFirstChange !== true) {
              this.dataAccordion && this.showAccordion(this.dataAccordion[i]);
            }
          } else {
            this.dataAccordion && this.showAccordion(this.dataAccordion[i]);
          }
        }
      });
      this.isFirstChange = false;
    }
  }

  showAccordion(item: ClassifiedFileForView) {
    this.store.dispatch(
      FileTreeViewAction.CategoryForViewAction.SetExpandStateAction({
        isExpand: true,
        categoryForView: item.categoryForView,
      }),
    );
  }

  setTrashSelected() {
    this.isTrashSelectedEvent.emit(true);
    this.isTrashSelected = true;
    this.checkTree.forEach((list, index) => {
      // 各モデルの modelStatus をチェックして通常モデルの選択をクリア
      this.dataAccordion?.[index].rawData.models.forEach(
        (model, modelIndex) => {
          if (model.modelStatus === ModelStatusTypes.NUMBER_0) {
            list[modelIndex] = false;
          }
        },
      );

      // すべてのモデルが未選択になった場合、親チェックボックスも未選択にする
      const hasSelectedModel = list.some((checked) => checked);
      if (!hasSelectedModel) {
        this.checkParent[index] = false;
      }
    });
  }

  setRealDataSelected() {
    this.isTrashSelectedEvent.emit(false);
    this.isTrashSelected = false;
    this.checkTree.forEach((list, index) => {
      // 各モデルの modelStatus をチェックしてゴミ箱モデルの選択をクリア
      this.dataAccordion?.[index].rawData.models.forEach(
        (model, modelIndex) => {
          if (model.modelStatus === ModelStatusTypes.NUMBER_1) {
            list[modelIndex] = false;
          }
        },
      );

      // すべてのモデルが未選択になった場合、親チェックボックスも未選択にする
      const hasSelectedModel = list.some((checked) => checked);
      if (!hasSelectedModel) {
        this.checkParent[index] = false;
      }
    });
  }

  toggleAccordion(item: ClassifiedFileForView, index: number) {
    if (this.isEditMode && this.checkBoxInput) {
      this.handleClickBox(new MouseEvent(''), index, true);
    } else {
      this.store.dispatch(
        FileTreeViewAction.CategoryForViewAction.SetExpandStateAction({
          isExpand: !this.isCategoryExpand(item.categoryForView),
          categoryForView: item.categoryForView,
        }),
      );
    }
  }

  setModelCheck(
    index1: number,
    index2: number,
    isProgrammatic: boolean,
    checked: boolean | undefined = undefined,
  ) {
    let checkFlag = true;
    this.checkTree[index1].forEach((check, index) => {
      if (index === index2) {
        if (checked === false || (check === true && checked === undefined)) {
          checkFlag = false;
        }
      } else {
        if (check === false) {
          checkFlag = false;
        }
      }
    });

    this.checkParent[index1] = checkFlag;

    if (isProgrammatic === false) {
      setTimeout(() => {
        this.checkTree[index1][index2] =
          checked !== undefined ? checked : !this.checkTree[index1][index2];
        this.makeEventIfEmpty();
      }, 10);
    } else {
      this.checkTree[index1][index2] =
        checked !== undefined ? checked : !this.checkTree[index1][index2];
      this.makeEventIfEmpty();
    }
  }

  makeEventIfEmpty() {
    let empty = true;
    this.checkTree.forEach((array) =>
      array.forEach((item) => {
        if (item === true) {
          empty = false;
        }
      }),
    );
    if (empty === true) {
      this.isTrashSelected = undefined;
      this.isTrashSelectedEvent.emit(undefined);
    }
  }
  modelCheck(index1: number, index2: number, checked: ModelCheckedType) {
    if (
      !checked.shiftKeySelected ||
      this.lastSelectedCategory === undefined ||
      this.lastSelectedItem === undefined
    ) {
      this.lastSelectedCategory = index1;
      this.lastSelectedItem = index2;

      // 選択されたモデルの状態を確認
      const selectedModel =
        this.dataAccordion?.[index1]?.rawData?.models?.[index2];
      const isSelectedModelInTrash =
        selectedModel?.modelStatus === ModelStatusTypes.NUMBER_1;

      if (this.isTrashSelected !== true && isSelectedModelInTrash) {
        this.setTrashSelected();
      } else if (this.isTrashSelected !== false && !isSelectedModelInTrash) {
        this.setRealDataSelected();
      }
      this.setModelCheck(index1, index2, checked.isProgrammatic);
      this.checkTreeCopy = cloneDeep(this.checkTree);
      this.checkParentCopy = [...this.checkParent];

      // 単一選択後にもfilteredCheckTreeを更新
      this.updateFilteredCheckTree();
    } else {
      // 選択されたモデルの状態を確認
      const selectedModel =
        this.dataAccordion?.[index1]?.rawData?.models?.[index2];
      const isSelectedModelInTrash =
        selectedModel?.modelStatus === ModelStatusTypes.NUMBER_1;

      if (
        (this.isTrashSelected === false && isSelectedModelInTrash) ||
        (this.isTrashSelected === true && !isSelectedModelInTrash)
      ) {
        this.checkTree[index1][index2] = true;
        setTimeout(() => {
          this.checkTree[index1][index2] = false;
        }, 10);
      } else {
        this.checkTree = cloneDeep(this.checkTreeCopy);
        this.checkParent = [...this.checkParentCopy];
        if (checked.isProgrammatic === false) {
          //when click the checkbox while holding down shift key
          this.checkTree[index1][index2] = false;
          setTimeout(() => {
            this.checkTree[index1][index2] = true;
          }, 10);
        } else {
          this.checkTree[index1][index2] = true;
        }
        let beforeFlag = true;
        if (index1 > this.lastSelectedCategory) {
          beforeFlag = false;
        } else if (index1 === this.lastSelectedCategory) {
          beforeFlag = this.lastSelectedItem > index2;
        }

        if (beforeFlag === true) {
          let index;

          for (index = index1 + 1; index < this.lastSelectedCategory; index++) {
            this.checkTree[index].fill(true);
            this.checkParent[index] = true;
          }
          if (index1 === this.lastSelectedCategory) {
            this.checkTree[index1].fill(
              true,
              index2 + 1,
              this.lastSelectedItem + 1,
            );
          } else {
            this.checkTree[index1].fill(true, index2 + 1);
            this.checkTree[this.lastSelectedCategory].fill(
              true,
              0,
              this.lastSelectedItem + 1,
            );
          }
        } else {
          let index;

          for (index = this.lastSelectedCategory + 1; index < index1; index++) {
            this.checkTree[index].fill(true);
            this.checkParent[index] = true;
          }
          let start = this.lastSelectedItem;
          if (start === -1) {
            start = 0;
          }
          if (index1 === this.lastSelectedCategory) {
            if (index2 > 0) {
              this.checkTree[this.lastSelectedCategory].fill(
                true,
                start,
                index2,
              );
            }
          } else {
            this.checkTree[this.lastSelectedCategory].fill(true, start);
            if (index2 > 0) {
              this.checkTree[index1].fill(true, 0, index2);
            }
          }
        }
        this.setParentCheck();

        // 範囲選択後にfilteredCheckTreeを更新
        this.updateFilteredCheckTree();
      }
    }
  }

  /**
   * カテゴリ内のモデル状態を分析して、ゴミ箱モデルが優勢かどうかを判定する
   */
  private setParentCheckForCategory(index: number): void {
    const models = this.dataAccordion?.[index]?.rawData?.models || [];

    if (models.length === 0) return;

    // カテゴリ内のモデルを分析
    const trashModels = models.filter(
      (model) => model.modelStatus === ModelStatusTypes.NUMBER_1,
    );
    const normalModels = models.filter(
      (model) => model.modelStatus === ModelStatusTypes.NUMBER_0,
    );

    // ゴミ箱モデルが過半数または同数の場合はゴミ箱として扱う
    // そうでない場合は通常モデルとして扱う
    const treatAsTrash = trashModels.length >= normalModels.length;

    if (this.isTrashSelected !== true && treatAsTrash) {
      this.setTrashSelected();
    } else if (this.isTrashSelected !== false && !treatAsTrash) {
      this.setRealDataSelected();
    }
  }

  // checkTreeの変更をfilteredCheckTreeに反映する
  private updateFilteredCheckTree() {
    // 親コンポーネントにfilteredCheckTreeの同期を要求
    this.checkTreeChanged.emit(this.checkTree);
  }

  public setParentCheck() {
    this.checkTree.forEach((list, index) => {
      let checkFlag = true;
      list.forEach((check) => {
        if (check === false) {
          checkFlag = false;
        }
      });
      if (list.length > 0) {
        this.checkParent[index] = checkFlag;
      }
    });
  }

  public async onModelSelected(file: FileForView) {
    if (this.isModelLoading(file) || this.isModelAssimilating(file)) return;

    if (!this.isModelUnload(file)) {
      const resModelObjects =
        await this.trimbleWorkSpaceAPI?.viewer.getColoredObjects();

      resModelObjects &&
        this.store.dispatch(
          Data3dViewWideAction.SetColorsModelAction({
            modelsColor: resModelObjects,
          }),
        );
    }
    // 3d-viewにファイルの読み込み指示アクションを投げる
    this.store.dispatch(
      TrimbleConnect3DViewerAction.DemandToView3DEvent.ModelReadRequestAction({
        id: file.id,
        state:
          this.classifiedModelLoadStatus?.[file.id] ||
          LoadingStatusMode.Unloaded,
        params: {
          color: file.color,
          transparent: file.transparent,
          modelType: file.modelType,
          visualizeUrl: file.visualizeUrl,
        },
      }),
    );
  }

  public isModelLoading(item: FileForView): boolean {
    return (
      this.classifiedModelLoadStatus?.[item.id] === LoadingStatusMode.Loading
    );
  }

  public isModelUnload(item: FileForView): boolean {
    return (
      this.classifiedModelLoadStatus?.[item.id] ===
        LoadingStatusMode.Unloaded || !this.classifiedModelLoadStatus?.[item.id]
    );
  }

  public isModelLoaded(item: FileForView): boolean {
    return (
      this.classifiedModelLoadStatus?.[item.id] === LoadingStatusMode.Loaded
    );
  }

  public isModelFailed(item: FileForView): boolean {
    return (
      this.classifiedModelLoadStatus?.[item.id] === LoadingStatusMode.Failed
    );
  }

  public isModelAssimilating(item: FileForView): boolean {
    return (
      this.classifiedModelLoadStatus?.[item.id] ===
      LoadingStatusMode.Assimilating
    );
  }

  public isModelAssimilationBusy(item: FileForView): boolean {
    return (
      this.classifiedModelLoadStatus?.[item.id] ===
      LoadingStatusMode.AssimilationBusy
    );
  }

  public isCategoryExpand(category: CategoryForView) {
    return Boolean(this.classifiedModelExpandCategory?.[category.id]);
  }

  public onShowPropertyView(model: FileForView) {
    this.currentModel = model;

    this.store.dispatch(
      ModelPropertyViewAction.SelectedFile3DModel({
        file: model,
      }),
    );

    this.store.dispatch(
      AreaDisplayControlAction.ShowOverFlowRightAreaAction({
        command: NtCommand.Property3D,
        fromProperty: false,
        closeRightArea: false,
      }),
    );
  }

  public onShowEditForm(model: FileForView) {
    this.store.dispatch(
      ModelPropertyViewAction.SelectedFile3DModel({
        file: model,
      }),
    );

    this.store.dispatch(
      ModelPropertyViewAction.GetDetailTrimbleFileInfoAction(),
    );
    this.store.dispatch(ModelPropertyViewAction.GetDetailFileModelAction());

    this.store.dispatch(
      AreaDisplayControlAction.ShowOverFlowRightAreaAction({
        command: NtCommand.FormEditProperty3D,
        fromProperty: false,
        closeRightArea: false,
      }),
    );
  }

  public onTagClicked(tagLabel: string): void {
    this.tagClicked.emit(tagLabel);
  }

  public onShowExportPanel(model: FileForView) {
    this.currentModel = model;

    this.store.dispatch(
      ExportAction.SelectModelAction({
        model,
      }),
    );

    this.store.dispatch(
      AreaDisplayControlAction.ShowOverFlowRightAreaAction({
        command: NtCommand.Export,
        fromProperty: false,
        closeRightArea: false,
      }),
    );
  }

  public onShowHeightChangePanel(model: FileForView) {
    this.currentModel = model;

    this.store.dispatch(
      HeightChangeAction.OpenHeightChangePanelAction({
        modelId: model.id,
        modelName: model.name,
      }),
    );

    this.store.dispatch(
      AreaDisplayControlAction.ShowOverFlowRightAreaAction({
        command: NtCommand.HeightChange,
        fromProperty: false,
        closeRightArea: false,
      }),
    );
  }

  public onShowConstructionTopographyPanel(model: FileForView) {
    this.currentModel = model;

    this.store.dispatch(
      ConstructionTopographyAction.SelectModelAction({
        model,
      }),
    );

    this.store.dispatch(
      AreaDisplayControlAction.ShowRightAreaAction({
        view_type: NtCommand.ConstructionTopography,
      }),
    );
  }

  // ゴミ箱から復元
  public restoreFromTrash(model: FileForView) {
    this.dataAccordion?.forEach((cfv) => {
      cfv.rawData.models.forEach((m) => {
        if (m.id === model.id) {
          const data: QueryUpdateModelParam = {
            name: m.name,
            modelType: m.modelType,
            modelKind: m.modelKind,
            dateTime: m.dateTime,
            useForConstructionData: m.useForConstructionData,
            color: m.color,
            transparency: m.transparency,
            modelStatus: ModelStatusTypes.NUMBER_0,
          };

          this.store.dispatch(
            ModelPropertyViewAction.SelectedFile3DModel({
              file: model,
            }),
          );

          this.store.dispatch(
            ModelPropertyViewAction.UpdateFile3DModelAction({
              data,
              updateConstructionActivity: false,
            }),
          );
        }
      });
    });
  }

  // ゴミ箱へ移動
  public onMoveToTrash(model: FileForView) {
    if (this.isModelLoaded(model)) {
      this.store.dispatch(
        TrimbleConnect3DViewerAction.DemandToView3DEvent.ModelReadRequestAction(
          {
            id: model.id,
            state: LoadingStatusMode.Loaded,
            params: {
              color: model.color,
              transparent: model.transparent,
              modelType: model.modelType,
              visualizeUrl: model.visualizeUrl,
            },
          },
        ),
      );
    }
    this.dataAccordion?.forEach((cfv) => {
      cfv.rawData.models.forEach((m) => {
        if (m.id === model.id) {
          const data: QueryUpdateModelParam = {
            name: m.name,
            modelType: m.modelType,
            modelKind: m.modelKind,
            dateTime: m.dateTime,
            useForConstructionData: m.useForConstructionData,
            color: m.color,
            transparency: m.transparency,
            modelStatus: ModelStatusTypes.NUMBER_1,
          };

          this.store.dispatch(
            ModelPropertyViewAction.SelectedFile3DModel({
              file: model,
            }),
          );

          this.store.dispatch(
            ModelPropertyViewAction.UpdateFile3DModelAction({
              data,
              updateConstructionActivity: false,
            }),
          );
        }
      });
    });
    this.store.dispatch(
      ModelPropertyViewAction.MoveToTrashModelCompleteAction(),
    );
  }

  public handleClickBox(
    event: MouseEvent,
    index: number,
    programmaticChange: boolean = false,
  ) {
    event.stopPropagation();

    // カテゴリ内のモデル状態を分析して適切に処理
    this.setParentCheckForCategory(index);

    this.checkTree[index] = Array.from(
      { length: this.checkTree[index].length },
      () => !this.checkParent[index],
    );
    this.makeEventIfEmpty();
    if (programmaticChange === false) {
      setTimeout(() => {
        this.checkParent[index] = !this.checkParent[index];
      }, 10);
    } else {
      this.checkParent[index] = !this.checkParent[index];
    }

    this.checkTreeCopy = cloneDeep(this.checkTree);
    this.checkParentCopy = [...this.checkParent];

    // 親チェックボックス変更後にもfilteredCheckTreeを更新
    this.updateFilteredCheckTree();
  }

  refreshCheckCount() {
    this.checkCount = 0;
    this.checkTree.forEach((list) => {
      list.forEach((item) => {
        if (item === true) {
          this.checkCount++;
        }
      });
    });
  }

  public onOpenDeleteModalMulti() {
    this.refreshCheckCount();
    this.confirmDeleteMultiModels?.open();
  }

  public onRestoreFromTrashMulti() {
    this.refreshCheckCount();
    this.confirmRestoreMultiModels?.open();
  }

  public closePopupConfirmDelete() {
    this.confirmDeleteMultiModels?.close();
  }

  public closePopupConfirmRestore() {
    this.confirmRestoreMultiModels?.close();
  }

  public async handleOkDeleteMulti() {
    const deleteIds: string[] = [];

    for (let i = 0; i < this.checkTree.length; i++) {
      for (let j = 0; j < this.checkTree[i].length; j++) {
        if (
          this.checkTree[i][j] === true &&
          this.dataAccordion?.[i].rawData.models[j]
        ) {
          deleteIds.push(this.dataAccordion?.[i].modelForView[j].id);
        }
      }
    }
    this.store.dispatch(
      ModelPropertyViewAction.DeleteMultiModelAction({
        modelIds: deleteIds,
      }),
    );

    this.exitEditMode.emit();
    this.closePopupConfirmDelete();
  }

  public onMoveToTrashMulti() {
    const trashIds: string[] = [];
    for (let i = 0; i < this.checkTree.length; i++) {
      for (let j = 0; j < this.checkTree[i].length; j++) {
        if (
          this.checkTree[i][j] === true &&
          this.dataAccordion?.[i].rawData.models[j]
        ) {
          const model = this.dataAccordion?.[i].modelForView[j];

          trashIds.push(model.id);
          if (this.isModelLoaded(model)) {
            this.store.dispatch(
              TrimbleConnect3DViewerAction.DemandToView3DEvent.ModelReadRequestAction(
                {
                  id: model.id,
                  state: LoadingStatusMode.Loaded,
                  params: {
                    color: model.color,
                    transparent: model.transparent,
                    modelType: model.modelType,
                    visualizeUrl: model.visualizeUrl,
                  },
                },
              ),
            );
          }
        }
      }
    }

    this.store.dispatch(
      ModelPropertyViewAction.MoveToTrashMultiModelCompleteAction(),
    );
    this.store.dispatch(
      ModelPropertyViewAction.UpdateMultiFile3DModelAction({
        modelIds: trashIds,
        modelStatus: ModelStatusTypes.NUMBER_1,
      }),
    );
    this.exitEditMode.emit();
  }

  public handleOkRestoreMulti() {
    const trashIds: string[] = [];
    for (let i = 0; i < this.checkTree.length; i++) {
      for (let j = 0; j < this.checkTree[i].length; j++) {
        if (
          this.checkTree[i][j] === true &&
          this.dataAccordion?.[i].rawData.models[j]
        ) {
          trashIds.push(this.dataAccordion?.[i].modelForView[j].id);
        }
      }
    }

    this.store.dispatch(
      ModelPropertyViewAction.UpdateMultiFile3DModelAction({
        modelIds: trashIds,
        modelStatus: ModelStatusTypes.NUMBER_0,
      }),
    );
    this.exitEditMode.emit();
    this.closePopupConfirmRestore();
  }

  /**
   * すべてのツリービューを折りたたむ
   */
  public foldTreeItem() {
    this.dataAccordion.forEach((item) => {
      this.store.dispatch(
        FileTreeViewAction.CategoryForViewAction.SetExpandStateAction({
          isExpand: false,
          categoryForView: item.categoryForView,
        }),
      );
    });
  }

  /**
   * すべてのツリービューを展開する
   */
  public expandTreeItem() {
    this.dataAccordion.forEach((item) => {
      this.store.dispatch(
        FileTreeViewAction.CategoryForViewAction.SetExpandStateAction({
          isExpand: true,
          categoryForView: item.categoryForView,
        }),
      );
    });
  }
}
