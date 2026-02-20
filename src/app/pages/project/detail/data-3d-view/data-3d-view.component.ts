import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DomSanitizer,
  SafeResourceUrl,
  Title,
} from '@angular/platform-browser';
import {
  Observable,
  distinctUntilChanged,
  filter,
  map,
  concatMap,
  firstValueFrom,
} from 'rxjs';

import { Store, select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Actions, ofType } from '@ngrx/effects';
import * as TrimbleConnectWorkspace from 'trimble-connect-workspace-api';
import {
  CameraChangedEventArgument,
  EventId,
  ModelStateChangedEventArgument,
  PointPickedEventArgument,
} from 'trimble-connect-workspace-api';

import * as _ from 'lodash';
import { Model, ModelTypes, ModelKinds } from '@nikon-trimble-sok/api-sdk-d3';
import {
  AlertWidthSize,
  AlertWidthSizeSideBarExpanded,
} from 'src/app/helper-utility/data-type-helper/alert-size';
import { extractErrorMessage } from 'src/app/helper-utility/error-helper/error-helper';
import { NTError } from '@nikon-trimble-sok/parts-components';
import { NTSuccess } from '@nikon-trimble-sok/parts-components';
import { GetAcquiredTokens } from 'src/app/helper-utility/trimble-identity-helper/acquired-token';
import { ApplicationWideErrorAction } from 'src/app/stores/actions/application-wide/application-wide-error.action';
import { TrimbleIdentityTokenAction } from 'src/app/stores/actions/application-wide/trimble-identity-token.action';
import { AreaDisplayControlAction } from 'src/app/stores/actions/project/are-display-control.action';
import { NtCommand } from 'src/app/stores/states/project/area-display-control.state';
import { MainAreaComponentType } from 'src/app/stores/states/project/area-display-control.state';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import { CrossSectionAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/cross-section/cross-section.action';
import { MeasurementWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/measurement/measurement-wide.action';
import { ExtrackTargetPointCloudAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/point-cloud/extract-target/extract-target.action';
import { GeoreferencingPointCloudAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/point-cloud/georeferencing';
import { VolumeCalculationAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/report/volume-calculation/volume-calculation.action';
import { TrimbleConnect3DViewerAction } from 'src/app/stores/actions/project/detail/data-3d-view/trimble-connect-3d-viewer.action';
import { HeightChangeAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/height-change/height-change.action';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { TCAPISelector } from 'src/app/stores/selectors/project-list/TCAPI.selector';
import { Data3DViewWideSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/data-3d-view-wide.selector';
import { FileTreeViewSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.selector';
import { DisplaySettingSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/display-setting/display-setting.selector';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { LoadingStatusMode } from 'src/app/stores/states/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.state';
import { Data3DViewHelperService } from './data-3d-view.service';
import { FileTreeViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.action';
import { TrimbimFileService } from 'src/app/helper-utility/trimbim-file-helper/trimbim-file-helper.service';
import {
  toSokModelId,
  toTcModelId,
} from 'src/app/helper-utility/sok-model-id-helper/sok-model-id-helper';
import { TrimbleConnect3DViewerSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/trimble-connect-3d-viewer.selector';
import { StationSettingsAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/station-settings/station-settings.action';
import { ViewSettings } from 'src/app/stores/states/project/detail/data-3d-view/trimble-connect-3d-viewer.state';
import { DesignCheckWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/right-panel/command/design-check/design-check-wide.action';
import {
  ModelCategoryType,
  ModelKindCategory,
} from 'src/app/helper-utility/api-helper/projects-models';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface IParamsCurrentModel {
  idModel: string;
  params?: {
    color?: number;
    transparent?: number;
    modelType?: ModelTypes;
    visualizeUrl?: string;
  };
}
@Component({
  selector: 'ntc-project-detail-data-3d-view-data-3d-view',
  templateUrl: './data-3d-view.component.html',
  styleUrls: ['./data-3d-view.component.scss'],
  providers: [Title],
})
export class Data3dViewComponent
  extends BaseComponent
  implements OnInit, OnDestroy
{
  @ViewChild('myFrame') myFrame: ElementRef | undefined;

  // エラー情報
  public readonly errors$: Observable<NTError[] | undefined>;

  // 右サイドエリアの表示タイプ
  public rightAreaViewType: string | undefined;

  // 右サイドエリアのオーバーフロー表示タイプ
  public rightAreaOverFlowViewType: string | undefined;

  public cameraPosData = 'none';

  public trustUrl: SafeResourceUrl = '';

  // check fitToview = true just has value true once
  private isFirstToggle = true;

  public currentModel?: IParamsCurrentModel = undefined;

  // 3dviewを取得する
  private get get3dView(): HTMLIFrameElement | null {
    const video = <HTMLIFrameElement>document.querySelector('#view');
    return video;
  }

  // 3d-view の制御API
  private API: TrimbleConnectWorkspace.WorkspaceAPI | undefined;

  public alertWidthSize: string = AlertWidthSize.Left_Main_NavbarRight;

  // under-main-areaの状態を取得
  public underMainArea$: Observable<NtCommand | undefined>;

  public underViewType: string = '';

  public isSidebarExpanded: boolean = false;

  public isUiPanelExpanded: boolean = false;

  public isLoading: boolean = false;

  public modelsColor: TrimbleConnectWorkspace.ModelObjects[] | undefined;

  public models: Model[] = [];

  public viewId: string | undefined;

  public color: number | undefined;

  public alpha: number | undefined;

  public currentModelSelected: string | undefined;

  private storedViewData: ViewSettings | undefined = undefined;

  // visualizeId -> modelId保持用
  private visualizeIdmodelIdMap: Map<string, string> = new Map<
    string,
    string
  >();

  private classifiedModelLoadStatus:
    | Record<string, LoadingStatusMode>
    | undefined;

  private showStationLabels: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private sanitizer: DomSanitizer,
    private data3DViewHelperService: Data3DViewHelperService,
    private trimbimFileService: TrimbimFileService,
  ) {
    super('Data3dViewComponent');

    this.underMainArea$ = this.store.pipe(
      select(ApplicationStateSelector.UnderMainAreaSelector.selectorViewType),
    );

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );

    // 流れてきたアクションに対応する処理を実行する
    this.initActionStream();

    this.addSubscriptionsList(
      this.store
        .pipe(select(TCAPISelector.selectorProject))
        .subscribe((project) => {
          if (project.length) {
            this.isFirstToggle = true;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(ApplicationStateSelector.selectorProjectId))
        .subscribe((x) => {
          if (x)
            this.SwitchProject(x).catch((err) => {
              this.setUnrecoverableError(err);
              this.L?.error(x);
            });
        }),
    );

    // エラー表示用のストリーム
    this.errors$ = this.store.pipe(
      select(Data3DViewWideSelector.selectorData3DViewWideError),
      filter((x) => false === _.isNil(x)),
      map((x) => {
        return x?.errors;
      }),
    );

    // 右サイドエリアの表示タイプを監視
    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.RightSideAreaSelector.selectorViewType)
        .subscribe((viewType) => {
          this.rightAreaViewType = viewType;
        }),
    );

    // 右サイドエリアのオーバーフロー表示タイプを監視
    this.addSubscriptionsList(
      this.store
        .select(
          ApplicationStateSelector.RightSideAreaSelector.selectOverFlowCommand,
        )
        .subscribe((command) => {
          this.rightAreaOverFlowViewType = command;
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(AreaDisplayControlAction.ShowUnderMainAreaAction))
        .subscribe(({ view_type }) => {
          this.underViewType = view_type;
        }),
    );
    this.addSubscriptionsList(
      this.store
        .pipe(select(Data3DViewWideSelector.selectorLoading))
        .subscribe((loading: boolean) => {
          this.isLoading = loading;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(Data3DViewWideSelector.selectorListAllModel)
        .subscribe((list: Model[] | undefined) => {
          if (list) {
            this.models = list;
            // visualizeId -> modelIdセット
            this.models.forEach((model) => {
              if (model.visualizeId && model.id) {
                this.visualizeIdmodelIdMap.set(model.visualizeId, model.id);
              }
            });
          }
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
        .select(TrimbleConnect3DViewerSelector.selectorViewData)
        .subscribe((viewData) => {
          if (viewData) {
            this.storedViewData = viewData;
          }
        }),
    );

    // 表示設定の測点ラベル表示トグルを監視（単純な表示/非表示）
    this.addSubscriptionsList(
      this.store
        .select(DisplaySettingSelector.selectorStationLabelSettingState)
        .pipe(
          distinctUntilChanged(
            (prev, curr) => prev?.showStationLabels === curr?.showStationLabels,
          ),
        )
        .subscribe((stationLabelSetting) => {
          if (stationLabelSetting) {
            const newValue = stationLabelSetting.showStationLabels;
            const oldValue = this.showStationLabels;
            this.showStationLabels = newValue;

            // 値が変更された場合のみラベルの表示/非表示を切り替え
            if (oldValue !== undefined && oldValue !== newValue) {
              this.toggleAlignmentLabelsDisplay(newValue);
            }
          }
        }),
    );

    // モデルリスト更新完了時に測点ラベルの色を更新
    // プロパティパネルの「更新」ボタンで線形モデルの色を変更した際に、測点ラベルの色も更新する
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            FileTreeViewAction.FileTreeViewWideAction
              .GetListModelCompleteAction,
          ),
        )
        .subscribe(({ modelIds }) => {
          // 測点ラベルが表示中で、かつ更新対象のモデルIDが指定されている場合のみ処理
          if (!this.showStationLabels || !modelIds || modelIds.length === 0) {
            return;
          }

          // 更新されたモデルIDのうち、線形モデルのみを対象とする
          modelIds.forEach((modelId) => {
            const model = this.models.find((m) => m.id === modelId);
            if (
              model &&
              model.modelType === ModelTypes.NUMBER_2 &&
              model.color !== undefined
            ) {
              // 線形モデルの場合、測点ラベルの色を更新
              this.updateAlignmentLabelColor(modelId, model.color);
            }
          });
        }),
    );

    // 測点設定の更新ボタンが押された後、ラベルを再読み込み
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            StationSettingsAction.UpdateStationSettingsCompleteAction,
            StationSettingsAction.UpdateAlignmentSettingsCompleteAction,
          ),
        )
        .subscribe(() => {
          if (this.showStationLabels) {
            this.refreshAlignmentLabelsWithNewSettings();
          }
        }),
    );
  }

  /**
   * iframeのロード完了イベントハンドラ
   */
  public async onIframeLoad(): Promise<void> {
    // URL初期化前のロードは無視する
    if (!this.trustUrl) {
      return;
    }

    // APIに接続する
    this.doConnect().catch((err) => {
      this.setUnrecoverableError(err);
    });
  }

  /**
   * 表示設定パネルでの測点ラベル表示トグル（単純な表示/非表示切り替え）
   * @param showLabels 表示するかどうか
   */
  private async toggleAlignmentLabelsDisplay(
    showLabels: boolean,
  ): Promise<void> {
    if (!this.API) {
      return;
    }

    // 現在表示されているTrimbimモデルを取得
    const currentTrimbims = await this.API.viewer.getTrimbimModels();
    const loadedModelIds = currentTrimbims.map((m) => toTcModelId(m.id));

    // 表示中のモデルから線形モデルおよびコリドーを抽出
    const alignmentModels = this.models.filter(
      (m) =>
        m.id &&
        (m.modelType === ModelTypes.NUMBER_2 ||
          m.modelType === ModelTypes.NUMBER_10) &&
        loadedModelIds.includes(m.id),
    );

    if (alignmentModels.length === 0) {
      return;
    }

    // 各線形モデルのラベルを表示/非表示
    for (const alignmentModel of alignmentModels) {
      if (!alignmentModel.id) continue;

      const labelModel = this.getAlignmentLabelModel(alignmentModel.id);
      if (!labelModel || !labelModel.id || !labelModel.visualizeUrl) {
        continue;
      }

      const labelSokId = toSokModelId(labelModel.id);

      try {
        if (showLabels) {
          // ラベルを表示（線形モデルのカラーを使用）
          const labelBlob = await firstValueFrom(
            this.trimbimFileService.getTrbFileAsBlob(labelModel.visualizeUrl),
          );

          if (labelBlob) {
            const color = this.getAlignmentColorForLabel(alignmentModel);
            await this.API.viewer.addTrimbimModel({
              id: labelSokId,
              fitToView: false,
              trbBlob: labelBlob,
              color, // 線形モデルのカラーを適用
            });
          }
        } else {
          // ラベルを非表示
          await this.API.viewer.removeTrimbimModel(labelSokId);
        }
      } catch (e) {
        this.L.error(e);
      }
    }
  }

  /**
   * 測点設定パネルでの更新ボタン押下時のラベル再読み込み
   * モデルリストを再取得して新しいvisualizeUrlでラベルを更新する
   */
  private async refreshAlignmentLabelsWithNewSettings(): Promise<void> {
    if (!this.API) {
      return;
    }

    // 現在表示されているTrimbimモデルを取得
    const currentTrimbims = await this.API.viewer.getTrimbimModels();
    const loadedModelIds = currentTrimbims.map((m) => toTcModelId(m.id));

    // 表示中のモデルから線形モデルおよびコリドーを抽出
    const alignmentModels = this.models.filter(
      (m) =>
        m.id &&
        (m.modelType === ModelTypes.NUMBER_2 ||
          m.modelType === ModelTypes.NUMBER_10) &&
        loadedModelIds.includes(m.id),
    );

    if (alignmentModels.length === 0) {
      return;
    }

    // Step 1: 既存の表示されているラベルモデルを削除
    for (const alignmentModel of alignmentModels) {
      if (!alignmentModel.id) continue;

      const labelModel = this.getAlignmentLabelModel(alignmentModel.id);
      if (labelModel && labelModel.id) {
        const labelSokId = toSokModelId(labelModel.id);
        try {
          await this.API.viewer.removeTrimbimModel(labelSokId);
        } catch (e) {
          this.L.error(e);
        }
      }
    }

    // Step 2: モデルリストを再読み込み（visualizeUrlが更新される）
    this.store.dispatch(
      FileTreeViewAction.FileTreeViewWideAction.GetListModelAction({}),
    );

    // Step 3: モデルリストの再読み込み完了を待機
    await firstValueFrom(
      this.actions$.pipe(
        ofType(
          FileTreeViewAction.FileTreeViewWideAction.GetListModelCompleteAction,
        ),
      ),
    );

    // Step 4: 新しいURLでラベルモデルを表示（線形モデルのカラーを使用）
    for (const alignmentModel of alignmentModels) {
      if (!alignmentModel.id) continue;

      // 更新されたモデルリストから最新のラベルモデルと線形モデルを取得
      const updatedAlignmentModel = this.models.find(
        (m) => m.id === alignmentModel.id,
      );
      if (!updatedAlignmentModel) continue;

      const labelModel = this.getAlignmentLabelModel(alignmentModel.id);
      if (!labelModel || !labelModel.id || !labelModel.visualizeUrl) {
        continue;
      }

      const labelSokId = toSokModelId(labelModel.id);

      try {
        const labelBlob = await firstValueFrom(
          this.trimbimFileService.getTrbFileAsBlob(labelModel.visualizeUrl),
        );

        if (labelBlob) {
          const color = this.getAlignmentColorForLabel(updatedAlignmentModel);
          await this.API.viewer.addTrimbimModel({
            id: labelSokId,
            fitToView: false,
            trbBlob: labelBlob,
            color, // 線形モデルのカラーを適用
          });
        }
      } catch (e) {
        this.L.error(e);
      }
    }
  }

  /**
   * 線形モデルに紐づく測点ラベルモデルを取得
   * @param alignmentModelId 線形モデルID
   * @returns 測点ラベルモデル（存在しない場合はundefined）
   */
  private getAlignmentLabelModel(alignmentModelId: string): Model | undefined {
    const alignmentModel = this.models.find((m) => m.id === alignmentModelId);
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

    const labelModel = this.models.find(
      (m) =>
        m.id === labelModelId &&
        m.modelType === ModelTypes.NUMBER_14 &&
        m.modelKind === ModelKinds.NUMBER_19,
    );

    return labelModel;
  }

  /**
   * 線形モデルに対応する測点ラベルモデルを表示/非表示にする
   * @param alignmentModelId 線形モデルID
   * @param visible 表示するかどうか
   */
  private async handleAlignmentLabel(
    alignmentModelId: string,
    visible: boolean,
  ): Promise<void> {
    const model = this.models.find((m) => m.id === alignmentModelId);

    // 線形モデルまたはコリドーの場合のみ処理
    if (
      !model ||
      (model.modelType !== ModelTypes.NUMBER_2 &&
        model.modelType !== ModelTypes.NUMBER_10)
    ) {
      return;
    }

    const labelModel = this.getAlignmentLabelModel(alignmentModelId);
    if (!labelModel || !labelModel.id || !labelModel.visualizeUrl) {
      return;
    }

    const labelSokId = toSokModelId(labelModel.id);

    try {
      if (visible && this.showStationLabels) {
        // ラベルモデルを表示（線形モデルのカラーを使用）
        const labelBlob = await firstValueFrom(
          this.trimbimFileService.getTrbFileAsBlob(labelModel.visualizeUrl),
        );

        if (labelBlob) {
          const color = this.getAlignmentColorForLabel(model);
          await this.API?.viewer.addTrimbimModel({
            id: labelSokId,
            fitToView: false,
            trbBlob: labelBlob,
            color, // 線形モデルのカラーを適用
          });
        }
      } else {
        // ラベルモデルを非表示
        await this.API?.viewer.removeTrimbimModel(labelSokId);
      }
    } catch (e) {
      this.L.error(e);
    }
  }

  /**
   * 線形モデルの色が変更されたときに、対応する測点ラベルの色も更新する
   * @param alignmentModelId 線形モデルID
   * @param newColor 新しいカラー値
   */
  private async updateAlignmentLabelColor(
    alignmentModelId: string,
    newColor: number,
  ): Promise<void> {
    if (!this.API) {
      return;
    }

    const alignmentModel = this.models.find((m) => m.id === alignmentModelId);
    if (!alignmentModel || alignmentModel.modelType !== ModelTypes.NUMBER_2) {
      return;
    }

    const labelModel = this.getAlignmentLabelModel(alignmentModelId);
    if (!labelModel || !labelModel.id || !labelModel.visualizeUrl) {
      return;
    }

    const labelSokId = toSokModelId(labelModel.id);

    try {
      // Check if the label is currently displayed
      const currentTrimbims = await this.API.viewer.getTrimbimModels();
      const isLabelDisplayed = currentTrimbims.some((m) => m.id === labelSokId);

      // Only update if the label is currently visible
      if (!isLabelDisplayed) {
        return;
      }

      // Remove existing label
      await this.API.viewer.removeTrimbimModel(labelSokId);

      // Re-add label with new color
      const labelBlob = await firstValueFrom(
        this.trimbimFileService.getTrbFileAsBlob(labelModel.visualizeUrl),
      );

      if (labelBlob) {
        // Convert new color to RGBA format
        const updatedModel = { ...alignmentModel, color: newColor };
        const color = this.getAlignmentColorForLabel(updatedModel);

        await this.API.viewer.addTrimbimModel({
          id: labelSokId,
          fitToView: false,
          trbBlob: labelBlob,
          color,
        });
      }
    } catch (e) {
      this.L.error(e);
    }
  }

  // 表示対象の現場を切り替える
  private async SwitchProject(projectId: string) {
    //現在のiframe を破棄する
    this.trustUrl = '';
    this.currentEventHandlerId = '-';
    await sleep(100);

    this.trustUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://web.connect.trimble.com/projects/${projectId}/viewer/3d?isEmbedded=true`,
    );
  }

  private initActionStream() {
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          // 処理対象とするアクションを指定する
          ofType(
            TrimbleConnect3DViewerAction.DemandToView3DEvent
              .ToggleSidePannelAcition,
          ),
        )
        .subscribe(() => {
          if (this.API) {
            this.toggleSidePanel();
          }
        }),
    );

    // モデルの読み込みを要求されたら
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          // 処理対象とするアクションを指定する
          ofType(
            TrimbleConnect3DViewerAction.DemandToView3DEvent
              .ModelReadRequestAction,
          ),
        )
        .subscribe((act) => {
          if (this.API) {
            // モデルを表示状態にする
            let visible = true;
            // モデルにカメラを合わせる
            const fitToView = this.isFirstToggle ? true : false;
            this.isFirstToggle = false;

            if (act.state === LoadingStatusMode.Loaded) {
              // モデルを非表示状態にする
              visible = false;
              // モデルにカメラを合わせない
            }

            let sokId = act.id;

            const validColor =
              act.params?.color && act.params.color > 0 ? act.params.color : 0;

            const modelLoadSuccess = () => {
              const params: IParamsCurrentModel = {
                idModel: sokId,
                params: {
                  color: validColor,
                  transparent: act.params?.transparent,
                  modelType: act.params?.modelType,
                  visualizeUrl: act.params?.visualizeUrl,
                },
              };

              this.currentModel = params;

              // 読み込み完了を通知
              this.store.dispatch(
                TrimbleConnect3DViewerAction.DemandToView3DEvent.ModelReadRequestCompletedAction(
                  {
                    id: act.id,
                  },
                ),
              );

              // 読み込み済みのモデル状態を更新する
              this.store.dispatch(
                TrimbleConnect3DViewerAction.DemandToView3DEvent.UpdateLoadedModelStateAction(
                  { id: act.id },
                ),
              );
            };

            const loadFail = (e: unknown) => {
              this.data3DViewHelperService.setModelState(
                act.id,
                LoadingStatusMode.Failed,
              );
              this.setUnrecoverableError(e);
              this.L.error(e);
            };

            if (
              act.params?.modelType === ModelTypes.NUMBER_5 &&
              act.params?.visualizeUrl
            ) {
              // PointCloud
              sokId = toSokModelId(act.id); // Use SOK model ID
              if (!visible) {
                // Remove
                this.API.viewer
                  .removeModel(sokId)
                  .then(modelLoadSuccess)
                  .catch(loadFail);
              } else {
                // Add
                this.API.viewer
                  .addPointCloud({
                    fitToView: false,
                    id: sokId,
                    url: act.params.visualizeUrl,
                  })
                  .then(() => {
                    modelLoadSuccess();
                    this.data3DViewHelperService.applyPointCloudSettings();
                    if (fitToView) {
                      this.data3DViewHelperService.setCameraToModel(
                        act.id,
                        true,
                      );
                    }
                  })
                  .catch(loadFail);
              }
            } else if (act.params?.visualizeUrl) {
              // Trimbim Model
              sokId = toSokModelId(act.id); // Use SOK model ID
              if (!visible) {
                // Remove
                this.API.viewer
                  .removeTrimbimModel(sokId)
                  .then(async () => {
                    modelLoadSuccess();
                    // 線形モデルの場合、測点ラベルも非表示にする
                    await this.handleAlignmentLabel(act.id, false);
                  })
                  .catch(loadFail);
              } else {
                // Add
                this.trimbimFileService
                  .getTrbFileAsBlob(act.params.visualizeUrl)
                  .subscribe((blob: Blob) => {
                    if (act.params?.modelType === ModelTypes.NUMBER_8) {
                      this.API?.viewer
                        .addTrimbimModel({
                          id: sokId,
                          fitToView: false,
                          trbBlob: blob,
                        })
                        .then(async () => {
                          modelLoadSuccess();
                          if (fitToView) {
                            this.data3DViewHelperService.setCameraToModel(
                              act.id,
                              true,
                            );
                          }
                          // 線形モデルの場合、測点ラベルも表示する
                          await this.handleAlignmentLabel(act.id, true);
                        })
                        .catch(loadFail);
                    } else {
                      const rgb = validColor;
                      const r = (rgb >> 16) & 0xff;
                      const g = (rgb >> 8) & 0xff;
                      const b = rgb & 0xff;
                      const alpha = act.params?.transparent ?? 100;
                      const a = Math.round(alpha * 2.55);
                      this.API?.viewer
                        .addTrimbimModel({
                          id: sokId,
                          fitToView: false,
                          trbBlob: blob,
                          color: {
                            r,
                            g,
                            b,
                            a,
                          },
                        })
                        .then(async () => {
                          modelLoadSuccess();
                          if (fitToView) {
                            this.data3DViewHelperService.setCameraToModel(
                              act.id,
                              true,
                            );
                          }
                          // 線形モデルの場合、測点ラベルも表示する
                          await this.handleAlignmentLabel(act.id, true);
                        })
                        .catch(loadFail);
                    }
                  });
              }
            } else {
              // Original Model
              const visualizeId = this.models.find(
                (m) => m.id === act.id,
              )?.visualizeId;

              if (!visualizeId) {
                // Todo: waiting for the SOK API to be ready
                return;
              }

              // visualizeId -> modelIdセット
              this.visualizeIdmodelIdMap.set(visualizeId, act.id);

              this.API.viewer
                .toggleModel(visualizeId, visible, false)
                .then(() => {
                  modelLoadSuccess();
                  if (fitToView) {
                    this.data3DViewHelperService.setCameraToModel(
                      act.id,
                      false,
                    );
                  }
                })
                .catch((e) => {
                  const expectedError =
                    'dispatcher.ts | sendRequest(): Operation timed out.';
                  if (
                    e.message === expectedError ||
                    this.classifiedModelLoadStatus?.[act.id] ===
                      LoadingStatusMode.Assimilating
                  ) {
                    return;
                  }
                  loadFail(e);
                });
            }
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(FileTreeViewSelector.selectorClassifiedModelLoadStatus))
        .subscribe((modelLoadStatus) => {
          if (!modelLoadStatus || !this.currentModel) return;

          this.classifiedModelLoadStatus = modelLoadStatus;

          const { idModel, params } = this.currentModel;

          if (
            params?.modelType &&
            [ModelTypes.NUMBER_8, ModelTypes.NUMBER_6].includes(
              params?.modelType,
            )
          ) {
            return;
          }

          if (modelLoadStatus[idModel] === LoadingStatusMode.Loaded) {
            const hexColor = params?.color?.toString(16)?.padStart(6, '0');

            this.data3DViewHelperService.changeColorModel(
              idModel,
              `#${hexColor}`,
              params?.transparent,
            );

            this.currentModel = undefined;
          }
        }),
    );

    // 読み込み済みモデルの状態を更新する
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          // 処理対象とするアクションを指定する
          ofType(
            TrimbleConnect3DViewerAction.DemandToView3DEvent
              .UpdateLoadedModelStateAction,
          ),
          // Ensure actions are processed sequentially
          concatMap(async ({ id, overrideUnloadState }) => {
            if (this.API) {
              let ids: string[] = [];

              // Fetch models and accumulate IDs of loaded models
              const visualizeIds = this.models
                .filter((m) => !m.visualizeUrl && m.visualizeId)
                .map((x) => x.visualizeId);
              await this.API.viewer
                .getModels()
                .then((x) => {
                  ids = ids.concat(
                    x
                      .filter(
                        (x) =>
                          x.state === 'loaded' &&
                          visualizeIds.some((y) => y === x.id),
                      )
                      .map(
                        (z) =>
                          this.models.find((m) => m.visualizeId === z.id)?.id ??
                          '',
                      ),
                  );
                })
                .catch((e) => {
                  this.setUnrecoverableError(e);
                  this.L.error(e);
                });

              ids = ids.filter((id) => id !== '');

              // Fetch point clouds and accumulate their IDs (removing prefix)
              await this.API.viewer
                .getPointClouds()
                .then((x) => {
                  ids = ids.concat(x.map((y) => toTcModelId(y.id)));
                })
                .catch((e) => {
                  this.setUnrecoverableError(e);
                  this.L.error(e);
                });

              // Fetch Trimbim models and accumulate their IDs (removing prefix)
              await this.API.viewer
                .getTrimbimModels()
                .then((x) => {
                  ids = ids.concat(x.map((y) => toTcModelId(y.id)));
                })
                .catch((e) => {
                  this.setUnrecoverableError(e);
                  this.L.error(e);
                });

              // Dispatch action to update the loaded model state
              this.store.dispatch(
                TrimbleConnect3DViewerAction.DemandToView3DEvent.UpdateLoadedModelStateCompletedAction(
                  {
                    ids,
                    modelId: id,
                    overrideUnloadState,
                  },
                ),
              );

              this.store.dispatch(
                TrimbleConnect3DViewerAction.View3DViewer.CrossSectionMarkupLine.getCurrentModelLoaded(
                  {
                    models: this.models.filter(
                      (m) => m.id && ids.includes(m.id),
                    ),
                  },
                ),
              );
            }
          }),
        )
        .subscribe(),
    );

    // アクセストークンが更新されたら、
    // 3d-view内部のトークンも合わせて更新する
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          // 処理対象とするアクションを指定する
          ofType(TrimbleIdentityTokenAction.RefreshCompletedAction),
          //tap((x) => console.log(`UP : ${x.authResponse?.access_token}`)),
          //Do not update if token does not change
          distinctUntilChanged(
            (previous, current) =>
              previous?.authResponse?.access_token ===
              current?.authResponse?.access_token,
          ),
        )
        .subscribe((act) => {
          if (this.API) {
            const t = act.authResponse?.access_token;
            if (t) {
              //console.log(`toke up : ${act.authResponse?.access_token}`);
              this.API.embed.setTokens({
                accessToken: t,
                refreshToken: act.authResponse?.refresh_token,
              });
            }
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(Data3DViewWideSelector.selectorModelsColor)
        .subscribe((modelsColor) => {
          if (this.modelsColor?.length) {
            this.modelsColor = [...this.modelsColor, ...modelsColor];
          } else {
            this.modelsColor = modelsColor;
          }
        }),
    );
  }

  //現在のイベントハンドラのid
  private currentEventHandlerId = '-';

  private async doConnect() {
    // トークンを取得する
    const token = await GetAcquiredTokens(this.store, this.actions$);

    this.currentEventHandlerId = self.crypto.randomUUID();
    const closuresEventHandlerId = this.currentEventHandlerId;

    const viewer = this.get3dView;
    if (viewer) {
      this.API = await TrimbleConnectWorkspace.connect(
        viewer,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: EventId, data: any) => {
          //console.log(closuresEventHandlerId);

          // 現場ID変更時に、
          // 3d-viewのiframeを解体して、
          // 3d-viewのコントロールオブジェクトを解体したとしても、
          // イベントハンドラーだけは生き残り、複数のイベントハンドラが同時に走る状態となってしまう。
          // そこで、現在、有効とされているイベントハンドラを識別して、
          // 生き残ってしまっているイベントハンドラは無視するように制御する。
          if (this.currentEventHandlerId == closuresEventHandlerId) {
            //console.log('onCall ' + closuresEventHandlerId);
            // イベントコールバック
            //console.log('Event: ', event, data);
            this.viewEventDispatch(event, data);
          }
        },
      );

      // トークンをセットする
      const t = token?.access_token;
      if (t) {
        this.API.embed
          .setTokens({ accessToken: t, refreshToken: token.refresh_token })
          .catch((error) => this.L.error(error));
      }

      // アクセストークの更新処理を行う

      //サイドパネルを非表示にする
      this.hiddenSidePanel();
    }
  }

  //サイドパネを閉じる
  private hiddenSidePanel() {
    // 3d-viewがロードされてからサイドパネルを消す。
    // 問題点として、サイドパネルの表示が完了したタイミングを正しくとる方法がない。
    // そこで、適当なタイミングで再実行して正しく消えた事が確認されたに、変更完了扱いとする。
    const id = setInterval(() => {
      //サイドパネルの表示を消去する
      if (this.API) {
        this.API.ui
          .setUI({
            name: 'SidePanel',
            state: 'hidden',
          })
          .then(() => {
            clearInterval(id);

            // この設定が完了したいタイミングにおいて、
            // 3d-viewの初期化が完了したものと判断する。
            //
            // [memo]
            // 対象のイベントが取れてこないので一旦このタイミングを正と判断する
            this.store.dispatch(
              TrimbleConnect3DViewerAction.View3DViewer.setInitializedAction({
                initialized: true,
              }),
            );

            // Store trimble workspace API to state for multi child function in 3d view

            this.API &&
              this.store.dispatch(
                TrimbleConnect3DViewerAction.View3DViewer.setTrimbleWorkspaceAPI(
                  {
                    API: this.API,
                  },
                ),
              );
          })
          .catch(() => {
            // [Memo]
            // ここの処理は、画面上の動作タイミングとの関係性により、
            // 正しく処理が成功するまで繰り返して実行するものである。
            // このため、ここではエラーのハンドリング処理は行わないものとする。
            //
            //this.setUnrecoverableError(err);
            //this.L?.error(err);
          });

        //  -- TODO: hide current toolbar
        // this.API.ui
        //   .setUI({ name: 'MainToolbar', state: 'hidden' })
        //   .then(() => {
        //     clearInterval(id);
        //   })
        //   .catch(() => {});
      }
    }, 500);
  }

  //サイドパネを開く
  public async toggleSidePanel() {
    //サイドパネルの表示を消去する
    if (this.API) {
      const sidePanel = await this.API.ui.getUI();

      const promises: Promise<void>[] = [];

      const executeToggle = async (
        element: TrimbleConnectWorkspace.ElementState,
      ) => {
        if (element.name === 'SidePanel') {
          const isExpanded = element.state === 'expanded'; // previous state;
          const newState = isExpanded ? 'hidden' : 'expanded';

          this.isUiPanelExpanded = !isExpanded; // current state

          if (isExpanded) {
            await this.API?.ui.setUI({
              name: 'SidePanel',
              state: newState,
            });
            this.store.dispatch(AreaDisplayControlAction.ShowLeftAreaAction());
          } else {
            // use setTimeout here to make the ui smooth
            setTimeout(() => {
              this.API?.ui.setUI({
                name: 'SidePanel',
                state: newState,
              });
            }, 50);
            this.store.dispatch(AreaDisplayControlAction.HideLeftAreaAction());
          }
        }
      };

      sidePanel.forEach((element) => {
        promises.push(executeToggle(element));
      });

      await Promise.all(promises);
    }
  }

  // 画面のイベントをディスパッチさせる
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async viewEventDispatch(event: EventId, data: any) {
    // イベントコールバック
    //Memo
    // インターフェースとして定義されるデータは
    // EventToArgMap型
    // に定義された識別子で届く
    // 各イベントに付随するデータがどのようなデータ型かは
    // インターフェースの型を見てはんていすること。
    switch (event) {
      case 'viewer.onCameraChanged': {
        const cData = <CameraChangedEventArgument>data;
        // 画面表示用にJSON形式のデータに変換する
        this.cameraPosData = JSON.stringify(cData.data);

        break;
      }

      case 'viewer.onPresentationChanged': {
        if (data.data.elements.length === 0) return;
        const color = data.data.elements[0].color;
        // color.aが存在するとき、colorを更新
        if (color.a) {
          this.alpha = color.a;
        }
        if (color.r || color.g || color.b) {
          this.color = this.data3DViewHelperService.transformRgbToDecimalColor(
            data.data.elements[0].color,
          );
        }
        break;
      }
      case 'viewer.onSelectionChanged': {
        // update color when changing color
        if (
          data.data.length <= 0 &&
          this.currentModelSelected &&
          (this.color || this.alpha)
        ) {
          // this.currentModelSelectedから先頭のsok-を除いたものがmodelId
          const modelId = this.currentModelSelected.substring(4);
          const selectedModel = this.models.find(
            (model) => model.id === modelId,
          );

          // modelType = 6かつmodelKind = 7 #backmapもしくはmodelType = 8かつmodelKind = 5 #model3Dの場合は色の更新はしない
          if (
            !selectedModel ||
            (selectedModel.modelType === Number(ModelCategoryType.図面) &&
              selectedModel.modelKind === Number(ModelKindCategory.図面)) ||
            (selectedModel.modelType ===
              Number(ModelCategoryType['3Dモデル']) &&
              selectedModel.modelKind === Number(ModelKindCategory['3Dモデル']))
          ) {
            return;
          }

          let updatedModel = selectedModel;
          if (this.alpha) {
            // transparencyは0-100のパーセンテージで保存する(alphaは0-255)
            const transparency = Math.round((this.alpha / 255) * 100);
            updatedModel = {
              ...updatedModel,
              transparency: transparency,
            };
          }
          if (this.color) {
            updatedModel = {
              ...updatedModel,
              color: this.color,
            };
          }

          this.store.dispatch(
            FileTreeViewAction.FileTreeViewWideAction.UpdateMultiModelAction({
              models: [updatedModel],
            }),
          );

          this.currentModelSelected = undefined;
        } else {
          this.currentModelSelected = data.data[0]?.modelId;
        }

        switch (this.rightAreaViewType) {
          case NtCommand.MeasurementElevationDisparity:
            if (this.currentModelSelected) {
              let selectedModelId: string | undefined = undefined;
              if (data.data.length <= 0) {
                selectedModelId = undefined;
              } else {
                selectedModelId = data.data[0]?.modelId;
              }
              this.store.dispatch(
                MeasurementWideAction.ModelSelectAction({
                  modelId: selectedModelId,
                }),
              );
            }
            break;
          case NtCommand.DensityCheck:
            {
              const modelObjectIds =
                data.data as TrimbleConnectWorkspace.ModelObjectIds[];
              this.store.dispatch(
                TrimbleConnect3DViewerAction.View3DViewer.UpdateModelSelectionFromViewAction(
                  {
                    selectedModelIds: modelObjectIds,
                  },
                ),
              );
            }
            break;
          case NtCommand.VolumeCalculation:
            {
              const modelObjectIds =
                data.data as TrimbleConnectWorkspace.ModelObjectIds[];
              this.store.dispatch(
                TrimbleConnect3DViewerAction.View3DViewer.UpdateModelSelectionFromViewAction(
                  {
                    selectedModelIds: modelObjectIds,
                  },
                ),
              );
            }
            break;
          case NtCommand.DailyVolumeReport:
            {
              const modelObjectIds =
                data.data as TrimbleConnectWorkspace.ModelObjectIds[];
              this.store.dispatch(
                TrimbleConnect3DViewerAction.View3DViewer.UpdateModelSelectionFromViewAction(
                  {
                    selectedModelIds: modelObjectIds,
                  },
                ),
              );
            }
            break;
        }

        break;
      }

      case 'viewer.onPicked': {
        //内部オブジェクトの選択状態の変化
        const cData = <PointPickedEventArgument>data;
        //イベントとして投げる

        switch (this.rightAreaViewType) {
          case NtCommand.ExtractTarget:
            this.store.dispatch(
              ExtrackTargetPointCloudAction.Viewer_onPickedAction({
                data,
              }),
            );
            break;
          case NtCommand.Georeferencing:
            if (cData?.data?.modelId || cData?.data?.objectRuntimeId) {
              this.store.dispatch(
                GeoreferencingPointCloudAction.PointPickedAction({
                  data: cData.data,
                }),
              );
            }
            break;

          case NtCommand.MeasurementArea:
          case NtCommand.MeasurementDistance:
          case NtCommand.MeasurementVolume:
          case NtCommand.MeasurementTwoPoint:
          case NtCommand.MeasurementElevationDisparity:
            if (cData?.data?.modelId || cData?.data?.objectRuntimeId) {
              this.store.dispatch(
                MeasurementWideAction.PointPickedAction({
                  pointPicked: cData.data,
                }),
              );
            }
            break;

          case NtCommand.EarthwordNumberCalculation:
            this.store.dispatch(
              VolumeCalculationAction.PointPickedAction({
                pointPicked: cData.data,
              }),
            );
            break;

          case NtCommand.RegistBoundary:
            if (cData?.data?.modelId || cData?.data?.objectRuntimeId) {
              this.store.dispatch(
                DesignCheckWideAction.PointPickedAction({
                  pointPicked: cData.data,
                }),
              );
            }
            break;
          default:
            break;
        }

        switch (this.underViewType) {
          case NtCommand.ArbitraryCrossSectional:
            this.store.dispatch(
              CrossSectionAction.PointPickedAction({ data: cData }),
            );
            break;
          case NtCommand.CrossSectional:
            this.store.dispatch(
              CrossSectionAction.PointPickedAction({ data: cData }),
            );
            break;
        }

        switch (this.rightAreaOverFlowViewType) {
          case NtCommand.Property3D:
          case NtCommand.FormEditProperty3D:
          case NtCommand.Export:
          case NtCommand.StationSettings:
            break;
          case NtCommand.HeightChange:
            this.store.dispatch(
              HeightChangeAction.PointPickedAction({
                point: {
                  x: cData.data.position?.x || 0,
                  y: cData.data.position?.y || 0,
                  z: cData.data.position?.z || 0,
                },
              }),
            );
            break;
        }

        break;
      }

      case 'viewer.onModelStateChanged': {
        const cData = <ModelStateChangedEventArgument>data;

        let id = cData.data.id;

        // visualizeId -> modelId取得
        const _modelId = this.visualizeIdmodelIdMap.get(cData.data.id);
        if (_modelId) {
          id = _modelId;
        }

        if (cData.data.state === 'loaded') {
          this.data3DViewHelperService.updateModelState(id);
        } else if (cData.data.state === 'assimilating') {
          this.data3DViewHelperService.setModelState(
            id,
            LoadingStatusMode.Assimilating,
          );
        } else if (cData.data.state === 'assimilationBusy') {
          this.data3DViewHelperService.setModelState(
            id,
            LoadingStatusMode.AssimilationBusy,
          );
        } else if (
          cData.data.state === 'assimilationFailed' ||
          cData.data.state === 'loadingFailed'
        ) {
          this.data3DViewHelperService.setModelState(
            id,
            LoadingStatusMode.Failed,
          );
        }
        break;
      }

      case 'view.onViewAction': {
        const viewActionType = data.data.action;
        const viewData: TrimbleConnectWorkspace.ViewSpec | undefined =
          data.data.view;

        if (!viewData || !viewData.id) break;

        if (viewActionType === 'created' || viewActionType === 'updated') {
          // Viewが保管されるイベント
          const trimbims = await this.API?.viewer.getTrimbimModels();
          const pointClouds = await this.API?.viewer.getPointClouds();
          const trimbimIds = trimbims?.map((t) => t.id) ?? []; // Ids of trimbims which are currently displayed
          const pointCloudIds = pointClouds?.map((t) => t.id) ?? []; // Ids of pointClouds which are currently displayed
          const missingIds = trimbimIds
            .concat(pointCloudIds)
            .map((id) => toTcModelId(id));

          this.store.dispatch(
            TrimbleConnect3DViewerAction.DemandToView3DEvent.StoreViewAction({
              viewId: viewData.id,
              modelIds: missingIds,
            }),
          );
        } else if (viewActionType === 'set') {
          // Viewを選択する時
          if (this.storedViewData) {
            const storedModelIds = this.storedViewData[viewData.id] ?? '';

            this.data3DViewHelperService.isFirstToggle = false;

            const trimbims = await this.API?.viewer.getTrimbimModels();
            const pointClouds = await this.API?.viewer.getPointClouds();
            const trimbimIds = trimbims?.map((t) => t.id) ?? []; // Ids of trimbims which are currently displayed
            const pointCloudIds = pointClouds?.map((t) => t.id) ?? []; // Ids of pointClouds which are currently displayed
            const missingIds = trimbimIds
              .concat(pointCloudIds)
              .map((id) => toTcModelId(id));
            await this.data3DViewHelperService.hideModel(missingIds);

            setTimeout(async () => {
              await this.data3DViewHelperService.showModel(
                storedModelIds.split(','),
                '',
              );
            }, 500);
          }
        } else if (viewActionType === 'removed') {
          this.store.dispatch(
            TrimbleConnect3DViewerAction.DemandToView3DEvent.RemoveViewAction({
              viewId: viewData.id,
            }),
          );
        }
        break;
      }
    }
  }

  /** @abstract 復旧不能なエラーを発生させる  */
  private setUnrecoverableError(err: unknown) {
    this.store.dispatch(
      Data3dViewWideAction.OnErrorAction({
        message: extractErrorMessage(err),
        rawError: err,
        recoveryAction: ApplicationWideErrorAction.UnrecoverableAction(),
      }),
    );
  }

  /** @abstract エラー復旧処理  */
  public errorClose(e: NTError) {
    // リカバーアクションを投げる
    this.store.dispatch(
      Data3dViewWideAction.ResetErrorAction({
        targetError: e,
      }),
    );
  }

  // Close success
  public handleDismissSuccess(e: NTSuccess) {
    this.store.dispatch(
      Data3dViewWideAction.ResetSuccessAction({
        targetSuccess: e,
      }),
    );
  }

  ngOnInit(): void {
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(AreaDisplayControlAction.HideRightAreaAction))
        .subscribe(() => {
          this.alertWidthSize = this.isSidebarExpanded
            ? AlertWidthSizeSideBarExpanded.Left_Main_NavbarRight
            : AlertWidthSize.Left_Main_NavbarRight;
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(AreaDisplayControlAction.ShowOnlyMainAreaAction))
        .subscribe(({ view_type }) => {
          if (view_type === MainAreaComponentType.Data3DView) {
            this.store.dispatch(
              Data3dViewWideAction.SetShowPointListPanelAction({
                showPointListPanel: false,
              }),
            );
            this.store.dispatch(
              Data3dViewWideAction.SetShowDisplaySettingAction({
                showDisplaySetting: false,
              }),
            );

            this.alertWidthSize = this.isSidebarExpanded
              ? AlertWidthSizeSideBarExpanded.Left_Main_NavbarRight
              : AlertWidthSize.Left_Main_NavbarRight;
          }
        }),
    );

    // Watch open right area, change size alert
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(AreaDisplayControlAction.ShowRightAreaAction))
        .subscribe(() => {
          this.alertWidthSize = this.isSidebarExpanded
            ? AlertWidthSizeSideBarExpanded.Left_Main_Right_NavbarRight
            : AlertWidthSize.Left_Main_Right_NavbarRight;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorAreaDisplayControlState)
        .subscribe((state) => {
          if (state?.leftSideArea !== undefined) {
            if (this.isUiPanelExpanded) {
              this.isUiPanelExpanded = false;
              this.API?.ui.getUI().then((sidePanel) => {
                sidePanel.forEach((element) => {
                  if (element.name === 'SidePanel') {
                    this.API?.ui.setUI({
                      name: 'SidePanel',
                      state: 'hidden',
                    });
                  }
                });
              });
            }
          }
        }),
    );
  }

  public override ngOnDestroy(): void {
    this.unSubscriptionsAll();
  }

  /**
   * 線形モデルのカラーをRGBA形式に変換
   * @param alignmentModel 線形モデル
   * @returns RGBA形式のカラーオブジェクト
   */
  private getAlignmentColorForLabel(alignmentModel: Model): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    const validColor =
      alignmentModel.color && alignmentModel.color > 0
        ? alignmentModel.color
        : 0xffffff; // デフォルトは白
    const rgb = validColor;
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const alpha = alignmentModel.transparency ?? 100;
    const a = Math.round(alpha * 2.55);

    return { r, g, b, a };
  }
}
