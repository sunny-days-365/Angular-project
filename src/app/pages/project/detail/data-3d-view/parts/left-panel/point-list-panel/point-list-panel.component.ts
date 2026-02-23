import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Component, ViewChild } from '@angular/core';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Data3dViewWideAction } from 'src/app/stores/actions/project/detail/data-3d-view/data-3d-view-wide.action';
import { PointListPanelSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/point-list-panel/point-list-panel.selector';
import { Model, Point } from '@nikon-trimble-sok/api-sdk-d3';
import { EditMode } from './point-list-panel.definition';
import { ListViewComponent } from './parts/list-view/list-view.component';
import { FileForView } from 'src/app/stores/states/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.state';
import { FileTreeViewSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.selector';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-point-list-panel-component',
  templateUrl: './point-list-panel.component.html',
  styleUrls: ['./point-list-panel.component.scss'],
})
export class PointListPanelComponent extends BaseComponent {
  public pointList: Point[] | undefined = [];
  public isLoading: boolean | undefined = false;
  public editMode: EditMode | undefined = undefined;

  public selectedPointIds: string[] = [];

  private pointListOrigin: Point[] = [];
  private modelList: Model[] = [];
  private fileList: FileForView[] = [];

  public files: (FileForView | undefined)[] = [];
  public objectIds: number[] = [];
  public checkedAll: boolean = false;

  @ViewChild('ListView') listViewComponent!: ListViewComponent;

  constructor(
    private store: Store<ApplicationState>,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('PointListPanelComponent');

    this.addSubscriptionsList(
      this.store
        .select(PointListPanelSelector.selectorIsLoading)
        .subscribe((isLoading) => {
          this.isLoading = isLoading;
        }),
    );
    this.addSubscriptionsList(
      this.store
        .select(FileTreeViewSelector.selectorClassifiedModel)
        .subscribe((models) => {
          this.modelList = models?.map((m) => m.rawData.models).flat() ?? [];
          this.fileList = models?.map((m) => m.modelForView).flat() ?? [];
        }),
    );
    this.addSubscriptionsList(
      this.store
        .select(PointListPanelSelector.selectorPointList)
        .subscribe((points) => {
          this.pointListOrigin = points ?? [];
        }),
    );
    this.addSubscriptionsList(
      this.store
        .select(PointListPanelSelector.selectorFilteredPoints)
        .subscribe((filteredPoints) => {
          this.pointList = filteredPoints;
          this.files =
            filteredPoints?.map((p) => {
              return this.fileList.find((f) => f.id === p.originalId);
            }) ?? [];
          this.objectIds =
            filteredPoints?.map((p) => {
              return this.pointListOrigin
                .filter((item) => item.originalId === p.originalId)
                .findIndex((x) => x.id === p.id);
            }) ?? [];
        }),
    );
  }

  public onBackToModelList() {
    this.store.dispatch(
      Data3dViewWideAction.SetShowPointListPanelAction({
        showPointListPanel: false,
      }),
    );
  }

  public handleEditBtnClicked() {
    if (!this.projectAccessControlService.isBasicAvailable()) {
      return;
    }
    if (this.editMode === undefined) {
      this.editMode = EditMode.Init;
    } else {
      this.editMode = undefined;
      this.selectedPointIds = [];
    }
  }

  public handleEditModeChange(mode: EditMode | undefined) {
    this.editMode = mode;
    this.selectedPointIds = [];
    this.listViewComponent.clearSelection();
  }

  public checkAll(check: boolean) {
    this.selectedPointIds = [];
    if (check === true) {
      this.pointList?.forEach((point) => {
        if (point.id) {
          this.selectedPointIds.push(point.id);
        }
      });
    }
    this.checkedAll = check;
    this.listViewComponent.checkAll(check);
  }
  onListSelectionChanged(indexes: string[]) {
    this.selectedPointIds = indexes;
    this.checkedAll = this.selectedPointIds.length === this.pointList?.length;
  }
}
