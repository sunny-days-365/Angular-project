import { Injectable, OnDestroy } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import {
  distinctUntilChanged,
  first,
  firstValueFrom,
  race,
  Subscription,
  take,
} from 'rxjs';
import {
  Model,
  ModelAttributeTypes,
  ModelKinds,
  ModelStatusTypes,
  ModelTypes,
  OptionSettingsService,
  PointsService,
} from '@nikon-trimble-sok/api-sdk-d3';
import { ClassLogHelper } from 'src/app/helper-utility/logger-helper/class-log-helper';
import { TCAPISelector } from 'src/app/stores/selectors/project-list/TCAPI.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { FileTreeViewSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.selector';
import { FileTreeViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.action';
import { TrimbimFileService } from 'src/app/helper-utility/trimbim-file-helper/trimbim-file-helper.service';
import { TrimbleConnect3DViewerAction } from 'src/app/stores/actions/project/detail/data-3d-view/trimble-connect-3d-viewer.action';
import {
  Camera,
  ColorRGBA,
  ModelObjectIds,
  ObjectProperties,
  PointColorType,
  SelectorMode,
  Vector3,
  WorkspaceAPI,
} from 'trimble-connect-workspace-api';
import {
  FileForView,
  LoadingStatusMode,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.state';
import {
  isSokModelId,
  toSokModelId,
  toTcModelId,
} from 'src/app/helper-utility/sok-model-id-helper/sok-model-id-helper';
import { PointCloudSetting } from 'src/app/stores/states/project/detail/data-3d-view/left-panel/display-setting/display-setting.definition';
import {
  DEFAULT_EDL_RADIUS,
  DEFAULT_EDL_STRENGTH,
  DEFAULT_POINT_SIZE,
} from './parts/left-panel/display-setting/display-setting.definition';
import { DisplaySettingSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/display-setting/display-setting.selector';
import { Data3DViewWideSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/data-3d-view-wide.selector';
import { LatestConstructionDataPattern } from 'src/app/helper-utility/api-helper/projects-models';
import { TrimbleConnect3DViewerSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/trimble-connect-3d-viewer.selector';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { DisplaySettingAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/display-setting/display-setting.action';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import _ from 'lodash';

@Injectable()
export class Data3DViewHelperService implements OnDestroy {
  protected L: ClassLogHelper;

  private projectSubscription: Subscription;
  private modelSubscription: Subscription;
  private modelStatusSubscription: Subscription;
  private pointCloudSettingSubscription: Subscription;
  private restoreSavedModelSubscription: Subscription;
  private projectIdSubscription: Subscription;
  private loadedModelsSubscription: Subscription;
  private APISubscription: Subscription;
  private displaySettingsLoadedSubscription: Subscription;

  private viewSelected: boolean = false;
  // Trimble workspace api
  private trimbleWorkSpaceAPI: WorkspaceAPI | undefined;

  // check zoom model just once
  public isFirstToggle = true;

  // Mop status load model
  private modelStatusMap: Record<string, string[]> | undefined;

  private projectId: string | undefined;

  public isRestoreSavedModel: boolean | undefined = undefined;

  public loadedModels: Model[] = [];

  private modelData: Model[] = [];

  private classifiedModelLoadStatus:
    | Record<string, LoadingStatusMode>
    | undefined;

  private modelCameraStatus: Record<string, Camera>[] = [];

  private pointCloudSetting: PointCloudSetting | undefined = undefined;

  private displaySettingLoaded: boolean = false;

  private showStationLabels: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private trimbimFileService: TrimbimFileService,
    private optionSettingsService: OptionSettingsService,
    private pointsService: PointsService,
  ) {
    this.L = new ClassLogHelper('Data3DViewService');

    this.projectSubscription = this.store
      .pipe(select(TCAPISelector.selectorProject))
      .subscribe((project) => {
        if (project.length) {
          this.isFirstToggle = true;
        }
      });

    this.modelSubscription = this.store
      .pipe(select(Data3DViewWideSelector.selectorListAllModel))
      .pipe(distinctUntilChanged((x, y) => this.isArrayEqual(x, y)))
      .subscribe((models: Model[] | undefined) => {
        this.modelData = models ?? [];
        this.applyPointCloudSettings();
      });

    this.modelStatusSubscription = this.store
      .pipe(select(FileTreeViewSelector.selectorClassifiedModelLoadStatus))
      .subscribe((classifiedModelLoadStatus) => {
        this.classifiedModelLoadStatus = classifiedModelLoadStatus;
      });

    this.pointCloudSettingSubscription = this.store
      .pipe(select(DisplaySettingSelector.selectorPointCloudSettingState))
      .subscribe((setting) => {
        this.pointCloudSetting = setting;
      });
    this.restoreSavedModelSubscription = this.store
      .pipe(select(DisplaySettingSelector.selectorRestoreSavedState))
      .subscribe((setting) => {
        this.isRestoreSavedModel = setting?.restoreSaved;
      });

    this.APISubscription = this.store
      .select(
        TrimbleConnect3DViewerSelector.View3DViewerSelector
          .selectorTrimbleWorkspaceAPI,
      )
      .subscribe((_TWAPI) => {
        this.trimbleWorkSpaceAPI = _TWAPI;
        if (this.trimbleWorkSpaceAPI && this.viewSelected) {
          this.restoreSavedModel();
        }
      });

    this.projectIdSubscription = this.store
      .select(ApplicationStateSelector.selectorProjectId)
      .subscribe((projectId) => {
        this.projectId = projectId;
      });

    this.projectIdSubscription = this.store
      .select(ApplicationStateSelector.selectorProjectInitializing)
      .subscribe((initializing) => {
        if (initializing === true) {
          this.viewSelected = false;
          this.isFirstToggle = true;
        }
      });

    this.loadedModelsSubscription = this.store
      .select(TrimbleConnect3DViewerSelector.selectorModelsCurrentLoaded)
      .pipe(distinctUntilChanged((x, y) => this.isArrayEqual(x, y)))
      .subscribe((models) => {
        this.loadedModels = models ?? [];
      });

    // 画面表示設定をローカルストレージから読み込んだかどうか
    this.displaySettingsLoadedSubscription = this.store
      .pipe(select(DisplaySettingSelector.selectLoadState))
      .subscribe((loaded) => {
        this.displaySettingLoaded = loaded ?? false;
      });
  }

  /**
   * 線形モデルに紐づく測点ラベルモデルを取得
   * @param alignmentModelId 線形モデルID
   * @returns 測点ラベルモデル（存在しない場合はundefined）
   */
  private getAlignmentLabelModel(alignmentModelId: string): Model | undefined {
    const alignmentModel = this.modelData.find(
      (m) => m.id === alignmentModelId,
    );
    if (!alignmentModel || !alignmentModel.attributes) {
      return undefined;
    }

    const referenceTargetAttr = alignmentModel.attributes.find(
      (attr) => attr.key === 'ReferenceTargetModelId',
    );
    if (!referenceTargetAttr || !referenceTargetAttr.value) {
      return undefined;
    }

    const labelModelId = referenceTargetAttr.value;

    const labelModel = this.modelData.find(
      (m) =>
        m.id === labelModelId &&
        m.modelType === ModelTypes.NUMBER_14 &&
        m.modelKind === ModelKinds.NUMBER_19,
    );

    return labelModel;
  }

  /**
   * ビューを初期状態に（初回のみ）
   */
  public async restoreSavedModel(viewPanelSelected: boolean = false) {
    if (viewPanelSelected) {
      this.viewSelected = true;
    }

    // 設定読み込み前の場合は直接取得してくる
    if (!this.displaySettingLoaded) {
      const action = this.actions$.pipe(
        ofType(
          DisplaySettingAction.GetLocalStorageCompleteAction,
          Data3dViewWideAction.OnErrorAction,
        ),
        first(),
      );
      this.store.dispatch(DisplaySettingAction.GetLocalStorageAction());
      // 終了を待つ
      await firstValueFrom(race(action));
    }

    if (
      this.isRestoreSavedModel !== true ||
      this.isFirstToggle !== true ||
      this.trimbleWorkSpaceAPI === undefined
    ) {
      return;
    }

    this.isFirstToggle = false;

    if (this.projectId) {
      firstValueFrom(
        this.optionSettingsService.optionSettingsProjectIdGet(
          this.projectId,
          'LatestViewSettings',
          'body',
        ),
      ).then((value) => {
        const jsonValue = value as unknown as {
          loadedModel: string[];
          cameraSetting: Camera;
        };

        this.showModel(jsonValue.loadedModel, '');
        this.trimbleWorkSpaceAPI?.viewer.setCamera(jsonValue.cameraSetting);
        // 場合によっては反映されないため時間差でカメラの再設定を行う
        setTimeout(() => {
          this.trimbleWorkSpaceAPI?.viewer.setCamera(jsonValue.cameraSetting);
        }, 200);
      });
    }
  }

  /**
   * ビューを初期状態に
   */
  public resetVisibility() {
    if (this.projectId) {
      firstValueFrom(
        this.optionSettingsService.optionSettingsProjectIdGet(
          this.projectId,
          'LatestViewSettings',
          'body',
        ),
      ).then((value) => {
        const jsonValue = value as unknown as {
          loadedModel: string[];
          cameraSetting: Camera;
        };

        this.clearModel(jsonValue.loadedModel);
        this.showModel(jsonValue.loadedModel, '');
        this.trimbleWorkSpaceAPI?.viewer.setCamera(jsonValue.cameraSetting);
        // 場合によっては反映されないため時間差でカメラの再設定を行う
        setTimeout(() => {
          this.trimbleWorkSpaceAPI?.viewer.setCamera(jsonValue.cameraSetting);
        }, 200);
      });
    }
  }

  /**
   * ロードしているモデルを非表示にする
   * @param ignoreIdList 除外するモデルIDの配列
   */
  async clearModel(ignoreIdList: string[] | undefined = undefined) {
    let _modelList = this.loadedModels;
    if (ignoreIdList && ignoreIdList.length > 0) {
      _modelList = _modelList.filter((model) =>
        model.id ? !ignoreIdList.includes(model.id) : false,
      );
    }
    for (const model of _modelList) {
      if (model?.id && model?.visualizeUrl) {
        if (model.modelType === ModelTypes.NUMBER_5) {
          await this.trimbleWorkSpaceAPI?.viewer.removeModel(
            toSokModelId(model.id),
          );
        } else {
          await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(
            toSokModelId(model.id),
          );
        }
      } else if (model?.visualizeId) {
        await this.trimbleWorkSpaceAPI?.viewer.toggleModel(
          model.visualizeId,
          false,
        );
      }
      if (model?.id) {
        this.updateModelState(model.id);

        // 線形モデルまたはコリドーの場合、測点ラベルモデルも非表示にする
        if (
          model.modelType === ModelTypes.NUMBER_2 ||
          model.modelType === ModelTypes.NUMBER_10
        ) {
          const labelModel = this.getAlignmentLabelModel(model.id);
          if (labelModel && labelModel.id && labelModel.visualizeUrl) {
            try {
              await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(
                toSokModelId(labelModel.id),
              );
            } catch (e) {
              this.L.error(e);
            }
          }
        }
      }
    }
  }

  /**
   * Show list model by key
   * Ex: In the screen has 2 fields need to show model when data of field change.
   * Use field 1: showModel([modelId...], 'field1')
   * Use field 2: showModel([modelId...], 'field2')
   */
  async showModel(
    modelId: string | string[],
    key: string,
    closeOldModel = false,
  ) {
    try {
      const overriedUnloadState: boolean = key !== 'import-popup';
      // Convert list id of model to array
      const newModelTurnOn = Array.isArray(modelId) ? modelId : [modelId];
      const oldModels = this.modelStatusMap?.[key] || [];

      const formatModelId = closeOldModel
        ? new Set(newModelTurnOn)
        : new Set([...oldModels, ...newModelTurnOn]);

      if (closeOldModel) {
        const fitToView = false;
        // Get old showed models, if old models don't exist in new list model => Turn off
        if (this.modelStatusMap && oldModels?.length) {
          const modelTurnOff = oldModels.filter(
            (model) => !newModelTurnOn.includes(model),
          );

          for (const oldModelId of modelTurnOff) {
            const model = this.modelData.find((m) => m.id === oldModelId);
            if (
              model?.visualizeUrl &&
              model.modelType === ModelTypes.NUMBER_5
            ) {
              // Remove PointCloud
              await this.trimbleWorkSpaceAPI?.viewer.removeModel(
                toSokModelId(oldModelId),
                fitToView,
              );
            } else if (model?.visualizeUrl) {
              // Remove Trimbim Model
              await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(
                toSokModelId(oldModelId),
              );
            } else {
              // Toggle model hide
              if (!model?.visualizeId) {
                // Todo: waiting for the SOK API to be ready
                return;
              }
              await this.trimbleWorkSpaceAPI?.viewer.toggleModel(
                model.visualizeId,
                false,
                fitToView,
              );
            }
            this.updateModelState(oldModelId, overriedUnloadState);
          }
        }
      }

      if (newModelTurnOn.length) {
        const fitToView = false;
        this.isFirstToggle = false;

        for (const newModelId of newModelTurnOn) {
          if (
            this.classifiedModelLoadStatus?.[newModelId] ===
              LoadingStatusMode.Loaded ||
            this.classifiedModelLoadStatus?.[newModelId] ===
              LoadingStatusMode.Loading
          ) {
            continue;
          }

          const model = this.modelData.find((m) => m.id === newModelId);

          if (model && model.id) {
            this.setModelState(model.id, LoadingStatusMode.Loading);
          }

          if (model?.visualizeUrl && model.modelType === ModelTypes.NUMBER_5) {
            // Add PointCloud
            try {
              await this.trimbleWorkSpaceAPI?.viewer.addPointCloud({
                fitToView: fitToView,
                id: toSokModelId(newModelId),
                url: model.visualizeUrl,
              });
              this.updateModelState(newModelId, overriedUnloadState);
              this.applyPointCloudSettings();
            } catch (e) {
              if (key !== 'import-popup') {
                this.setModelState(newModelId, LoadingStatusMode.Failed);
                this.L.error(e);
              }
            }
          } else if (model?.visualizeUrl) {
            const blob = await firstValueFrom(
              this.trimbimFileService.getTrbFileAsBlob(model.visualizeUrl),
            );

            if (blob) {
              if (model.modelType === ModelTypes.NUMBER_8) {
                try {
                  await this.trimbleWorkSpaceAPI?.viewer.addTrimbimModel({
                    id: toSokModelId(newModelId),
                    fitToView: fitToView,
                    trbBlob: blob,
                  });
                  this.updateModelState(newModelId, overriedUnloadState);
                } catch (e) {
                  this.setModelState(newModelId, LoadingStatusMode.Failed);
                  this.L.error(e);
                }
              } else {
                const rgb = model.color && model.color > 0 ? model.color : 0;
                const r = (rgb >> 16) & 0xff;
                const g = (rgb >> 8) & 0xff;
                const b = rgb & 0xff;
                const alpha = model.transparency ?? 100;
                const a = Math.round(alpha * 2.55);
                try {
                  await this.trimbleWorkSpaceAPI?.viewer.addTrimbimModel({
                    id: toSokModelId(newModelId),
                    fitToView: fitToView,
                    trbBlob: blob,
                    color: {
                      r,
                      g,
                      b,
                      a,
                    },
                  });
                  this.updateModelState(newModelId, overriedUnloadState);
                } catch (e) {
                  if (key !== 'import-popup') {
                    this.setModelState(newModelId, LoadingStatusMode.Failed);
                    this.L.error(e);
                  }
                }
              }
            }
          } else {
            // Toggle model show
            if (!model?.visualizeId) {
              // Todo: waiting for the SOK API to be ready
              return;
            }
            try {
              await this.trimbleWorkSpaceAPI?.viewer.toggleModel(
                model.visualizeId,
                true,
                fitToView,
              );
              this.updateModelState(newModelId, overriedUnloadState);
            } catch (e) {
              if (
                this.classifiedModelLoadStatus?.[newModelId] ===
                LoadingStatusMode.Assimilating
              ) {
                return;
              }
              if (key !== 'import-popup') {
                this.setModelState(newModelId, LoadingStatusMode.Failed);
                this.L.error(e);
              }
            }
          }

          // 線形モデルまたはコリドーの場合、測点ラベルモデルも表示する
          if (
            model &&
            (model.modelType === ModelTypes.NUMBER_2 ||
              model.modelType === ModelTypes.NUMBER_10) &&
            this.showStationLabels
          ) {
            const labelModel = this.getAlignmentLabelModel(newModelId);
            if (labelModel && labelModel.id && labelModel.visualizeUrl) {
              try {
                const labelBlob = await firstValueFrom(
                  this.trimbimFileService.getTrbFileAsBlob(
                    labelModel.visualizeUrl,
                  ),
                );
                if (labelBlob) {
                  // 線形モデルのカラーを取得
                  const validColor =
                    model.color && model.color > 0 ? model.color : 0xffffff;
                  const rgb = validColor;
                  const r = (rgb >> 16) & 0xff;
                  const g = (rgb >> 8) & 0xff;
                  const b = rgb & 0xff;
                  const alpha = model.transparency ?? 100;
                  const a = Math.round(alpha * 2.55);

                  await this.trimbleWorkSpaceAPI?.viewer.addTrimbimModel({
                    id: toSokModelId(labelModel.id),
                    fitToView: false,
                    trbBlob: labelBlob,
                    color: {
                      r,
                      g,
                      b,
                      a,
                    }, // 線形モデルのカラーを適用
                  });
                  this.updateModelState(labelModel.id, overriedUnloadState);
                }
              } catch (e) {
                this.L.error(e);
              }
            }
          }
        }
      }

      this.modelStatusMap = {
        ...(this.modelStatusMap || {}),
        [key]: Array.from(formatModelId),
      };
    } catch (err) {
      this.L.debug(err);
    }
  }

  /**
   * Hide list model by key
   * 指定されたmodelIdあるいはその配列の各モデルを非表示にする
   * @param modelId 非表示にするモデルIDまたはその配列
   * @param key 対象となるキー（showModelと同じキーを渡す）
   */
  public async hideModel(
    modelId: string | string[],
    key?: string,
  ): Promise<void> {
    try {
      // modelIdを配列に変換
      const modelsToHide = Array.isArray(modelId) ? modelId : [modelId];

      let currentModels: string[] = [];
      if (key !== undefined) {
        // 現在の表示中モデルIDリストを取得（なければ空配列）
        currentModels = this.modelStatusMap?.[key] || [];
      } else {
        currentModels = modelsToHide;
      }

      // 指定された各モデルを非表示にする処理
      for (const hideId of modelsToHide) {
        // もし現在表示されてないモデルはスキップ
        if (!currentModels.includes(hideId)) {
          continue;
        }

        const fitToView = false; // 非表示時はフィットさせない
        const model = this.modelData.find((m) => m.id === hideId);
        if (model) {
          if (model.visualizeUrl && model.modelType === ModelTypes.NUMBER_5) {
            // PointCloudの場合はremoveModelで非表示
            await this.trimbleWorkSpaceAPI?.viewer.removeModel(
              toSokModelId(hideId),
              fitToView,
            );
          } else if (model.visualizeUrl) {
            // Trimbim Modelの場合はremoveTrimbimModelで非表示
            await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(
              toSokModelId(hideId),
            );
          } else {
            // それ以外の場合はtoggleModelで非表示（visualizeIdが必要）
            if (model.visualizeId) {
              await this.trimbleWorkSpaceAPI?.viewer.toggleModel(
                model.visualizeId,
                false,
                fitToView,
              );
            }
          }
          // 非表示後の状態更新
          this.updateModelState(hideId);

          // 線形モデルまたはコリドーの場合、測点ラベルモデルも非表示にする
          if (
            model.modelType === ModelTypes.NUMBER_2 ||
            model.modelType === ModelTypes.NUMBER_10
          ) {
            const labelModel = this.getAlignmentLabelModel(hideId);
            if (labelModel && labelModel.id && labelModel.visualizeUrl) {
              try {
                await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(
                  toSokModelId(labelModel.id),
                );
                this.updateModelState(labelModel.id);
              } catch (e) {
                this.L.error(e);
              }
            }
          }
        }
      }

      // 内部の表示状態も更新する（渡されたkeyから対象モデルを除外）
      if (this.modelStatusMap && key) {
        this.modelStatusMap[key] = currentModels.filter(
          (id) => !modelsToHide.includes(id),
        );
      }
    } catch (err) {
      this.L.debug(err);
    }
  }

  async redrawModel(model: Model) {
    const newModelId = model.id ?? '';
    let removedFlag = false;

    const sokId = toSokModelId(newModelId);
    if (model.visualizeUrl && model.modelType === ModelTypes.NUMBER_5) {
      const currentPointClouds =
        await this.trimbleWorkSpaceAPI?.viewer.getPointClouds();
      if (currentPointClouds?.some((m) => m.id === sokId)) {
        removedFlag = true;
        await this.trimbleWorkSpaceAPI?.viewer.removeModel(sokId);
      }
    } else if (model.visualizeUrl) {
      const currentTrimbims =
        await this.trimbleWorkSpaceAPI?.viewer.getTrimbimModels();
      if (currentTrimbims?.some((m) => m.id === sokId)) {
        await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(sokId);
        removedFlag = true;
      }
    } else {
      const currentModels = await this.trimbleWorkSpaceAPI?.viewer.getModels();
      if (currentModels?.some((m) => m.id === newModelId)) {
        await this.trimbleWorkSpaceAPI?.viewer.toggleModel(newModelId, false);
        removedFlag = true;
      }
    }

    if (removedFlag === false) {
      return;
    }

    if (model?.visualizeUrl && model.modelType === ModelTypes.NUMBER_5) {
      // Add PointCloud
      try {
        await this.trimbleWorkSpaceAPI?.viewer.addPointCloud({
          id: toSokModelId(newModelId),
          url: model.visualizeUrl,
        });
        this.applyPointCloudSettings();
      } catch (e) {
        this.L.error(e);
      }
    } else if (model?.visualizeUrl) {
      // Add Trimbim Model
      this.trimbimFileService
        .getTrbFileAsBlob(model.visualizeUrl)
        .pipe(take(1))
        .subscribe(async (blob: Blob) => {
          if (model.modelType === ModelTypes.NUMBER_8) {
            try {
              await this.trimbleWorkSpaceAPI?.viewer.addTrimbimModel({
                id: toSokModelId(newModelId),
                trbBlob: blob,
              });
            } catch (e) {
              this.L.error(e);
            }
          } else {
            const rgb = model.color && model.color > 0 ? model.color : 0;
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = rgb & 0xff;
            const alpha = model.transparency ?? 100;
            const a = Math.round(alpha * 2.55);
            try {
              await this.trimbleWorkSpaceAPI?.viewer.addTrimbimModel({
                id: toSokModelId(newModelId),
                trbBlob: blob,
                color: {
                  r,
                  g,
                  b,
                  a,
                },
              });
            } catch (e) {
              this.L.error(e);
            }
          }
        });
    } else {
      // Toggle model show
      if (!model?.visualizeId) {
        // Todo: waiting for the SOK API to be ready
        return;
      }
      try {
        await this.trimbleWorkSpaceAPI?.viewer.toggleModel(
          model.visualizeId,
          true,
        );
        if (model.modelType === ModelTypes.NUMBER_8) {
          const color = this.transformToHexColor(model?.color ?? 0);
          this.changeColorModel(newModelId, `#${color}`, model?.transparency);
        }
      } catch (e) {
        this.L.error(e);
      }
    }
  }

  // Wait the ModelTree to be reloaded after a command is run, and then call showModel()
  public showModelAfterTreeLoaded(
    modelId: string | string[],
    key: string,
    closeOldModel = false,
    setSelected: boolean = false,
    selectionMode: SelectorMode = 'add',
  ) {
    this.actions$
      .pipe(
        ofType(
          FileTreeViewAction.FileTreeViewWideAction.GetListModelCompleteAction,
        ),
        take(1),
      )
      .subscribe(() => {
        this.showModel(modelId, key, closeOldModel).then(() => {
          if (key === 'GeoreferencingComponent') {
            this.setCameraToModel(modelId[0]);
          }

          // 選択状態にするか否か
          if (setSelected) {
            this.setObjectSelectedByModelId(modelId, false, selectionMode);
          }
        });
      });
  }

  /**
   * モデルを表示状態にし、かつ選択状態にする
   * @param modelId モデルIDまたはその配列
   * @param key モデル表示のキー
   * @param closeOldModel 既存のモデルを閉じるかどうか
   * @param selectionMode 選択モード（'set'、'add'、'remove'のいずれか、デフォルトは'add'）
   */
  public async showModelSetSelected(
    modelId: string | string[],
    key: string,
    closeOldModel = false,
    selected: boolean = false,
    selectionMode: SelectorMode = 'add',
  ) {
    this.showModel(modelId, key, closeOldModel).then(() => {
      if (key === 'GeoreferencingComponent') {
        this.setCameraToModel(modelId[0]);
      }
      // モデルを選択状態にする
      this.setObjectSelectedByModelId(modelId, selected, selectionMode);
    });
  }

  public async removeDeletedModel(model: Model) {
    if (!model.id) return;
    const sokId = toSokModelId(model.id);
    if (model.visualizeUrl && model.modelType === ModelTypes.NUMBER_5) {
      const currentPointClouds =
        await this.trimbleWorkSpaceAPI?.viewer.getPointClouds();
      if (currentPointClouds?.some((m) => m.id === sokId)) {
        await this.trimbleWorkSpaceAPI?.viewer.removeModel(sokId);
      }
    } else if (model.visualizeUrl) {
      const currentTrimbims =
        await this.trimbleWorkSpaceAPI?.viewer.getTrimbimModels();
      if (currentTrimbims?.some((m) => m.id === sokId)) {
        await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(sokId);
      }
    } else {
      if (model.visualizeId) {
        await this.trimbleWorkSpaceAPI?.viewer.toggleModel(
          model.visualizeId,
          false,
        );
      }
    }

    // 線形モデルまたはコリドーの場合、測点ラベルモデルも削除する
    if (
      model.modelType === ModelTypes.NUMBER_2 ||
      model.modelType === ModelTypes.NUMBER_10
    ) {
      const labelModel = this.getAlignmentLabelModel(model.id);
      if (labelModel && labelModel.id && labelModel.visualizeUrl) {
        try {
          const labelSokId = toSokModelId(labelModel.id);
          const currentTrimbims =
            await this.trimbleWorkSpaceAPI?.viewer.getTrimbimModels();
          if (currentTrimbims?.some((m) => m.id === labelSokId)) {
            await this.trimbleWorkSpaceAPI?.viewer.removeTrimbimModel(
              labelSokId,
            );
          }
        } catch (e) {
          this.L.error('Failed to remove alignment label model:', e);
        }
      }
    }
  }

  public updateModelState(id: string, overrideUnloadState: boolean = true) {
    this.store.dispatch(
      TrimbleConnect3DViewerAction.DemandToView3DEvent.UpdateLoadedModelStateAction(
        {
          id,
          overrideUnloadState,
        },
      ),
    );
  }

  public setModelState(id: string, status: LoadingStatusMode) {
    this.store.dispatch(
      TrimbleConnect3DViewerAction.DemandToView3DEvent.SetModelStateAction({
        id,
        status,
      }),
    );
  }

  public showLatestConstructionProgressModel() {
    const target = this.modelData.find(
      (m) =>
        m.modelKind === ModelKinds.NUMBER_2 &&
        m.modelType === ModelTypes.NUMBER_5 &&
        this.isLatestConstructionData(m),
    );

    if (target && target.id) {
      this.showModel(target.id, 'latestConstructionData');
    }
  }

  public hideLatestConstructionProgressModel() {
    const target = this.modelData.find(
      (m) =>
        m.modelKind === ModelKinds.NUMBER_2 &&
        m.modelType === ModelTypes.NUMBER_5 &&
        this.isLatestConstructionData(m),
    );

    if (target && target.id) {
      this.removeDeletedModel(target);
      this.updateModelState(target.id);
    }
  }

  public isLatestConstructionData(model: FileForView | Model | undefined) {
    if (!model || !model.name) return false;
    return model.name.includes(LatestConstructionDataPattern);
  }

  public isLatestConstructionDataId(modelId: string) {
    const model = this.modelData.find((m) => m.id === modelId);
    return this.isLatestConstructionData(model);
  }

  public async changeColorModel(
    modelId: string,
    color = '#a42f2f',
    opacity = 100,
  ) {
    if (!this.trimbleWorkSpaceAPI) return;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const a = Math.round(opacity * 2.55);
    const rgbaColor: ColorRGBA = { r, g, b, a };

    const model = this.modelData.find((m) => m.id === modelId);
    if (model?.visualizeUrl && model.modelType !== ModelTypes.NUMBER_5) {
      // Change trimbim color
      await this.trimbleWorkSpaceAPI.viewer.addTrimbimModel({
        id: toSokModelId(modelId),
        color: rgbaColor,
      });
    } else {
      // Original model color
      if (!model?.visualizeId) {
        // Todo: waiting for the SOK API to be ready
        return;
      }
      await this?.trimbleWorkSpaceAPI.viewer.setObjectState(
        {
          selected: false,
          modelObjectIds: [{ modelId: model?.visualizeId }],
        },
        {
          color: rgbaColor,
        },
      );
    }
  }

  /**
   * モデルの配置を変更する（高さ変更で使用）
   * visualizeIdを使用してOriginal Modelの位置を変更する
   */
  public async placeModel(
    modelId: string,
    placement: {
      position: { x: number; y: number; z: number };
      axis?: { x: number; y: number; z: number };
      refDirection?: { x: number; y: number; z: number };
      scale?: number;
    },
  ): Promise<void> {
    if (!this.trimbleWorkSpaceAPI) {
      throw new Error('Trimble Workspace API is not available');
    }

    // modelIdからvisualizeIdを取得
    const model = this.modelData.find((m) => m.id === modelId);
    if (!model?.visualizeId) {
      throw new Error(
        `Model with ID ${modelId} not found or visualizeId is missing`,
      );
    }

    // visualizeIdを使用してplaceModelを実行
    await this.trimbleWorkSpaceAPI.viewer.placeModel(model.visualizeId, {
      position: placement.position,
      axis: placement.axis || { x: 0, y: 0, z: 1 },
      refDirection: placement.refDirection || { x: 1, y: 0, z: 0 },
      scale: placement.scale || 1,
    });
  }

  public transformToHexColor(color?: number): string {
    if (!color) return '';

    const validColor = color > 0 ? color : 0;

    return validColor?.toString(16)?.padStart(6, '0');
  }

  updateColorToApi(model: Model, colors: ObjectProperties[]) {
    const hexColor = colors.length > 1 ? colors[1].color : colors[0].color;

    if (!hexColor) return;

    const color = parseInt(hexColor?.substring(0, 7).slice(1), 16);
    const opacityHex = hexColor?.substring(7);
    const opacity = parseInt(opacityHex, 16) / 255;

    if (model?.color === color) return;

    return [
      {
        ...model,
        color: color,
        transparency:
          Math.round(opacity * 100) === 0 ? 100 : Math.round(opacity * 100),
      },
    ];
  }

  /**
   * RGBカラーの値を10進数整数値に変換
   */
  public transformRgbToDecimalColor(rgb: {
    r: number;
    g: number;
    b: number;
  }): number {
    return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
  }

  public async setCameraToModel(modelId: string, isSokId: boolean = true) {
    const targetId =
      (isSokId
        ? toSokModelId(modelId)
        : this.modelData.find((m) => m.id === modelId)?.visualizeId) ?? '';

    if (
      this.modelData.find((m) => m.id === modelId)?.modelType ===
      ModelTypes.NUMBER_1
    ) {
      const points = await firstValueFrom(
        this.pointsService.projectsProjectIdPointsGet(this.projectId ?? ''),
      );
      const filteredPoints = points.filter(
        (point) => point.originalId === modelId,
      );
      if (filteredPoints.length === 1) {
        this.setCameraToPointWithPosition(modelId, 0, {
          x: filteredPoints[0].x ?? 0,
          y: filteredPoints[0].y ?? 0,
          z: filteredPoints[0].z ?? 0,
        });
      } else {
        await this.trimbleWorkSpaceAPI?.viewer.setCamera({
          modelObjectIds: [{ modelId: targetId }],
        });
      }
    } else {
      await this.trimbleWorkSpaceAPI?.viewer.setCamera({
        modelObjectIds: [{ modelId: targetId }],
      });
    }
  }

  public async setCameraToPoint(modelId: string, objectId: number) {
    await this.setObjectSelected(modelId, objectId);

    const cameraExists = this.modelCameraStatus.some(
      (record) => modelId in record,
    );

    if (!cameraExists) {
      await this.setCameraToModel(modelId);
      const modelCam = await this.trimbleWorkSpaceAPI?.viewer.getCamera();
      if (modelCam) this.modelCameraStatus.push({ [modelId]: modelCam });
    }

    const cameraRecord = this.modelCameraStatus.find(
      (record) => modelId in record,
    );
    if (!cameraRecord) return;
    const camera = cameraRecord[modelId];

    const targetPositionArray =
      await this.trimbleWorkSpaceAPI?.viewer.getObjectPositions(modelId, [
        objectId,
      ]);

    if (camera?.position && camera.lookAt && targetPositionArray) {
      const target = targetPositionArray[0].position;

      const x1 = camera.position.x;
      const y1 = camera.position.y;
      const z1 = camera.position.z;

      const x2 = camera.lookAt.x;
      const y2 = camera.lookAt.y;
      const z2 = camera.lookAt.z;

      const px = target.x;
      const py = target.y;
      const pz = target.z;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;

      const numerator = dx * (px - x1) + dy * (py - y1) + dz * (pz - z1);
      const denominator = dx * dx + dy * dy + dz * dz;
      const t = numerator / denominator;

      const ox = x1 + t * dx;
      const oy = y1 + t * dy;
      const oz = z1 + t * dz;

      await this.trimbleWorkSpaceAPI?.viewer.setCamera({
        ...camera,
        lookAt: {
          x: px,
          y: py,
          z: pz,
        },
        position: {
          x: x1 - (ox - px),
          y: y1 - (oy - py),
          z: z1 - (oz - pz),
        },
      });
    }
    await this.setObjectSelected(modelId, objectId, true);
  }

  public async setCameraToPointWithPosition(
    modelId: string,
    objectId: number,
    position: Vector3,
  ) {
    const cameraExists = this.modelCameraStatus.some(
      (record) => modelId in record,
    );

    if (!cameraExists) {
      await this.setCameraToModel(modelId);
      const modelCam = await this.trimbleWorkSpaceAPI?.viewer.getCamera();
      if (modelCam) this.modelCameraStatus.push({ [modelId]: modelCam });
    }

    const cameraRecord = this.modelCameraStatus.find(
      (record) => modelId in record,
    );
    if (!cameraRecord) return;
    const camera = cameraRecord[modelId];

    if (camera?.position && camera.lookAt) {
      const target = position;

      const x1 = camera.position.x;
      const y1 = camera.position.y;
      const z1 = camera.position.z;

      const x2 = camera.lookAt.x;
      const y2 = camera.lookAt.y;
      const z2 = camera.lookAt.z;

      const px = target.x;
      const py = target.y;
      const pz = target.z;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;

      const numerator = dx * (px - x1) + dy * (py - y1) + dz * (pz - z1);
      const denominator = dx * dx + dy * dy + dz * dz;
      const t = numerator / denominator;

      const ox = x1 + t * dx;
      const oy = y1 + t * dy;
      const oz = z1 + t * dz;

      const camx = x1 - (ox - px);
      const camy = y1 - (oy - py);
      const camz = z1 - (oz - pz);

      if (px === camx && py === camy && pz === camz) {
        await this.trimbleWorkSpaceAPI?.viewer.setCamera({
          ...camera,
          lookAt: {
            x: px,
            y: py,
            z: pz,
          },
          position: {
            x: camx,
            y: camy,
            z: camz + 1,
          },
          pitch: 0,
          yaw: 0,
        });

        return;
      }
      await this.trimbleWorkSpaceAPI?.viewer.setCamera({
        ...camera,
        lookAt: {
          x: px,
          y: py,
          z: pz,
        },
        position: {
          x: x1 - (ox - px),
          y: y1 - (oy - py),
          z: z1 - (oz - pz),
        },
      });
    }
  }

  /**
   * モデルIDを指定して、そのモデル内の全オブジェクトを選択状態にする
   * @param modelId 選択状態にするモデルのID
   * @param selected 選択状態にするかどうか（デフォルトはfalse）
   * @param mode 選択モード（'set'、'add'、'remove'のいずれか、デフォルトは'set'）
   */
  public async setObjectSelectedByModelId(
    modelId: string | string[],
    selected: boolean = false,
    mode: SelectorMode = 'set',
  ) {
    let modelObjectIds = [];
    if (Array.isArray(modelId)) {
      modelObjectIds = modelId.map((_modelId) => {
        return {
          modelId: toSokModelId(_modelId),
          objectRuntimeIds: [0],
        };
      });
    } else {
      modelObjectIds = [
        {
          modelId: toSokModelId(modelId),
          objectRuntimeIds: [0],
        },
      ];
    }
    this.setObjectSelectedBySelector(modelObjectIds, selected, mode);
  }

  /**
   * モデルオブジェクトIDを指定して、そのオブジェクトを選択状態にする
   * @param modelObjectIds 選択状態にするモデルオブジェクトIDの配列
   * @param selected 選択状態にするかどうか（デフォルトはfalse）
   * @param mode 選択モード（'set'、'add'、'remove'のいずれか、デフォルトは'set'）
   */
  public async setObjectSelectedBySelector(
    modelObjectIds: ModelObjectIds[],
    selected: boolean = false,
    mode: SelectorMode = 'set',
  ) {
    try {
      await this.trimbleWorkSpaceAPI?.viewer.setSelection(
        {
          modelObjectIds: modelObjectIds,
          selected: selected,
        },
        mode,
      );
    } catch (e) {
      this.L.error(e);
    }
  }

  /**
   * モデルIDとオブジェクトIDを指定して、そのオブジェクトを選択状態にする
   * @param modelId 選択状態にするモデルのID
   * @param objectId 選択状態にするオブジェクトのID
   * @param selected 選択状態にするかどうか（デフォルトはfalse）
   * @param mode 選択モード（'set'、'add'、'remove'のいずれか、デフォルトは'set'）
   */
  public async setObjectSelected(
    modelId: string,
    objectId: number,
    selected: boolean = false,
    mode: SelectorMode = 'set',
  ) {
    try {
      await this.trimbleWorkSpaceAPI?.viewer.setSelection(
        {
          modelObjectIds: [
            {
              modelId: toSokModelId(modelId),
              objectRuntimeIds: [objectId],
            },
          ],
          selected: selected,
        },
        mode,
      );
    } catch (e) {
      this.L.error(e);
    }
  }

  public getPointCloudIdFromPickedPointId(modelId: string): string | undefined {
    if (isSokModelId(modelId)) {
      return toTcModelId(modelId);
    }
    const pointClouds = this.modelData.filter(
      (m) => m.modelType === ModelTypes.NUMBER_5,
    );
    const visualizeUrl = decodeURIComponent(modelId);
    return (
      pointClouds.find(
        (p) => p.originalName && visualizeUrl.includes(p.originalName),
      )?.id ?? undefined
    );
  }

  /**
   * 点群設定を適用する
   * 複数モデルがある場合は、MinLuminanceの最小値、MaxLuminanceの最大値、MinHeightの最小値、MaxHeightの最大値を適用する
   * ※対象モデルは表示状態のモデルのみ
   */
  public async applyPointCloudSettings() {
    // 表示状態の点群モデルIDを取得
    const pointCloudIds = this.modelData
      .filter((model) => model.modelType === ModelTypes.NUMBER_5)
      .map((model) => toSokModelId(model.id ?? ''));

    // 点群データがなければ終了
    if (pointCloudIds.length === 0) {
      return;
    }

    // MinLuminanceの最小値、MaxLuminanceの最大値、MinHeightの最小値、MaxHeightの最大値を求める
    let minIntensity = 0,
      maxIntensity = 1,
      elevationBottom = Number.MAX_VALUE,
      elevationTop = Number.MIN_VALUE;

    this.modelData.forEach((model) => {
      if (
        model.attributes?.some(
          (attribute) =>
            attribute.type === ModelAttributeTypes.NUMBER_9 &&
            attribute.key === 'MinLuminance',
        )
      ) {
        minIntensity = Math.min(
          parseFloat(
            model.attributes?.find(
              (attribute) =>
                attribute.type === ModelAttributeTypes.NUMBER_9 &&
                attribute.key === 'MinLuminance',
            )?.value ?? '0',
          ),
          minIntensity,
        );
      }
      if (
        model.attributes?.some(
          (attribute) =>
            attribute.type === ModelAttributeTypes.NUMBER_9 &&
            attribute.key === 'MaxLuminance',
        )
      ) {
        maxIntensity = Math.max(
          parseFloat(
            model.attributes?.find(
              (attribute) =>
                attribute.type === ModelAttributeTypes.NUMBER_9 &&
                attribute.key === 'MaxLuminance',
            )?.value ?? '1',
          ),
          maxIntensity,
        );
      }
      if (
        model.attributes?.some(
          (attribute) =>
            attribute.type === ModelAttributeTypes.NUMBER_8 &&
            attribute.key === 'MinHeight',
        )
      ) {
        elevationBottom = Math.min(
          parseFloat(
            model.attributes?.find(
              (attribute) =>
                attribute.type === ModelAttributeTypes.NUMBER_8 &&
                attribute.key === 'MinHeight',
            )?.value ?? '0',
          ),
          elevationBottom,
        );
      }
      if (
        model.attributes?.some(
          (attribute) =>
            attribute.type === ModelAttributeTypes.NUMBER_8 &&
            attribute.key === 'MaxHeight',
        )
      ) {
        elevationTop = Math.max(
          parseFloat(
            model.attributes?.find(
              (attribute) =>
                attribute.type === ModelAttributeTypes.NUMBER_8 &&
                attribute.key === 'MaxHeight',
            )?.value ?? '10',
          ),
          elevationTop,
        );
      }
    });

    // 更新されなかった場合はデフォルト値を設定
    if (elevationBottom == Number.MAX_VALUE) {
      elevationBottom = 0;
    }
    if (elevationTop == Number.MIN_VALUE) {
      elevationTop = 10;
    }

    // 点群設定が未定義の場合はデフォルト設定を適用（基本的には通らない）
    if (this.pointCloudSetting === undefined) {
      await this.trimbleWorkSpaceAPI?.viewer.setPointCloudSettings(
        {
          pointColorBy: PointColorType.RGB,
          shading: 'DEFAULT',
          pointSize: DEFAULT_POINT_SIZE,
          intensityRange: { x: minIntensity, y: maxIntensity },
          elevationBottom,
          elevationTop,
        },
        pointCloudIds,
      );
      return;
    }

    const setting = this.pointCloudSetting;

    const pointColorBy = setting.reflectionIntensity
      ? PointColorType.INTENSITY
      : setting.elevation
        ? PointColorType.ELEVATION
        : PointColorType.RGB;
    const shading = setting.highlightEdge ? 'EYE_DOME_LIGHTING' : 'DEFAULT';
    const pointSize = setting.pointSize;

    // 点群設定を適用
    await this.trimbleWorkSpaceAPI?.viewer.setPointCloudSettings(
      {
        pointColorBy,
        shading,
        edlRadius: DEFAULT_EDL_RADIUS,
        edlStrength: DEFAULT_EDL_STRENGTH,
        pointSize,
        intensityRange: {
          x: minIntensity,
          y: maxIntensity,
        },
        elevationBottom,
        elevationTop,
      },
      pointCloudIds,
    );
  }

  /**
   * 現在のビュー状態を保存する
   */
  async saveCurrentState() {
    if (!this.projectId) {
      return;
    }
    const cameraSettings = await this.trimbleWorkSpaceAPI?.viewer.getCamera();
    const newViewData = {
      // 一時ファイルは除く
      loadedModel: this.loadedModels
        .filter((model) => model.modelStatus !== ModelStatusTypes.NUMBER_2)
        .map((model) => model.id),
      cameraSetting: cameraSettings,
    };
    this.optionSettingsService
      .optionSettingsProjectIdPatch(this.projectId, {
        settingsName: 'LatestViewSettings',
        settingsText: JSON.stringify(newViewData),
      })
      .pipe(take(1))
      .subscribe(() => {
        this.store.dispatch(DisplaySettingAction.SavedCameraStatus());
      });
  }

  /**
   * 現在のビューのスナップショットを取得する
   */
  public async captureSnapshot(): Promise<string | undefined> {
    if (!this.trimbleWorkSpaceAPI) {
      return undefined;
    }
    try {
      return await this.trimbleWorkSpaceAPI.viewer.getSnapshot();
    } catch (error) {
      this.L.error('Error capturing snapshot:', error);
      return undefined;
    }
  }

  ngOnDestroy(): void {
    if (this.projectSubscription) {
      this.projectSubscription.unsubscribe();
    }
    if (this.modelSubscription) {
      this.modelSubscription.unsubscribe();
    }
    if (this.modelStatusSubscription) {
      this.modelStatusSubscription.unsubscribe();
    }
    if (this.pointCloudSettingSubscription) {
      this.pointCloudSettingSubscription.unsubscribe();
    }
    if (this.restoreSavedModelSubscription) {
      this.restoreSavedModelSubscription.unsubscribe();
    }
    if (this.APISubscription) {
      this.APISubscription.unsubscribe();
    }
    if (this.projectIdSubscription) {
      this.projectIdSubscription.unsubscribe();
    }
    if (this.loadedModelsSubscription) {
      this.loadedModelsSubscription.unsubscribe();
    }
    if (this.displaySettingsLoadedSubscription) {
      this.displaySettingsLoadedSubscription.unsubscribe();
    }
  }

  /**
   * 簡易配列比較
   */
  private isArrayEqual(
    array1: unknown[] | undefined,
    array2: unknown[] | undefined,
  ) {
    if (!array1 && !array2) {
      return true;
    } else if (!array1 || !array2) {
      return false;
    }

    let i = array1.length;
    if (i != array2.length) return false;

    while (i--) {
      if (!_.isEqual(array1[i], array2[i])) return false;
    }
    return true;
  }
}
