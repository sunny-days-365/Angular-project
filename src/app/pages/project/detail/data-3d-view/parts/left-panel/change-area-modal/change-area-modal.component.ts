import { Component, OnInit, ViewChild } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { ModusModal } from '@trimble-oss/modus-angular-components';
import { LatLng } from 'leaflet';
import { Observable, firstValueFrom } from 'rxjs';
import { MapLayerEnum } from 'src/app/helper-utility/api-helper/projects-models';
import { NtcProject } from 'src/app/helper-utility/api-helper/projects-models';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { NtcMapComponent } from 'src/app/parts-components/map-base-component/part/map/map.component';
import { ProjectStateAction } from 'src/app/stores/actions/project/project-state.action';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-change-area-modal',
  templateUrl: './change-area-modal.component.html',
  styleUrls: ['./change-area-modal.component.scss'],
})
export class ChangeAreaModalComponent extends BaseComponent implements OnInit {
  @ViewChild('changeAreaModal') changeAreaModal: ModusModal | undefined;

  @ViewChild('areaMap') areaMap: NtcMapComponent | undefined;

  isInitialized: boolean = false;

  isDrew$: Observable<boolean | undefined> | undefined;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ChangeAreaModalComponent');
  }

  ngOnInit(): void {
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ProjectStateAction.GetProjectDetailActionComplete))
        .subscribe(() => {
          this.showProjectArea(true);
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            ProjectStateAction.UpdateProjectAreaActionError,
            ProjectStateAction.UpdateProjectAreaActionComplete,
            ProjectStateAction.RemoveProjectAreaActionError,
            ProjectStateAction.RemoveProjectAreaActionComplete,
          ),
        )
        .subscribe(() => {
          this.closePopup();
        }),
    );
  }

  private getProjectGeometry(projectDetail: NtcProject | undefined) {
    if (projectDetail && projectDetail.address?.geometry) {
      return JSON.parse(projectDetail.address?.geometry);
    }
    return null;
  }

  private setAreaMapConfig(hasArea: boolean = true) {
    if (this.areaMap) {
      this.areaMap.shapeControl?.setLayerSettingItem('ADD_AREA', {
        disable: false,
      });
      this.areaMap.shapeControl?.setLayerSettingItem('REMOVE_AREA', {
        disable: !hasArea,
      });

      this.areaMap.layerControl?.setMapItemDisabled(
        MapLayerEnum.PROJECT_AREA,
        !hasArea,
      );
    }
  }

  private async showProjectArea(forceUpdateMapConfig: boolean = false) {
    if (!this.areaMap) return;

    const projectDetail = await firstValueFrom(
      this.store.pipe(select(ApplicationStateSelector.selectorProjectDetail)),
    );

    this.areaMap.drawingService?.clearLayers();

    const projectGeometry = this.getProjectGeometry(projectDetail);

    if (forceUpdateMapConfig) {
      this.setAreaMapConfig(!!projectGeometry);
    }

    if (projectGeometry) {
      this.areaMap.drawingService.addProjectAreaLayer(projectGeometry);

      this.areaMap.setProjectAreaLocation(projectGeometry);

      // From the second opening, we need to show or hidden depending on the checked state of the area
      const needHidden =
        this.isInitialized && // the second opening
        !this.areaMap.layerControl?.getMapItem(MapLayerEnum.PROJECT_AREA)
          ?.checked; // the checked state

      if (needHidden) {
        this.areaMap.drawingService.hiddenProjectAreaLayer();
      }

      // Set boundary, area status when first opened
      if (!this.isInitialized) {
        const bounds = this.areaMap.mapService.getBounds(projectGeometry);
        this.areaMap.mapService.fitBounds(bounds);
        this.setAreaMapConfig(!!projectGeometry);

        this.isInitialized = true;
      }
    } else {
      this.setAreaMapConfig(false);
    }
  }

  protected openPopup() {
    this.changeAreaModal?.open();
    this.areaMap?.drawingService.clearDrawingState();
    this.showProjectArea();
    this.areaMap?.initializeMap();
    this.isDrew$ = this.areaMap?.drawingService.isDrew$;
  }

  protected closePopup() {
    this.changeAreaModal?.close();
  }

  protected handleOk() {
    if (this.areaMap) {
      const rectangleLayer = this.areaMap.drawingService.getAreaDrawn();

      if (rectangleLayer) {
        const geometry = rectangleLayer.getLatLngs()[0] as LatLng[];
        const geometryConverted = geometry.map((item) => {
          return [item.lat, item.lng];
        });

        const layerUrl = this.areaMap.mapService.getBaseMapLayer();

        this.store.dispatch(
          ProjectStateAction.UpdateProjectAreaAction({
            geometry: JSON.stringify(geometryConverted),
            url: layerUrl,
          }),
        );
      } else {
        this.store.dispatch(ProjectStateAction.RemoveProjectAreaAction());
      }
    }
  }

  public open() {
    this.openPopup();
  }

  public close() {
    this.closePopup();
  }
}
