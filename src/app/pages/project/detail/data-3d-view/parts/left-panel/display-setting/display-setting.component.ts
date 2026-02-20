import { Component, AfterViewInit } from '@angular/core';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { Store } from '@ngrx/store';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import { DisplaySettingAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/display-setting/display-setting.action';
import { DisplaySettingSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/display-setting/display-setting.selector';
import { AreaDisplayControlAction } from 'src/app/stores/actions/project/are-display-control.action';
import { NtCommand } from 'src/app/stores/states/project/area-display-control.state';
import {
  DEFAULT_POINT_SIZE,
  MAX_POINT_SIZE,
  MIN_POINT_SIZE,
} from './display-setting.definition';
import { Data3DViewHelperService } from '../../../data-3d-view.service';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-display-setting-component',
  templateUrl: './display-setting.component.html',
  styleUrls: ['./display-setting.component.scss'],
})
export class DisplaySettingComponent
  extends BaseComponent
  implements AfterViewInit
{
  public highlightEdge: boolean = false;
  public reflectionIntensity: boolean = false;
  public elevation: boolean = false;
  public pointSize: number = DEFAULT_POINT_SIZE;

  public minPointSize = MIN_POINT_SIZE;
  public maxPointSize = MAX_POINT_SIZE;

  public xyzMode: boolean = false;
  public useNezLabel: boolean = false;
  public restoreSaved: boolean = false;

  // 測点ラベル設定
  public showStationLabels: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    private data3DViewHelperService: Data3DViewHelperService,
  ) {
    super('DisplaySettingComponent');
  }

  ngAfterViewInit(): void {
    this.addSubscriptionsList(
      this.store
        .select(DisplaySettingSelector.selectorPointCloudSettingState)
        .subscribe((pointCloudSetting) => {
          if (pointCloudSetting) {
            this.highlightEdge = pointCloudSetting.highlightEdge;
            this.reflectionIntensity = pointCloudSetting.reflectionIntensity;
            this.elevation = pointCloudSetting.elevation;
            this.pointSize = pointCloudSetting.pointSize;

            this.data3DViewHelperService.applyPointCloudSettings();
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(DisplaySettingSelector.selectorXyzSettingState)
        .subscribe((xyzSetting) => {
          if (xyzSetting) {
            this.xyzMode = xyzSetting.xyzMode;
            this.useNezLabel = xyzSetting.useNezLabel;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(DisplaySettingSelector.selectorRestoreSavedState)
        .subscribe((restoreSetting) => {
          if (restoreSetting) {
            this.restoreSaved = restoreSetting.restoreSaved;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(DisplaySettingSelector.selectorStationLabelSettingState)
        .subscribe((stationLabelSetting) => {
          if (stationLabelSetting) {
            this.showStationLabels = stationLabelSetting.showStationLabels;
          }
        }),
    );
  }

  public onBackToModelList() {
    this.store.dispatch(
      Data3dViewWideAction.SetShowDisplaySettingAction({
        showDisplaySetting: false,
      }),
    );
  }

  public onToggleHighlightEdge() {
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        pointCloudSetting: {
          highlightEdge: !this.highlightEdge,
          reflectionIntensity: this.reflectionIntensity,
          elevation: this.elevation,
          pointSize: this.pointSize,
        },
      }),
    );
  }

  public onToggleReflectionIntensity() {
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        pointCloudSetting: {
          highlightEdge: this.highlightEdge,
          reflectionIntensity: !this.reflectionIntensity,
          elevation: false,
          pointSize: this.pointSize,
        },
      }),
    );
  }

  public onToggleElevation() {
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        pointCloudSetting: {
          highlightEdge: this.highlightEdge,
          reflectionIntensity: false,
          elevation: !this.elevation,
          pointSize: this.pointSize,
        },
      }),
    );
  }

  public onToggleRestoreSaved() {
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        restoreSetting: {
          restoreSaved: !this.restoreSaved,
        },
      }),
    );
  }

  public onChangePointSize(event: Event) {
    const customEvent = event as CustomEvent;
    const newValue: number = customEvent.detail;

    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        pointCloudSetting: {
          highlightEdge: this.highlightEdge,
          reflectionIntensity: this.reflectionIntensity,
          elevation: this.elevation,
          pointSize: newValue,
        },
      }),
    );
  }

  public onToggleCoordinateMode() {
    const _xyzMode = !this.xyzMode;
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        xyzSetting: {
          xyzMode: _xyzMode,
          useNezLabel: !_xyzMode,
        },
      }),
    );
  }

  public onToggleUseNezLabel() {
    const _useNezLabel = !this.useNezLabel;
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        xyzSetting: {
          xyzMode: !_useNezLabel,
          useNezLabel: _useNezLabel,
        },
      }),
    );
  }

  /**
   * 測点ラベル表示の切り替え
   */
  public onToggleStationLabels(): void {
    this.store.dispatch(
      DisplaySettingAction.SetLocalStorageAction({
        stationLabelSetting: {
          showStationLabels: !this.showStationLabels,
        },
      }),
    );
  }

  /**
   * 書式設定ボタンクリック（測点設定画面を開く）
   */
  public onOpenStationFormatSettings(): void {
    // 右パネルに測点設定を表示（オーバーフロー表示エリア）
    this.store.dispatch(
      AreaDisplayControlAction.ShowOverFlowRightAreaAction({
        command: NtCommand.StationSettings,
        fromProperty: false,
        closeRightArea: false,
      }),
    );
  }
}
