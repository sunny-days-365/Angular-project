import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { MapBaseComponent } from 'src/app/parts-components/map-base-component/map-base-component';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';
import { NtcMapComponent } from 'src/app/parts-components/map-base-component/part/map/map.component';
import { WorkViewMainPanelSelector } from 'src/app/stores/selectors/project/detail/work-view/main-panel/main-panel.selector';
import { Heatmap, HeatmapsService } from '@nikon-trimble-sok/api-sdk-d3';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { combineLatest, distinctUntilChanged } from 'rxjs';
import { MapLayerEnum } from 'src/app/helper-utility/api-helper/projects-models';
import { MapLayerControlLayerModel } from 'src/app/parts-components/map-base-component/map-layer-control.model';
import { MapLayerControlStorageLayerService } from 'src/app/parts-components/map-base-component/services/map-layer-control-storage-layer.service';
import { HeatmapAction } from 'src/app/stores/actions/project/detail/work-view/main-panel/heatmap/heatmap.action';
import { ProjectListSelector } from 'src/app/stores/selectors/project-list/ProjectListState.selector';
import { Location } from '@nikon-trimble-sok/api-sdk-d3';

@Component({
  selector: 'ntc-project-project-dashboard-view-project-progress-heat-map',
  templateUrl: './progress-heat-map.component.html',
  styleUrls: ['./progress-heat-map.component.scss'],
  providers: [Title],
})
//implements AfterViewInit
export class ProgressHeatMapComponent
  extends MapBaseComponent
  implements OnDestroy
{
  @ViewChild('map') baseMap: NtcMapComponent | undefined;

  isSidebarExpanded: boolean = false;

  private storedMapLayerControlLayerModel:
    | MapLayerControlLayerModel
    | undefined;

  private isMapInitialized: boolean = false;

  private isProjectAreaInitialized: boolean = false;

  private projectBoundary: Location[] | undefined;

  private projectAreaBounds: L.LatLngBounds | undefined;

  private heatMap: Heatmap | undefined;

  private heatMapBounds: L.LatLngBounds | undefined;

  private intersectionObserver: IntersectionObserver | undefined;

  constructor(
    private store: Store<ApplicationState>,
    private heatmapsService: HeatmapsService,
    private mapLayerControlStorageLayerService: MapLayerControlStorageLayerService,
    private elementRef: ElementRef,
  ) {
    super('ProgressHeatMapComponent');

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectId)
        .subscribe(() => {
          this.store.dispatch(HeatmapAction.GetConstruction());
        }),
    );

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ApplicationStateSelector.selectorProjectId),
        this.store.select(WorkViewMainPanelSelector.ConstructionProgress),
        this.store.select(ProjectListSelector.selectorProjectBoundary),
      ])
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return (
              (!curr[0] ||
                !curr[1] ||
                (prev[0] === curr[0] && prev[1] === curr[1])) &&
              this.isArrayEqual(prev[2], curr[2])
            );
          }),
        )
        .subscribe(async (value) => {
          this.baseMap?.initializeMap();

          // if (value[2] && value[1]) {
          //   this.showProjectArea(value[2]);
          // }

          if (value[0]) {
            // ストレージからレイヤーのチェック状態取得
            this.mapLayerControlStorageLayerService.setProjectId(value[0]);
            this.storedMapLayerControlLayerModel =
              mapLayerControlStorageLayerService.get();
          }

          const listProgress = value[1] ? Object.values(value[1]) : [];
          this.projectBoundary = value[2];
          this.heatMap = listProgress[listProgress.length - 1][0];

          // 別途初期化済みの場合のみ（データの変更があった時）、再度初期化を行う
          if (this.isMapInitialized) {
            this.initializeMap(this.projectBoundary, this.heatMap);
          }
        }),
    );

    // このコンポーネントの可視状態を監視
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // マップ初期化
        this.initializeMap(this.projectBoundary, this.heatMap);
      });
    });
    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  public override ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    super.ngOnDestroy();
  }

  /**
   * マップ初期化
   */
  private async initializeMap(
    projectBoundary: Location[] | undefined,
    heatMapObj: Heatmap | undefined,
  ) {
    // 現場エリア表示
    await this.showProjectArea(projectBoundary);
    // ヒートマップ表示
    this.showHeatMap(heatMapObj);

    // ヒートマップ優先でフォーカス
    const bounds = this.heatMapBounds
      ? this.heatMapBounds
      : this.projectAreaBounds
        ? this.projectAreaBounds
        : undefined;
    if (bounds) {
      this.baseMap?.mapService.fitBounds(bounds);
    }

    // subscriptionからの無用な初期化を避ける為のフラグ
    this.isMapInitialized = true;
  }

  /**
   * 現場エリア描画
   */
  private async showProjectArea(projectBoundary: Location[] | undefined) {
    if (!this.baseMap) {
      return;
    }

    if (!projectBoundary) {
      this.setAreaMapConfig(MapLayerEnum.PROJECT_AREA, false);
      return;
    }

    this.baseMap.drawingService?.clearLayers();

    // 現場のエリア
    const projectGeometry = projectBoundary?.map((item: Location) => [
      item?.lat,
      item?.lng,
    ]);

    if (!projectGeometry) {
      this.setAreaMapConfig(MapLayerEnum.PROJECT_AREA, false);
      return;
    }

    this.baseMap.drawingService.addProjectAreaLayer(
      projectGeometry as L.LatLngTuple[],
    );

    this.baseMap.setProjectAreaLocation(projectGeometry as L.LatLngTuple[]);

    // 2つ目のopenから、エリアのチェック状態に応じて表示または非表示にする必要がある。
    const needHidden =
      this.isProjectAreaInitialized && // the second opening
      !this.baseMap.layerControl?.getMapItem(MapLayerEnum.PROJECT_AREA)
        ?.checked; // the checked state

    if (needHidden) {
      this.baseMap.drawingService.hiddenProjectAreaLayer();
    }

    // バウンダリーの設定、初回オープン時のエリアの状態
    this.projectAreaBounds = this.baseMap.mapService.getBounds(
      projectGeometry as L.LatLngTuple[],
    );
    this.setAreaMapConfig(MapLayerEnum.PROJECT_AREA, true);

    // 初回オープンかどうか
    if (!this.isProjectAreaInitialized) {
      this.isProjectAreaInitialized = true;
    }
  }

  /**
   * ヒートマップ描画
   */
  private showHeatMap(heatMapObj: Heatmap | undefined) {
    if (!this.baseMap) {
      return;
    }

    this.baseMap.mapService.removeHeatmapLayer();

    if (!heatMapObj || !heatMapObj.id || !heatMapObj.heatmapUrl) {
      this.setHeatmapStatus(false);
      return;
    }

    const { leftTop, rightTop, rightBottom, leftBottom } = heatMapObj;

    this.heatMapBounds = this.baseMap?.mapService.getBounds([
      [leftTop?.lat ?? 0, leftTop?.lng ?? 0],
      [rightTop?.lat ?? 0, rightTop?.lng ?? 0],
      [rightBottom?.lat ?? 0, rightBottom?.lng ?? 0],
      [leftBottom?.lat ?? 0, leftBottom?.lng ?? 0],
    ]);
    this.baseMap.mapService.addHeatmapLayer(
      heatMapObj.heatmapUrl,
      this.heatMapBounds,
      0,
    );
    this.setHeatmapStatus(true);
  }

  private setHeatmapStatus(enabled: boolean) {
    // We need to enable checkbox before setting the value
    if (this.baseMap) {
      this.baseMap.layerControl?.setMapItemHidden(MapLayerEnum.HEAT_MAP, false);
      if (enabled) {
        this.baseMap.layerControl?.setMapItemDisabled(
          MapLayerEnum.HEAT_MAP,
          false,
        );
      } else {
        this.baseMap.layerControl?.setMapItemDisabled(
          MapLayerEnum.HEAT_MAP,
          true,
        );
      }
    }
  }

  private setAreaMapConfig(layerId: MapLayerEnum, hasArea: boolean = true) {
    if (this.baseMap) {
      this.baseMap.layerControl?.setMapItemDisabled(layerId, !hasArea);
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
      if (JSON.stringify(array1[i]) !== JSON.stringify(array2[i])) return false;
    }
    return true;
  }
}
