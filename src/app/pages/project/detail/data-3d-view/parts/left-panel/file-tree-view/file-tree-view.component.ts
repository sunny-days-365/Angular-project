import { Store, select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import {
  Observable,
  filter,
  firstValueFrom,
  map,
  switchMap,
  take,
  distinctUntilChanged,
} from 'rxjs';
import { Model, ModelTypes } from '@nikon-trimble-sok/api-sdk-d3';
import { NtCommand } from 'src/app/stores/states/project/area-display-control.state';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import { FileTreeViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.action';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { Map3dViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/map-3d-view/map-3d-view.action';
import { TrimbleConnect3DViewerAction } from 'src/app/stores/actions/project/detail/data-3d-view/trimble-connect-3d-viewer.action';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { Data3DViewWideSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/data-3d-view-wide.selector';
import { FileTreeViewSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.selector';
import { TrimbleConnect3DViewerSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/trimble-connect-3d-viewer.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  ClassifiedFileForView,
  FileForView,
  FileTreeDisplayMode,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.state';
import { DropdownOption } from './parts/display-mode-dropdown/display-mode-dropdown.component';
import { WorkspaceAPI } from 'trimble-connect-workspace-api';
import { Data3DViewHelperService } from '../../../data-3d-view.service';
import { ChangeAreaModalComponent } from '../change-area-modal/change-area-modal.component';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { ModelKindFilterOptions } from './file-tree-view.definition';
import { DisplaySettingAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/display-setting/display-setting.action';
import { FileTreeDisplayModeAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/file-tree-display-mode/file-tree-display-mode.action';
import { MultiSelectDataItem } from '@nikon-trimble-sok/parts-components';
import { ProjectStateAction } from 'src/app/stores/actions/project/project-state.action';
import { ProjectSelector } from 'src/app/stores/selectors/project/project.selector';
import {
  TagRelation,
  TagResponse,
} from 'src/app/stores/definitions/definition';
import { AccordionListFileComponent } from './parts/accordion-list-file/accordion-list-file.component';
import { HttpClient } from '@angular/common/http';
import { TrimbleProjectsApiServices } from 'src/app/services/trimble-projects-api-services/trimble-projects-api-services';
import { FileTreeDisplayModeService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/file-tree-display-mode/file-tree-display-mode.service';
import { ApplicationWideErrorAction } from 'src/app/stores/actions/application-wide/application-wide-error.action';

export const TOAST_MESSAGE_SAVE_VIEW_STATE = 'ビューの表示状態を保存しました。';
export const TOAST_MESSAGE_SAVE_THUMBNAIL = 'サムネイルを保存しました。';
export const ERROR_TOAST_MESSAGE_SAVE_THUMBNAIL =
  'サムネイルの保存に失敗しました。';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-file-tree-view-component',
  templateUrl: './file-tree-view.component.html',
  styleUrls: ['./file-tree-view.component.scss'],
})
export class FileTreeViewComponent extends BaseComponent implements OnInit {
  @ViewChild('changeAreaModal') changeAreaModal:
    | ChangeAreaModalComponent
    | undefined;

  @ViewChild('data3dViewTree') data3dViewTree:
    | AccordionListFileComponent
    | undefined;

  @ViewChild('tagInput') tagInputRef: ElementRef | undefined;

  // enum切り替え用の参照項目
  public readonly NtCommandType = NtCommand;

  // 表示モード関連のプロパティ
  public currentDisplayMode$: Observable<FileTreeDisplayMode>;
  public currentDisplayMode: FileTreeDisplayMode = FileTreeDisplayMode.CATEGORY;

  // ドロップダウン用のオプション定義（カスタムドロップダウン用）
  public dropdownOptions: DropdownOption[] = [
    { id: FileTreeDisplayMode.CATEGORY, display: 'データ分類表示' },
    { id: FileTreeDisplayMode.TAG, display: 'タグ表示' },
    { id: FileTreeDisplayMode.DATE, display: '更新日表示' },
    { id: FileTreeDisplayMode.ORIGINAL_FILE, display: '元ファイル表示' },
  ];

  // タグ情報（タグ表示用）
  public tagSources: MultiSelectDataItem[] = [];

  private modelsTree: ClassifiedFileForView[] = [];

  public filteredModelsTree: ClassifiedFileForView[] = [];

  // 読み込み中の判定
  public isLoading$!: Observable<boolean>;

  hasArea: boolean = false;

  public trimbleWorkSpaceAPI: WorkspaceAPI | undefined;

  public models: Model[] = [];

  public modelsImport: Model[] = [];

  public viewId: string | undefined;

  public ModelKindFilterOptions = ModelKindFilterOptions;

  public showSavedToast = false;
  public showErrorToast = false;

  public toastMessage: string = '';
  public errorToastMessage: string = '';

  public currentClock: NodeJS.Timeout | undefined;

  // タグ操作進行中フラグ
  private tagOperationInProgress = false;

  // 動的な分類フィルターオプション（表示モードに応じて変更）
  public dynamicModelKindFilterOptions: MultiSelectDataItem[] = [];
  public dynamicModelKindFilterOptionsLabel: string[] = [];

  // 元の静的フィルターオプション（分類表示モード用）
  public ModelKindFilterOptionsLabel = ModelKindFilterOptions.map(
    (option) => option.label,
  );

  private selectedModelKindFilters: MultiSelectDataItem[] = [];

  private selectedTagFilters: MultiSelectDataItem[] = [];

  public cameraDisabled: boolean = false;

  public checkTree: boolean[][] = [];

  public filteredCheckTree: boolean[][] = [];

  public checkParent: boolean[] = [];

  public isEditMode: boolean = false;

  public showKindFilter: boolean = false;

  public showTagFilter: boolean = false;

  public currentTypeDisplay: string = 'モデル種別';

  public tagFilterOptions: MultiSelectDataItem[] = [];
  public tagFilterOptionsLabel: string[] = [];
  public tagFilterOptionsLabelForAutocomplete: string[] = [];

  public tagRelation: TagRelation = {};

  public trashSelected: boolean | undefined;

  public isSaving: boolean = false;

  // チェックボックス更新中かどうかのフラグ
  private isUpdatingCheckboxes: boolean = false;

  public treeItemFolded: boolean = false;

  // タグ編集モード関連のプロパティ
  public isTagEditMode: boolean = false;

  private projectId: string | undefined;

  // フィルター表示状態の管理
  public showFilterToolbar$ = this.store.select(
    FileTreeViewSelector.selectorShowFilterToolbar,
  );

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private data3DViewHelperService: Data3DViewHelperService,
    public projectAccessControlService: ProjectAccessControlService,
    private httpClient: HttpClient,
    private trimbleProjectsService: TrimbleProjectsApiServices,
    private fileTreeDisplayModeService: FileTreeDisplayModeService,
  ) {
    super('FileTreeView');

    // ローカルストレージから表示モードを同期的に読み込み
    const savedDisplayMode = this.fileTreeDisplayModeService.get();
    if (savedDisplayMode?.currentDisplayMode) {
      this.currentDisplayMode = savedDisplayMode.currentDisplayMode;

      // ストアにも即座に反映（ただし、エフェクトで分類データ再構築をトリガーしないようにする）
      this.store.dispatch(
        FileTreeViewAction.DisplayModeAction.SetDisplayModeAction({
          displayMode: savedDisplayMode.currentDisplayMode,
        }),
      );
    }

    // 表示モードのObservableを初期化
    this.currentDisplayMode$ = this.store.pipe(
      select(FileTreeViewSelector.selectorCurrentDisplayMode),
      map((mode) => mode ?? this.currentDisplayMode), // 初期値としてローカルストレージの値を使用
      distinctUntilChanged(),
    );

    // Memo
    // 通常のルーティング遷移じゃなくて、コンポーネント単位の表示切り替えなので、
    // 隠れていたコンポーネントが再表示されたときにここが呼ばれないことがある。
    // そこで、effector側で再描画処理を行うようにする。

    // this.store.dispatch(
    //   FileTreeViewAction.FileTreeViewWideAction.BulkUpdateAction()
    // );
    this.store.dispatch(ProjectStateAction.GetTagSettingsAction());
    this.store.dispatch(ProjectStateAction.GetAllTagSettingsAction());
  }

  public ngOnInit(): void {
    // フィルター表示状態を読み込み
    this.loadFilterToolbarState();

    // 各種サブスクリプションの初期化

    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectDetail)
        .subscribe((projectDetail) => {
          this.hasArea = !!projectDetail?.address?.geometry;
          this.projectId = projectDetail?.id;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(FileTreeViewSelector.selectorViewId)
        .subscribe((viewId) => {
          this.viewId = viewId;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(ProjectSelector.selectorAllTags))
        .subscribe((tags) => {
          if (tags) {
            this.initializeTagOptions(tags);
          }
        }),
    );

    // 表示モードの変更を監視
    this.addSubscriptionsList(
      this.currentDisplayMode$.subscribe((mode) => {
        // モード変更時にフィルター状態を保存
        const previousMode = this.currentDisplayMode;
        const previousModelKindFilters = [...this.selectedModelKindFilters];
        const previousTagFilters = [...this.selectedTagFilters];

        this.currentDisplayMode = mode;

        // モード変更時も選択状態を維持する（手動モード切替でない場合）
        if (previousMode && previousMode !== mode) {
          // 表示モードが変わった後に実行
          setTimeout(() => {
            // 以前の分類フィルター選択を復元
            if (previousModelKindFilters.length > 0) {
              this.selectedModelKindFilters = previousModelKindFilters;
            }

            // タグフィルターも復元
            if (previousTagFilters.length > 0) {
              this.selectedTagFilters = previousTagFilters;
            }

            // フィルターを再適用
            this.applyModelTreeFilter();
          }, 100);
        }
      }),
    );

    // 現在の分類済みモデルを監視（動的にタブに応じたデータを取得）
    this.addSubscriptionsList(
      this.store
        .pipe(select(FileTreeViewSelector.selectorCurrentClassifiedModel))
        .subscribe((models) => {
          if (models) {
            this.modelsTree = models;
            this.updateCheckTreeStructure();
            this.updateFilterOptionsForCurrentMode();
            this.applyModelTreeFilter();
          }
        }),
    );

    // 初期化時に表示モードと分類データが同期されるように確保する
    this.addSubscriptionsList(
      this.store
        .pipe(
          select(FileTreeViewSelector.selectorCurrentClassifiedModel),
          filter((models) => models !== undefined && models.length > 0),
          take(1),
        )
        .subscribe(() => {
          // 初期化時に現在の表示モードに応じた分類データ構築をトリガー
          const savedDisplayMode = this.currentDisplayMode;
          if (savedDisplayMode !== FileTreeDisplayMode.CATEGORY) {
            setTimeout(() => {
              this.store.dispatch(
                FileTreeViewAction.DisplayModeAction.SetDisplayModeAction({
                  displayMode: savedDisplayMode,
                }),
              );
            }, 200);
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(ProjectSelector.selectorTagSettings))
        .subscribe((x) => {
          const keys1 = Object.keys(this.tagRelation);
          const keys2 = Object.keys(x);

          // Check if both objects have the same number of keys
          if (keys1.length !== keys2.length) {
            this.tagRelation = x;
            this.applyModelTreeFilter();
          }
          // Check if both objects have the same keys and corresponding values
          for (let i = 0; i < keys1.length; i++) {
            const key = keys1[i];

            // If the keys do not match, return false
            if (!keys2.includes(key)) {
              this.tagRelation = x;
              this.applyModelTreeFilter();
            }
            // Compare the arrays associated with each key
            const values1 = this.tagRelation[key];
            const values2 = x[key];

            // If the arrays are not the same length or have different elements, return false
            if (
              values1.length !== values2.length ||
              !values1.every((v, index) => v === values2[index])
            ) {
              this.tagRelation = x;
              this.applyModelTreeFilter();
            }
          }
        }),
    );

    // 読み込み中か判定する
    // 3d-viewが未初期化の場合も、ロード中という扱いとする
    {
      this.isLoading$ = this.store.pipe(
        select(Data3DViewWideSelector.selectorData3DViewInProcess),
      );
    }

    this.addSubscriptionsList(
      this.store
        .pipe(
          select(
            TrimbleConnect3DViewerSelector.View3DViewerSelector
              .selectorTrimbleWorkspaceAPI,
          ),
        )
        .subscribe((API) => {
          if (API) {
            this.trimbleWorkSpaceAPI = API;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(Data3DViewWideSelector.selectorListAllModel)
        .pipe(
          switchMap(async (list: Model[] | undefined) => {
            if (list) {
              const newModelIds = new Set(list.map((newModel) => newModel.id));
              const deletedModels = this.models.filter(
                (oldModel) => !newModelIds.has(oldModel.id),
              );

              let latestConstructionDataUpdated = false;
              for (const deletedModel of deletedModels) {
                await this.data3DViewHelperService.removeDeletedModel(
                  deletedModel,
                );

                if (
                  this.data3DViewHelperService.isLatestConstructionData(
                    deletedModel,
                  )
                ) {
                  latestConstructionDataUpdated = true;
                }
              }

              this.models = list;
              this.applyModelTreeFilter();

              if (latestConstructionDataUpdated) {
                this.data3DViewHelperService.showLatestConstructionProgressModel();
              }
            }
          }),
        )
        .subscribe(),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ImportModels))
        .subscribe(({ modelIds }) => {
          this.data3DViewHelperService.showModelAfterTreeLoaded(
            modelIds,
            'import-popup',
            false,
          );
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ViewModelsColor))
        .subscribe(({ models }) => {
          this.modelsImport =
            models?.filter(
              (item) =>
                item.modelType !== ModelTypes.NUMBER_8 &&
                item.modelType !== ModelTypes.NUMBER_6,
            ) ?? [];
        }),
    );

    // BulkUpdateAction完了後に表示モードを再適用
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            FileTreeViewAction.FileTreeViewWideAction
              .GetListModelCompleteAction,
          ),
        )
        .subscribe(() => {
          const currentMode = this.currentDisplayMode;
          if (currentMode !== FileTreeDisplayMode.CATEGORY) {
            // 分類データがロードされた後に表示モードを再適用
            setTimeout(() => {
              this.store.dispatch(
                FileTreeViewAction.DisplayModeAction.SetDisplayModeAction({
                  displayMode: currentMode,
                }),
              );
            }, 200);
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(TrimbleConnect3DViewerSelector.selectorModelsCurrentLoaded)
        .subscribe((models) => {
          this.cameraDisabled =
            models === undefined ||
            models.length === undefined ||
            models.length === 0;
        }),
    );

    this.store.dispatch(DisplaySettingAction.GetLocalStorageAction());

    // ローカルストレージから表示モードを最初に読み込み、同期的に適用する
    this.initializeDisplayModeFromStorage();

    // 現在の表示モードを監視してフィルターを再適用
    // ただし、初期化時は既にコンストラクタで設定済みの値を使用
    this.addSubscriptionsList(
      this.store
        .pipe(select(FileTreeViewSelector.selectorCurrentDisplayMode))
        .subscribe((displayMode) => {
          if (displayMode && displayMode !== this.currentDisplayMode) {
            this.currentDisplayMode = displayMode;
            this.updateFilterOptionsForCurrentMode();
            this.applyModelTreeFilter();
          }
        }),
    );

    // タグ編集モードの状態を監視
    this.addSubscriptionsList(
      this.store
        .pipe(select(FileTreeViewSelector.selectorIsTagEditMode))
        .subscribe((isTagEditMode) => {
          this.isTagEditMode = isTagEditMode;
        }),
    );

    // タグ操作のエラー監視
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(ApplicationWideErrorAction.OnErrorAction),
          filter(
            (action) =>
              action.message.includes('タグ') || action.message.includes('tag'),
          ),
        )
        .subscribe((action) => {
          this.tagOperationInProgress = false; // エラー時にフラグをリセット
          this.errorToastMessage = action.message;
          this.showErrorToast = true;
        }),
    );

    // タグ設定の更新成功を監視
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ProjectStateAction.SetTagSettingsAction))
        .subscribe(() => {
          this.tagOperationInProgress = false; // 成功時にフラグをリセット
          // タグ操作が成功した場合にトーストを表示
          if (this.isTagEditMode) {
            this.toastMessage = 'タグの更新が完了しました。';
            this.showSavedToast = true;
          }
        }),
    );
  }

  public updateColorModels() {
    this.trimbleWorkSpaceAPI?.viewer.getColoredObjects().then((res) => {
      const listModels: Model[] = [];

      if (!res) return;

      for (let i = 0; i < res.length; i++) {
        const item = res[i];
        const matchingModel = this.models.find(
          (model) => model.id === item.modelId,
        );

        if (matchingModel) {
          const hexColor =
            item.objects.length > 1
              ? item.objects[1].color
              : item.objects[0].color;

          if (!hexColor) {
            // If hexColor is not defined or null, skip to the next iteration
            continue;
          }

          const opacity = parseInt(hexColor.substring(7), 16) / 255;

          const updatedModel: Model = {
            ...matchingModel,
            color: parseInt(hexColor.substring(0, 7).slice(1), 16),
            transparency: Math.round(opacity * 100) || 100,
          };

          listModels.push(updatedModel);
        }
      }

      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.UpdateMultiModelAction({
          models: listModels,
        }),
      );
    });
  }

  public showModel() {
    this.trimbleWorkSpaceAPI?.view.getViews().then((item) => {
      if (item.length) {
        this.trimbleWorkSpaceAPI?.view.selectView(
          item[item.length - 1].id as string,
        );
      }
      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.Save3DViewAction({
          viewId: item[item.length - 1].id as string,
        }),
      );
    });
  }

  // ビューを保存ボタン
  public saveModel() {
    if (this.checkDisabledForSaveModel() || this.isSaving) {
      return;
    }
    clearTimeout(this.currentClock);
    this.showSavedToast = false;
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        restoreSetting: {
          restoreSaved: true,
        },
      }),
    );
    this.isSaving = true;

    this.data3DViewHelperService.saveCurrentState();
    this.actions$
      .pipe(ofType(DisplaySettingAction.SavedCameraStatus))
      .pipe(take(1))
      .subscribe(() => {
        this.toastMessage = TOAST_MESSAGE_SAVE_VIEW_STATE;
        this.isSaving = false;
        this.showSavedToast = true;
        this.currentClock = setTimeout(() => {
          this.showSavedToast = false;
        }, 15000);
      });
  }

  public hideSavedToast() {
    this.showSavedToast = false;
    this.toastMessage = '';
  }

  public hideErrorToast() {
    this.showErrorToast = false;
    this.errorToastMessage = '';
  }

  // パネルの切り替えボタン
  public toggleSidePanelClick() {
    this.store.dispatch(
      TrimbleConnect3DViewerAction.DemandToView3DEvent.ToggleSidePannelAcition(),
    );
  }

  public openChangeAreaModal() {
    this.changeAreaModal?.open();
  }

  public create3DMap() {
    if (!this.hasArea || !this.projectAccessControlService.isBasicAvailable()) {
      return;
    }
    this.store.dispatch(Map3dViewAction.Create3DMapAction());
  }

  // RTC機能が準備できたら、このリフレッシュボタンはもう必要なくなるよ。
  public refreshModelList() {
    this.store.dispatch(
      FileTreeViewAction.FileTreeViewWideAction.GetListModelAction({}),
    );
  }

  // 表示設定ボタン
  public showDisplaySettingPanel() {
    this.store.dispatch(
      Data3dViewWideAction.SetShowDisplaySettingAction({
        showDisplaySetting: true,
      }),
    );
  }

  public onModelKindFilterChange(indices: number[]) {
    // 選択インデックスから実際のフィルターオブジェクトを取得
    this.selectedModelKindFilters = indices.map(
      (index) => this.dynamicModelKindFilterOptions[index],
    );

    // フィルター変更を保存して表示に適用
    this.saveFilterState();
    this.applyModelTreeFilter();
  }

  public onModelTagFilterChange(indices: number[]) {
    // 選択インデックスから実際のフィルターオブジェクトを取得
    this.selectedTagFilters = indices.map(
      (index) => this.tagFilterOptions[index],
    );

    // フィルター変更を保存して表示に適用
    this.saveFilterState();
    this.applyModelTreeFilter();
  }

  // フィルター状態を保存する（表示モード切り替え時の復元用）
  private saveFilterState() {
    // ローカルストレージまたはセッションストレージに保存することも可能
    // 現在はインスタンス変数として保持するのみ
  }

  private applyModelTreeFilter() {
    // チェックボックス更新中は再フィルタリングをスキップ
    if (this.isUpdatingCheckboxes) {
      return;
    }

    // まず基本のフィルタリングを適用
    if (this.selectedModelKindFilters.length === 0) {
      this.filteredModelsTree = [...this.modelsTree];
      this.filteredCheckTree = [...this.checkTree];
      this.checkParent = Array.from(
        { length: this.filteredCheckTree.length },
        () => false,
      );
    } else {
      // 分類フィルタリングを適用（全ての表示モードで同じ動作にする）
      this.filteredCheckTree = [];

      if (this.currentDisplayMode === FileTreeDisplayMode.CATEGORY) {
        // 分類表示モードでは、カテゴリIDでフィルタリング（従来の動作）
        this.filteredModelsTree = this.modelsTree.filter((c, index) => {
          const returnValue = this.selectedModelKindFilters.some(
            (filter) => filter.id === c.categoryForView.id,
          );

          if (returnValue === true) {
            this.filteredCheckTree.push(this.checkTree[index]);
          }

          return returnValue;
        });
      } else {
        // タグ表示・更新日表示モードでは、対象のモデルをフィルタリングした新しいツリーを作成
        const filteredModelsTree: ClassifiedFileForView[] = [];
        const filteredCheckTree: boolean[][] = [];

        // 選択された分類のIDを取得
        const selectedCategoryIds = this.selectedModelKindFilters.map(
          (filter) => filter.id,
        );

        // 各カテゴリをループ
        this.modelsTree.forEach((category, categoryIndex) => {
          // このカテゴリに含まれるモデルをフィルタリング
          const filteredModels: FileForView[] = [];
          const filteredRawModels: Model[] = [];
          const newCheckArray: boolean[] = [];

          // カテゴリ内の各モデルをチェック
          category.modelForView.forEach((model, modelIndex) => {
            // モデルの中から、選択された分類に属するモデルを見つける
            const rawModel = category.rawData.models.find(
              (rm) => rm.id === model.id,
            );
            if (
              rawModel &&
              selectedCategoryIds.includes(rawModel.modelKind?.toString() || '')
            ) {
              filteredModels.push(model);
              filteredRawModels.push(rawModel);
              newCheckArray.push(this.checkTree[categoryIndex][modelIndex]);
            }
          });

          // フィルタリングされたモデルがある場合、新しいカテゴリを作成
          if (filteredModels.length > 0) {
            const newCategory: ClassifiedFileForView = {
              ...category,
              modelForView: filteredModels,
              rawData: {
                ...category.rawData,
                models: filteredRawModels,
              },
            };

            filteredModelsTree.push(newCategory);
            filteredCheckTree.push(newCheckArray);
          }
        });

        this.filteredModelsTree = filteredModelsTree;
        this.filteredCheckTree = filteredCheckTree;
      }

      this.checkParent = Array.from(
        { length: this.filteredCheckTree.length },
        () => false,
      );
    }

    // タグフィルタリング（すべての表示モードで有効）
    if (this.selectedTagFilters.length > 0) {
      const includeNoTag = this.selectedTagFilters.some(
        (item) => item.id === 'タグなし' && item.label === 'タグなし',
      );

      const tempCheckTree: boolean[][] = [];
      this.filteredModelsTree = this.filteredModelsTree.map((c, index1) => {
        const checkArray: boolean[] = [];

        const modelForView = c.modelForView.filter((item, index2) => {
          if (!this.tagRelation[item.id]) {
            // タグなしのモデルの場合
            if (includeNoTag) {
              checkArray.push(this.filteredCheckTree[index1][index2]);
            }
            return includeNoTag;
          }
          const returnValue = this.tagRelation[item.id].some((tag) =>
            this.selectedTagFilters.map((item) => item.id).includes(tag),
          );

          if (returnValue) {
            checkArray.push(this.filteredCheckTree[index1][index2]);
          }
          return returnValue;
        });
        const rawmodels = c.rawData.models.filter((model) => {
          if (!model.id) {
            return false;
          } else if (!this.tagRelation[model.id]) {
            return includeNoTag;
          }
          return this.tagRelation[model.id].some((tag) =>
            this.selectedTagFilters.map((item) => item.id).includes(tag),
          );
        });
        if (checkArray.length > 0) {
          tempCheckTree.push(checkArray);
        }
        return {
          ...c,
          modelForView,
          rawData: {
            ...c.rawData,
            models: rawmodels,
          },
        };
      });
      this.filteredModelsTree = this.filteredModelsTree.filter(
        (modelCategory) => {
          return modelCategory.modelForView.length > 0;
        },
      );

      this.filteredCheckTree = tempCheckTree;
      this.checkParent = Array.from(
        { length: this.filteredCheckTree.length },
        () => false,
      );
    }

    const filteredModels: string[] = [];
    this.filteredModelsTree.forEach((category) =>
      category.modelForView.forEach((model) => filteredModels.push(model.id)),
    );

    this.store.dispatch(
      Data3dViewWideAction.SetFilteredModelsAction({ models: filteredModels }),
    );
  }

  getModelKindFilterPlaceholder(): string {
    if (this.selectedModelKindFilters.length === 0) {
      return '全体表示';
    }
    if (this.selectedModelKindFilters.length === 1) {
      return this.selectedModelKindFilters[0].label;
    }
    for (const modelKind of this.dynamicModelKindFilterOptions) {
      if (this.selectedModelKindFilters.includes(modelKind)) {
        return `${modelKind.label} (+${this.selectedModelKindFilters.length - 1})`;
      }
    }
    return '';
  }

  getTagFilterPlaceholder(): string {
    if (this.selectedTagFilters.length === 0) {
      return 'タグ';
    }
    if (this.selectedTagFilters.length === 1) {
      return this.selectedTagFilters[0].label;
    }
    for (const tag of this.tagFilterOptions) {
      if (this.selectedTagFilters.includes(tag)) {
        return `${tag.label} (+${this.selectedTagFilters.length - 1})`;
      }
    }
    return '';
  }

  /**
   * 選択された分類フィルターのインデックスを取得
   * multi-selectorコンポーネント用
   */
  public getSelectedModelKindIndices(): number[] {
    if (this.selectedModelKindFilters.length === 0) {
      return [];
    }

    // 選択されたフィルターに対応するインデックスを取得
    return this.selectedModelKindFilters
      .map((filter) =>
        this.dynamicModelKindFilterOptions.findIndex(
          (opt) => opt.id === filter.id,
        ),
      )
      .filter((index) => index !== -1);
  }

  /**
   * 選択されたタグフィルターのインデックスを取得
   * multi-selectorコンポーネント用
   */
  public getSelectedTagIndices(): number[] {
    if (this.selectedTagFilters.length === 0) {
      return [];
    }

    // 選択されたタグに対応するインデックスを取得
    return this.selectedTagFilters
      .map((filter) =>
        this.tagFilterOptions.findIndex((opt) => opt.id === filter.id),
      )
      .filter((index) => index !== -1);
  }

  public exitEditMode() {
    this.isEditMode = false;
    // 編集モード終了時にチェックボックスの状態をリセット
    this.resetCheckboxStates();
    // フィルターUIの状態を更新
    this.refreshFilterUI();
  }

  public toggleKindFilterOptions() {
    this.showKindFilter = !this.showKindFilter;
  }
  public toggleTagFilterOptions() {
    this.showTagFilter = !this.showTagFilter;
  }

  // ゴミ箱へ移動する（一括）
  public moveToTrashMultiItems() {
    if (this.checkDisabledForDelete()) {
      return;
    }
    this.data3dViewTree?.onMoveToTrashMulti();
  }

  // ゴミ箱から戻す（一括）
  public restoreMultiItems() {
    if (this.checkDisabledForTrash()) {
      return;
    }
    this.data3dViewTree?.onRestoreFromTrashMulti();
  }

  // 削除（一括）
  public deleteMultiItems() {
    if (this.checkDisabledForTrash()) {
      return;
    }
    this.data3dViewTree?.onOpenDeleteModalMulti();
  }

  public trashItemSelected(event: boolean | undefined) {
    this.trashSelected = event;
  }

  // ゴミ箱へのアクション用
  checkDisabledForDelete() {
    if (
      !this.projectAccessControlService.isTrimbleConnectAdmin() ||
      !this.projectAccessControlService.isBasicAvailable()
    ) {
      return false;
    }
    return this.trashSelected || this.getSelectedModelCount() <= 0;
  }

  // ゴミ箱からのアクション用
  checkDisabledForTrash() {
    if (
      !this.projectAccessControlService.isTrimbleConnectAdmin() ||
      !this.projectAccessControlService.isBasicAvailable()
    ) {
      return false;
    }
    return !this.trashSelected || this.getSelectedModelCount() <= 0;
  }

  // ビューを保存用
  public checkDisabledForSaveModel() {
    return this.cameraDisabled || this.projectAccessControlService.isReadOnly();
  }

  // 編集用
  public checkDisabledForEdit() {
    return this.projectAccessControlService.isReadOnly();
  }

  // ツリービュー展開/折りたたむ
  public toggleTreeItem() {
    if (!this.treeItemFolded) {
      this.data3dViewTree?.foldTreeItem();
    } else {
      this.data3dViewTree?.expandTreeItem();
    }
    this.treeItemFolded = !this.treeItemFolded;
  }

  /**
   * すべてのモデルを非表示にする
   */
  public allModelVisibilityOff(): void {
    this.data3DViewHelperService.clearModel();
  }

  /**
   * 保存された初期表示にする
   */
  public resetAllModelVisibility(): void {
    this.data3DViewHelperService.resetVisibility();
  }

  /**
   * サムネイル画像の更新
   */
  public async takeSnapShot(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    this.isSaving = true;
    let hasError = false;

    // 3Dビューのスナップショット画像データ(png)を取得
    const thumbnailUrl = await this.data3DViewHelperService.captureSnapshot();

    if (!thumbnailUrl) {
      this.isSaving = false;
      this.errorToastMessage = ERROR_TOAST_MESSAGE_SAVE_THUMBNAIL;
      this.showErrorToast = true;
      return;
    }

    // 取得したURLから画像データを取得
    const buffer = await firstValueFrom(
      this.httpClient.get(thumbnailUrl, { responseType: 'arraybuffer' }),
    )
      .then((res) => res)
      .catch(() => {
        hasError = true;
      });

    if (hasError || !buffer) {
      this.isSaving = false;
      this.errorToastMessage = ERROR_TOAST_MESSAGE_SAVE_THUMBNAIL;
      this.showErrorToast = true;
      return;
    }

    // 画像データをFileオブジェクトに変換
    const file = new File(
      [new Blob([buffer], { type: 'image/png' })],
      'thumbnail.png',
    );

    // FormDataに変換
    const formData = new FormData();
    formData.append('file', file);

    // ファイルをサムネイルとしてアップロード
    const uploadImage = await this.trimbleProjectsService
      .uploadImage(this.projectId, formData)
      .then((res) => res)
      .catch(() => {
        hasError = true;
      });

    if (hasError || !uploadImage) {
      this.isSaving = false;
      this.errorToastMessage = ERROR_TOAST_MESSAGE_SAVE_THUMBNAIL;
      this.showErrorToast = true;
      return;
    }

    this.toastMessage = TOAST_MESSAGE_SAVE_THUMBNAIL;
    this.isSaving = false;
    this.showSavedToast = true;
  }

  /**
   * ドロップダウンの値変更イベントハンドラー
   * @param option 選択されたオプション
   */
  public onDropdownValueChange(option: DropdownOption) {
    if (option && option.id) {
      const displayMode = option.id as FileTreeDisplayMode;

      if (this.currentDisplayMode === displayMode) return;

      // 現在のフィルター選択状態を保存する
      const currentSelectedModelKindFilters = [
        ...this.selectedModelKindFilters,
      ];
      const currentSelectedTagFilters = [...this.selectedTagFilters];

      // モード変更をディスパッチ - エフェクトが自動的に分類を再構築する
      this.store.dispatch(
        FileTreeViewAction.DisplayModeAction.SetDisplayModeAction({
          displayMode,
        }),
      );

      // ローカルストレージに表示モードを保存
      this.store.dispatch(
        FileTreeDisplayModeAction.SetLocalStorageAction({
          currentDisplayMode: displayMode,
        }),
      );

      // モードが変更された後、少し遅延してフィルターを再適用する
      setTimeout(() => {
        // 保存していた分類フィルターを復元する
        if (currentSelectedModelKindFilters.length > 0) {
          this.selectedModelKindFilters = currentSelectedModelKindFilters;
          // フィルターを適用
          this.applyModelTreeFilter();
        }

        // タグフィルターも保持する
        if (currentSelectedTagFilters.length > 0) {
          this.selectedTagFilters = currentSelectedTagFilters;
          this.applyModelTreeFilter();
        }
      }, 100); // 表示モードが変わった後に実行するために少し遅延
    }
  }

  /**
   * 現在選択されているドロップダウンオプションを取得
   * @returns 現在のオプション
   */
  public getCurrentDropdownOption(): DropdownOption {
    return (
      this.dropdownOptions.find(
        (option) => option.id === this.currentDisplayMode,
      ) || this.dropdownOptions[0]
    );
  }

  /**
   * チェックツリーの構造を更新
   */
  private updateCheckTreeStructure() {
    this.checkTree = Array.from({ length: this.modelsTree.length }, () => []);
    this.modelsTree.forEach((target, index) => {
      const checkList: boolean[] = Array.from(
        { length: target.modelForView.length },
        () => false,
      );
      this.checkTree[index].push(...checkList);
    });
  }

  /**
   * タグフィルターを無効にするかどうか
   * 全ての表示モードでタグフィルターを表示するため、常にfalseを返す
   */
  public shouldDisableTagFilter(): boolean {
    return false; // 常に表示する
  }

  /**
   * リスト内でタグを非表示にするかどうか（タグ表示モード時）
   */
  public shouldHideTagsInList(): boolean {
    return this.currentDisplayMode === FileTreeDisplayMode.TAG;
  }

  /**
   * タグ情報を初期化する
   * タグなしは常に最後に（ゴミ箱の前に）配置する
   */
  private initializeTagOptions(tags: TagResponse[]) {
    if (tags) {
      // 通常のタグをリストに追加
      this.tagFilterOptions = tags
        .map((item) => {
          return {
            id: item.id,
            label: item.label,
          };
        })
        .filter((item) => item.label !== 'タグなし')
        .sort((a, b) => a.label.localeCompare(b.label));

      // タグなしを最後に追加（ゴミ箱の前に）
      this.tagFilterOptions.push({
        id: 'タグなし',
        label: 'タグなし',
      });

      // ラベル配列も同様に設定（オートコンプリート用にはタグなしを除外）
      this.tagFilterOptionsLabel = this.tagFilterOptions.map(
        (item) => item.label,
      );

      this.tagFilterOptionsLabelForAutocomplete =
        this.tagFilterOptionsLabel.filter((item) => item !== 'タグなし');

      // タグ表示用のソースデータを保存
      this.tagSources = [...this.tagFilterOptions];
    }
  }

  /**
   * 表示モードに応じて分類フィルターオプションを更新
   */
  private updateFilterOptionsForCurrentMode() {
    // 現在の選択を保存
    const previousModelKindFilters = [...this.selectedModelKindFilters];

    // 全ての表示モードでモデル分類フィルターを一貫して使用する
    this.dynamicModelKindFilterOptions = [...ModelKindFilterOptions];
    this.dynamicModelKindFilterOptionsLabel = ModelKindFilterOptions.map(
      (option) => option.label,
    );

    // 以前の選択を保持する（選択したフィルターが新しいオプションにも存在する場合）
    if (previousModelKindFilters.length > 0) {
      this.selectedModelKindFilters = previousModelKindFilters.filter(
        (filter) =>
          this.dynamicModelKindFilterOptions.some(
            (opt) => opt.id === filter.id,
          ),
      );
    }
  }

  /**
   * 編集ボタンがクリックされたときのハンドラー
   */
  public handleEditBtnClicked() {
    if (this.checkDisabledForEdit()) {
      return;
    }
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode === true && this.isTagEditMode === true) {
      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.SetTagEditModeAction({
          enabled: !this.isTagEditMode,
        }),
      );
    }
    this.resetCheckboxStates();
    this.refreshFilterUI();
  }

  /**
   * タグ編集モードを切り替える
   */
  public toggleTagEditMode() {
    this.exitEditMode();
    this.store.dispatch(
      FileTreeViewAction.FileTreeViewWideAction.SetTagEditModeAction({
        enabled: !this.isTagEditMode,
      }),
    );
    this.resetCheckboxStates();
    this.refreshFilterUI();
  }

  /**
   * タグチップクリック時のハンドラー
   * クリックしたタグを含むすべてのモデル（ゴミ箱を除く）の表示状態を一括変更
   */
  public onTagClicked(tagLabel: string): void {
    this.store.dispatch(
      FileTreeViewAction.DisplayModeAction.ToggleTagModelsVisibilityAction({
        tagLabel,
      }),
    );
  }

  /**
   * 選択されたモデルにタグを一括追加
   */
  public bulkAddTag(tagLabel: string) {
    if (this.tagOperationInProgress) {
      return; // 既にタグ操作が進行中の場合は何もしない
    }

    const selectedModelIds = this.getSelectedModelIds();
    if (selectedModelIds.length > 0 && tagLabel.trim()) {
      this.tagOperationInProgress = true;

      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.BulkAddTagAction({
          modelIds: selectedModelIds,
          tagLabel: tagLabel.trim(),
        }),
      );

      // タグ追加後に選択状態をクリア
      this.resetCheckboxStates();
    }
  }

  /**
   * 選択されたモデルからタグを一括削除
   */
  public bulkRemoveTags() {
    if (this.tagOperationInProgress) {
      return; // 既にタグ操作が進行中の場合は何もしない
    }

    const selectedModelIds = this.getSelectedModelIds();
    if (selectedModelIds.length > 0) {
      this.tagOperationInProgress = true;

      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.BulkRemoveTagsAction({
          modelIds: selectedModelIds,
        }),
      );

      // タグ削除後に選択状態をクリア
      this.resetCheckboxStates();
    }
  }

  /**
   * チェックされたモデルIDのリストを取得
   */
  private getSelectedModelIds(): string[] {
    const selectedIds: string[] = [];
    this.filteredCheckTree.forEach((categoryChecks, categoryIndex) => {
      categoryChecks.forEach((isChecked, modelIndex) => {
        if (isChecked) {
          const model =
            this.filteredModelsTree[categoryIndex]?.modelForView[modelIndex];
          if (model?.id) {
            selectedIds.push(model.id);
          }
        }
      });
    });
    return selectedIds;
  }

  /**
   * 子コンポーネントからのcheckTree変更を処理
   */
  public handleCheckTreeChanged(newCheckTree: boolean[][]): void {
    // フラグを設定してフィルター再適用を防止
    this.isUpdatingCheckboxes = true;

    // 子コンポーネントから受け取るのはfilteredCheckTreeの構造
    // フィルタリング中でない場合は、checkTreeも直接更新
    if (
      this.filteredModelsTree.length === this.modelsTree.length &&
      newCheckTree.length === this.checkTree.length
    ) {
      this.checkTree = newCheckTree.map((categoryChecks) => [
        ...categoryChecks,
      ]);
      this.filteredCheckTree = newCheckTree.map((categoryChecks) => [
        ...categoryChecks,
      ]);
    } else {
      // フィルタリング中の場合、まずfilteredCheckTreeを更新
      this.filteredCheckTree = newCheckTree.map((categoryChecks) => [
        ...categoryChecks,
      ]);
      // 次にfilteredCheckTreeの変更をcheckTreeに反映
      this.syncCheckTreeFromFiltered();
    }

    // 少し遅延してフラグをクリア
    setTimeout(() => {
      this.isUpdatingCheckboxes = false;
    }, 100);
  }

  /**
   * filteredCheckTreeの変更を元のcheckTreeに反映
   */
  private syncCheckTreeFromFiltered(): void {
    // checkTreeの各要素を確実に存在させる
    if (this.checkTree.length < this.modelsTree.length) {
      this.checkTree = Array.from(
        { length: this.modelsTree.length },
        (_, i) => this.checkTree[i] || [],
      );
    }

    this.filteredModelsTree.forEach(
      (filteredCategory, filteredCategoryIndex) => {
        // 元のツリーから対応するカテゴリを見つける
        const originalCategoryIndex = this.modelsTree.findIndex(
          (originalCategory) =>
            originalCategory.categoryForView.id ===
            filteredCategory.categoryForView.id,
        );

        if (originalCategoryIndex === -1) {
          return;
        }

        // 元のcheckTreeの配列が存在することを確認
        if (!this.checkTree[originalCategoryIndex]) {
          this.checkTree[originalCategoryIndex] = Array.from(
            {
              length:
                this.modelsTree[originalCategoryIndex].modelForView.length,
            },
            () => false,
          );
        }

        // フィルタされた各モデルのチェック状態を元のツリーに反映
        filteredCategory.modelForView.forEach(
          (filteredModel, filteredModelIndex) => {
            // 元のツリーから対応するモデルのインデックスを見つける
            const originalModelIndex = this.modelsTree[
              originalCategoryIndex
            ].modelForView.findIndex(
              (originalModel) => originalModel.id === filteredModel.id,
            );

            if (originalModelIndex !== -1) {
              // 元のcheckTreeに反映
              this.checkTree[originalCategoryIndex][originalModelIndex] =
                this.filteredCheckTree[filteredCategoryIndex][
                  filteredModelIndex
                ];
            }
          },
        );
      },
    );
  }

  /**
   * チェックボックスの状態をリセット
   */
  private resetCheckboxStates() {
    this.checkTree = this.checkTree.map((categoryChecks) =>
      categoryChecks.map(() => false),
    );
    this.filteredCheckTree = this.filteredCheckTree.map((categoryChecks) =>
      categoryChecks.map(() => false),
    );
    this.checkParent = this.checkParent.map(() => false);

    this.store.dispatch(
      FileTreeViewAction.FileTreeViewWideAction.ClearCheckStatusAction(),
    );
    this.trashSelected = undefined;
  }

  /**
   * タグチップを表示するかどうかを判定
   * タグ編集モード時は常に表示、それ以外はタグ表示モードでない場合にのみ表示
   */
  public shouldShowTagChips(): boolean {
    return (
      this.isTagEditMode || this.currentDisplayMode !== FileTreeDisplayMode.TAG
    );
  }

  // タグ編集用のUI処理メソッド
  public currentTagInput: string = '';

  /**
   * 現在のタグ入力の文字数を取得
   */
  public getCurrentTagInputLength(): number {
    return this.currentTagInput ? this.currentTagInput.length : 0;
  }

  /**
   * タグ入力が40文字制限を超えているかチェック
   */
  public isTagInputTooLong(): boolean {
    return this.getCurrentTagInputLength() > 40;
  }

  /**
   * タグ入力の残り文字数を取得
   */
  public getRemainingCharacters(): number {
    return Math.max(0, 40 - this.getCurrentTagInputLength());
  }

  /**
   * タグ入力でテキスト変更時のハンドラー
   */
  public handleTagInputChange(
    event: Event | { value?: string; target?: { value?: string } },
  ): void {
    const customEvent = event as {
      value?: string;
      target?: { value?: string };
    };
    if (customEvent && customEvent.value !== undefined) {
      this.currentTagInput = customEvent.value;
    } else if (
      customEvent &&
      customEvent.target &&
      customEvent.target.value !== undefined
    ) {
      // フォールバック：通常のinputイベント
      this.currentTagInput = customEvent.target.value;
    }
  }

  /**
   * タグ入力でオプション選択時のハンドラー
   */
  public handleTagInputSelected(event: {
    detail?: string;
    option?: { value?: string };
    value?: string;
  }): void {
    if (event && event.detail) {
      this.currentTagInput = event.detail;
    } else if (event && event.option && event.option.value) {
      this.currentTagInput = event.option.value;
    } else if (event && event.value) {
      this.currentTagInput = event.value;
    }
  }

  /**
   * タグ入力でキー押下時のハンドラー
   */
  public handleTagInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      if (input && input.value) {
        this.currentTagInput = input.value;
      }
      this.handleAddTagClick();
    }
  }

  /**
   * タグラベルのバリデーションを行う
   * @param tagLabel バリデーションするタグラベル
   * @returns バリデーション結果 { isValid: boolean, errorMessage?: string }
   */
  private validateTagLabel(tagLabel: string): {
    isValid: boolean;
    errorMessage?: string;
  } {
    // 空文字チェック
    if (!tagLabel || tagLabel.trim() === '') {
      return { isValid: false, errorMessage: 'タグ名を入力してください' };
    }
    // 40文字制限チェック
    if (tagLabel.length > 40) {
      return {
        isValid: false,
        errorMessage: 'タグ名は40文字以内で入力してください',
      };
    }

    return { isValid: true };
  }

  /**
   * タグ追加ボタンクリック時のハンドラー
   */
  public handleAddTagClick(): void {
    if (
      this.currentTagInput &&
      this.currentTagInput.trim() &&
      this.getSelectedModelCount() > 0
    ) {
      const tagToAdd = this.currentTagInput.trim();

      // 「タグなし」の追加を防ぐ
      if (tagToAdd === 'タグなし') {
        this.currentTagInput = '';
        this.clearAutocompleteInput();
        return;
      }

      // タグのバリデーションチェック
      const validation = this.validateTagLabel(tagToAdd);
      if (!validation.isValid) {
        return;
      }

      // 大文字小文字を区別しない重複チェック
      const existingTag = this.tagFilterOptionsLabelForAutocomplete.find(
        (existingTagLabel) =>
          existingTagLabel.toLowerCase() === tagToAdd.toLowerCase(),
      );

      if (existingTag && existingTag !== tagToAdd) {
        // 異なる大文字小文字のタグが既に存在する場合、既存のものを使用
        this.currentTagInput = '';
        this.clearAutocompleteInput();
        this.bulkAddTag(existingTag);
        return;
      }

      // タグ追加前に入力をクリア
      this.currentTagInput = '';
      this.clearAutocompleteInput();

      // タグを追加
      this.bulkAddTag(tagToAdd);
    }
  }

  /**
   * オートコンプリート入力フィールドをクリアする
   */
  private clearAutocompleteInput(): void {
    // currentTagInputがバインドされているので、これをクリアするだけで十分
    // [value]="currentTagInput" バインディングにより自動的にコンポーネントがクリアされる

    // 追加の確実なクリアのため、短い遅延後にもう一度実行
    setTimeout(() => {
      const tagInput = document.querySelector(
        '.tag-autocomplete-input input',
      ) as HTMLInputElement;
      if (tagInput && tagInput.value !== '') {
        tagInput.value = '';
        tagInput.dispatchEvent(new Event('input', { bubbles: true }));
        tagInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 50);
  }

  /**
   * 選択されたモデル数を取得（テンプレート用のpublicメソッド）
   */
  public getSelectedModelCount(): number {
    return this.getSelectedModelIds().length;
  }

  /**
   * タグ入力が空かどうかを判定（テンプレート用）
   */
  public isTagInputEmpty(): boolean {
    return !this.currentTagInput || this.currentTagInput.trim() === '';
  }

  /**
   * ローカルストレージから表示モードを初期化（同期的に実行）
   */
  private initializeDisplayModeFromStorage(): void {
    // ローカルストレージアクションを実行（状態の一貫性のため）
    // ストアの更新は既にコンストラクタで実行済み
    this.store.dispatch(FileTreeDisplayModeAction.GetLocalStorageAction());
  }

  /**
   * フィルターツールバーの表示切り替え
   */
  public toggleFilterToolbar(): void {
    this.showFilterToolbar$.pipe(take(1)).subscribe((currentState) => {
      const newState = !currentState;

      // ローカルストレージに保存
      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.SetLocalStorageAction({
          showFilterToolbar: newState,
        }),
      );

      // 即座にUIを更新するためにstateも更新
      this.store.dispatch(
        FileTreeViewAction.FileTreeViewWideAction.GetLocalStorageCompleteAction(
          {
            showFilterToolbar: newState,
          },
        ),
      );
    });
  }

  /**
   * フィルター表示状態をローカルストレージから読み込み
   */
  private loadFilterToolbarState(): void {
    this.store.dispatch(
      FileTreeViewAction.FileTreeViewWideAction.GetLocalStorageAction(),
    );
  }

  /**
   * フィルターUIの状態を更新（編集モード終了時など）
   */
  private refreshFilterUI(): void {
    // フィルターを再適用することで、UI コンポーネントの状態も更新される
    this.applyModelTreeFilter();
  }

  /**
   * 現在の入力に基づいて大文字小文字を区別しないオートコンプリート候補を取得
   */
  public getFilteredTagSuggestions(): string[] {
    if (!this.currentTagInput || this.currentTagInput.trim() === '') {
      return this.tagFilterOptionsLabelForAutocomplete;
    }

    const input = this.currentTagInput.trim().toLowerCase();
    return this.tagFilterOptionsLabelForAutocomplete.filter((tag) =>
      tag.toLowerCase().includes(input),
    );
  }
}
