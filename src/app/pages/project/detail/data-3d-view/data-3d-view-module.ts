import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule as ngFormsModule,
} from '@angular/forms';
import { LetDirective, PushPipe } from '@ngrx/component';
import { ModusAngularComponentsModule } from '@trimble-oss/modus-angular-components';

import { ModusWrapperModule } from '@nikon-trimble-sok/modus-wrapper';
import { BaseDrawerModule } from 'src/app/parts-components/base-drawer/base-drawer.module';
import {
  BaseImageModule,
  DropdownButtonModule,
} from '@nikon-trimble-sok/parts-components';
import { BasicAlertModule } from '@nikon-trimble-sok/parts-components';
import { BasicBreadcrumbsModule } from 'src/app/parts-components/basic-breadcrumb/basic-breadcrumb.module';
import { BaseRangeInputModule } from '@nikon-trimble-sok/parts-components';
import { BasicDropzoneModule } from 'src/app/parts-components/basic-dropzone/basic-dropzone.module';
import { BasicFormControlModule } from '@nikon-trimble-sok/parts-components';
import { BasicLoadingIndicatorModule } from '@nikon-trimble-sok/parts-components';
import { BasicMoreActionModule } from 'src/app/parts-components/basic-more-action/basic-more-action.module';
import { MapBaseModule } from 'src/app/parts-components/map-base-component/map-base-component.module';
import { PipeModule } from '@nikon-trimble-sok/parts-components';
import { NTCloudStoreModule } from 'src/app/stores/nt-cloud-store.module';

import { Data3dViewComponent } from './data-3d-view.component';
import { ChangeAreaModalComponent } from './parts/left-panel/change-area-modal/change-area-modal.component';
import { FileTreeViewComponent } from './parts/left-panel/file-tree-view/file-tree-view.component';
import { DisplayModeDropdownComponent } from './parts/left-panel/file-tree-view/parts/display-mode-dropdown/display-mode-dropdown.component';
import { PointListPanelComponent } from './parts/left-panel/point-list-panel/point-list-panel.component';
import { DisplaySettingComponent } from './parts/left-panel/display-setting/display-setting.component';
import { AccordionListFileComponent } from './parts/left-panel/file-tree-view/parts/accordion-list-file/accordion-list-file.component';
import { AccordionPanelComponent } from './parts/right-panel/accordion-panel/accordion-panel.component';
import { AccordionService } from './parts/right-panel/accordion-panel/accordion-panel.service';
import { CrossSectionalComponent } from './parts/right-panel/command/cross-section/cross-sectional/cross-sectional.component';
import { ClassifiedPointCloudComponent } from './parts/right-panel/command/point-cloud/classification/classification.component';
import { ThinningOutComponent } from './parts/right-panel/command/point-cloud/thinning-out/thinning-out.component';
import { EarthwordNumberCalculationComponent } from './parts/right-panel/command/report/earthword-number-calculation/earthword-number-calculation.component';
import { FormReportComponent } from './parts/right-panel/command/report/form-report/form-report.component';
import { VolumeCalculationComponent } from './parts/right-panel/command/report/volume-calculation/volume-calculation.component';
import { CustomConstructionHistoryComponent } from './parts/right-panel/command/wos-wm-link/custom-construction-history/custom-construction-history.component';
import { Property3DViewComponent } from './parts/right-panel/model-property/model-property.component';
import { ContentDetailComponent } from './parts/right-panel/model-property/parts/content-detail/content-detail.component';
import { DetailThumbnailComponent } from './parts/right-panel/model-property/parts/detail-thumbnail/detail-thumbnail.component';
import { AddCommentViewComponent } from './parts/right-panel/model-property/parts/file-comment-view/add-comment-view/add-comment-view.component';
import { DeleteCommentViewComponent } from './parts/right-panel/model-property/parts/file-comment-view/delete-comment-view/delete-comment-view.component';
import { EditCommentViewComponent } from './parts/right-panel/model-property/parts/file-comment-view/edit-comment-view/edit-comment-view.component';
import { File3DCommentViewComponent } from './parts/right-panel/model-property/parts/file-comment-view/file-comment-view.component';
import { FormCommentViewComponent } from './parts/right-panel/model-property/parts/file-comment-view/form-comment/form-comment.component';
import { FormEditFile3dComponent } from './parts/right-panel/model-property/parts/form-edit/form-edit.component';
import { RightNavbar3DComponent } from './parts/right-panel/navbar/navbar.component';
import { CrossSectionViewComponent } from './parts/under-panel/cross-section/cross-section-view/cross-section-view.component';
import { CrossSetionalMeasurementComponent } from './parts/under-panel/cross-section/measurement/measurement.component';
import { BaseLineChartComponent } from './parts/under-panel/parts/base-line-chart/base-line-chart.component';
import { ArbitraryComponent } from './parts/under-panel/cross-section/arbitrary/arbitrary.component';
import { MoreActionsComponent } from './parts/under-panel/cross-section/arbitrary/actions-button/actions-button.component';

import { LiftSlicedSurfaceComponent } from './parts/right-panel/command/design-check/lift-slice/lift-slice.component';
import { SandInclinedSurfaceComponent } from './parts/right-panel/command/design-check/sand-inclined-surface/sand-inclined-surface.component';
import { SetBackComponent } from './parts/right-panel/command/design-check/set-back/set-back.component';
import { DirectivesModule } from '@nikon-trimble-sok/common';
import { BasicListFileModule } from 'src/app/parts-components/basic-list-file/basic-list-file.module';
import { TreeFileItemViewComponent } from './parts/left-panel/file-tree-view/parts/file-tree-item/file-tree-item.component';
import { FilterMultiSelectorComponent } from './parts/left-panel/file-tree-view/parts/multi-selector/multi-selector.component';
import { BasicMessageModule } from '@nikon-trimble-sok/parts-components';
import { BasicChipModule } from 'src/app/parts-components/basic-chip/basic-chip.module';
import { ExtensionAndContractionComponent } from './parts/right-panel/command/design-check/extension-and-contraction/extension-and-contraction.component';

import { MeasurementComponent } from './parts/right-panel/command/measurement/measurement.component';
import { MeasurementAreaComponent } from './parts/right-panel/command/measurement/area-view/area.component';
import { MeasurementDistanceComponent } from './parts/right-panel/command/measurement/distance-view/distance.component';
import { MeasurementVolumeComponent } from './parts/right-panel/command/measurement/volume-view/volume.component';
import { MeasurementTwoPointComponent } from './parts/right-panel/command/measurement/two-point-view/two-point.component';
import { MeasurementElevationDisparityComponent } from './parts/right-panel/command/measurement/elevation-disparity/elevation-disparity.component';

import { ExtractTargetComponent } from './parts/right-panel/command/point-cloud/extract-target/extract-target.component';
import { DensityCheckComponent } from './parts/right-panel/command/point-cloud/density-check/density-check.component';
import { GeoreferencingComponent } from './parts/right-panel/command/point-cloud/georeferencing/georeferencing.component';
import { CrossSectionalVerticalComponent } from './parts/under-panel/cross-section/vertical/vertical.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { ToolbarsComponent } from './parts/toolbars/toolbars.component';
import { RegistPointsCloudModalComponent } from './parts/right-panel/command/wos-wm-link/custom-construction-history/modal/regist-points-cloud/regist-points-cloud.component';
import { SaveFilterModalComponent } from './parts/right-panel/command/wos-wm-link/custom-construction-history/modal/save-filter/save-filter.component';
import { SendConstructionSettingComponent } from './parts/right-panel/command/construction-support/send-construction-setting/send-construction-setting.component';
import { NTCCommonPartsModule } from '../common-parts/common-parts-module';

import { FilterBarComponent } from './parts/left-panel/point-list-panel/parts/filter-bar/filter-bar.component';
import { MultiSelectorComponent } from './parts/left-panel/point-list-panel/parts/filter-bar/parts/multi-selector/multi-selector.component';
import { DateRangePickerComponent } from './parts/left-panel/point-list-panel/parts/filter-bar/parts/date-range-picker/date-range-picker.component';
import { SortMenuComponent } from './parts/left-panel/point-list-panel/parts/filter-bar/parts/sort-menu/sort-menu.component';
import { ListViewComponent } from './parts/left-panel/point-list-panel/parts/list-view/list-view.component';
import { ListItemComponent } from './parts/left-panel/point-list-panel/parts/list-view/list-item/list-item.component';
import { EditBarComponent } from './parts/left-panel/point-list-panel/parts/edit-bar/edit-bar.component';
import { DailyWorkProgressComponent } from './parts/right-panel/command/report/daily-work-progress/daily-work-progress.component';
import { BasicModalModule } from 'src/app/parts-components/basic-modal/basic-modal.module';

import { ExportComponent } from './parts/right-panel/export/export.component';
import { ConstructionTopographyComponent } from './parts/right-panel/construction-topography/construction-topography.component';
import { FolderBrowserComponent } from './parts/right-panel/export/parts/folder-browser/folder-browser.component';
import { Header3DViewComponent } from './parts/header-3d-view/header-3d-view.component';
import { RegistBoundaryComponent } from './parts/right-panel/command/design-check/regist-boundary/regist-boundary.component';
import { ImportPopupModule } from '../common-parts/import-popup-module';
import { SendConstructionSettingHistoryComponent } from './parts/right-panel/command/construction-support/send-construction-setting-history/send-construction-setting-history.component';
import { HeightChangeComponent } from './parts/right-panel/height-change/height-change.component';
import { LegendSettingsComponent } from './parts/right-panel/command/report/legend-settings/legend-settings.component';
import { LegendSettingsPanelColorComponent } from './parts/right-panel/command/report/legend-settings/parts/panel-color/legend-settings-panel-color.component';
import { StationSettingsComponent } from './parts/right-panel/command/station-settings/station-settings.component';

//所属するコンポーネント
const COMPONENTS = [
  // 3d-view関係
  Data3dViewComponent,
  FileTreeViewComponent,
  DisplayModeDropdownComponent,
  PointListPanelComponent,
  DisplaySettingComponent,
  CrossSectionViewComponent,

  Header3DViewComponent,

  // NTクラウドコマンド関係
  FormReportComponent,
  CrossSectionalComponent,
  EarthwordNumberCalculationComponent,
  VolumeCalculationComponent,
  DailyWorkProgressComponent,
  RegistPointsCloudModalComponent,
  SaveFilterModalComponent,
  LegendSettingsComponent,
  LegendSettingsPanelColorComponent,
  StationSettingsComponent,

  RightNavbar3DComponent,
  AccordionPanelComponent,
  AccordionListFileComponent,
  TreeFileItemViewComponent,
  FilterMultiSelectorComponent,

  ChangeAreaModalComponent,
  Property3DViewComponent,
  ContentDetailComponent,
  DetailThumbnailComponent,
  File3DCommentViewComponent,
  FormCommentViewComponent,
  EditCommentViewComponent,
  DeleteCommentViewComponent,
  AddCommentViewComponent,
  FormEditFile3dComponent,
  HeightChangeComponent,
  BaseLineChartComponent,

  ToolbarsComponent,

  // Measurement - チェック計算
  MeasurementComponent,
  MeasurementTwoPointComponent,
  MeasurementDistanceComponent,
  MeasurementAreaComponent,
  MeasurementVolumeComponent,
  MeasurementElevationDisparityComponent,

  // Cross Sectional
  ArbitraryComponent,
  CrossSetionalMeasurementComponent,
  CrossSectionalVerticalComponent,
  MoreActionsComponent,

  // Point Cloud
  GeoreferencingComponent,
  ClassifiedPointCloudComponent,
  ThinningOutComponent,
  DensityCheckComponent,
  ExtractTargetComponent,

  // Construction Support
  SandInclinedSurfaceComponent,
  SetBackComponent,
  LiftSlicedSurfaceComponent,
  ExtensionAndContractionComponent,
  RegistBoundaryComponent,
  // --
  CustomConstructionHistoryComponent,
  SendConstructionSettingComponent,
  SendConstructionSettingHistoryComponent,

  // PointListPanel
  FilterBarComponent,
  MultiSelectorComponent,
  DateRangePickerComponent,
  SortMenuComponent,
  ListViewComponent,
  ListItemComponent,
  EditBarComponent,

  // Export
  ExportComponent,
  ConstructionTopographyComponent,
  FolderBrowserComponent,
];

@NgModule({
  declarations: [...COMPONENTS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [...COMPONENTS],
  imports: [
    CommonModule,
    ngFormsModule,
    PushPipe,
    LetDirective,
    NTCloudStoreModule,
    ModusAngularComponentsModule,
    ReactiveFormsModule,
    ModusWrapperModule,
    BasicLoadingIndicatorModule,
    BasicAlertModule,
    BasicDropzoneModule,
    PipeModule,
    BasicMoreActionModule,
    BaseDrawerModule,
    MapBaseModule,
    BasicFormControlModule,
    BaseImageModule,
    BasicBreadcrumbsModule,
    PipeModule,
    BaseRangeInputModule,
    BasicMessageModule,
    BasicListFileModule,
    BasicChipModule,
    DirectivesModule,
    BasicMessageModule,
    BasicModalModule,
    ColorPickerModule,
    DropdownButtonModule,

    // 共通パーツモジュール
    NTCCommonPartsModule,

    // インポートモジュール
    ImportPopupModule,
  ],
  providers: [AccordionService],
})
export class Data3dViewModule {}
