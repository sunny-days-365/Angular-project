import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  FormsModule as ngFormsModule,
} from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LetDirective, PushPipe } from '@ngrx/component';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { DashboardViewComponent } from './dashboard-view.component';
import { ConstructionProgressComponent } from './parts/construction-progress/construction-progress.component';
import { ProgressChartComponent } from './parts/progress-chart/progress-chart.component';
import { ProgressHeatMapComponent } from './parts/progress-heat-map/progress-heat-map.component';
import { TodoListComponent } from './parts/todo-list/todo-list.component';
import { WeatherComponent } from './parts/weather/weather.component';
import { ConstructionProgressListComponent } from './parts/construction-progress-list/construction-progress-list.component';
import { NTCloudStoreModule } from 'src/app/stores/nt-cloud-store.module';
import { BasicLoadingIndicatorModule } from '@nikon-trimble-sok/parts-components';
import { BasicAlertModule } from '@nikon-trimble-sok/parts-components';
import { MapBaseModule } from 'src/app/parts-components/map-base-component/map-base-component.module';
import { ConstructionProgressWeekComponent } from './parts/construction-progress-week/construction-progress-week.component';
import { AngularSplitModule } from 'angular-split';
import { ModusWrapperModule } from '@nikon-trimble-sok/modus-wrapper';
import { BaseDrawerModule } from 'src/app/parts-components/base-drawer/base-drawer.module';
import { PipeModule } from '@nikon-trimble-sok/parts-components';
import { ConstructionWeekCardComponent } from './parts/construction-progress-week/parts/construction-week-card.component';
import { ActivitySettingsComponent } from './parts/activity-settings/activity-settings.component';
import { BasicFormControlModule } from '@nikon-trimble-sok/parts-components';
import { ActivitySettingsSaveActivityModalComponent } from './parts/activity-settings/modal/save-activity/save-activity.component';
import { BasicModalModule } from 'src/app/parts-components/basic-modal/basic-modal.module';
import { ActivitySettingsConfirmModalComponent } from './parts/activity-settings/modal/confirm/confirm.component';
import { BasicMessageModule } from '@nikon-trimble-sok/parts-components';
import { NTCCommonPartsModule } from '../common-parts/common-parts-module';
import { ConstructionProgressWeekChartComponent } from './parts/construction-progress-week/construction-progress-week-chart.component';
import { ConstructionWeekCardRangeChartComponent } from './parts/construction-progress-week/parts/construction-week-card-range-chart.component';
import { ConstructionWeekCardRangeAverageComponent } from './parts/construction-progress-week/parts/construction-week-card-range-average.component';

//所属するコンポーネント
const COMPONENTS = [
  DashboardViewComponent,
  ConstructionProgressComponent,
  ProgressChartComponent,
  ProgressHeatMapComponent,
  TodoListComponent,
  WeatherComponent,
  ConstructionProgressListComponent,
  ConstructionProgressWeekComponent,
  ConstructionWeekCardComponent,
  ConstructionProgressWeekChartComponent,
  ConstructionWeekCardRangeChartComponent,
  ConstructionWeekCardRangeAverageComponent,
  ActivitySettingsComponent,
  ActivitySettingsSaveActivityModalComponent,
  ActivitySettingsConfirmModalComponent,
];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    ngFormsModule,
    PushPipe,
    LeafletModule,
    LetDirective,
    NTCloudStoreModule,
    BasicLoadingIndicatorModule,
    BasicAlertModule,
    MapBaseModule,
    AngularSplitModule,
    ReactiveFormsModule,
    ModusWrapperModule,
    BaseDrawerModule,
    PipeModule,
    BasicFormControlModule,
    BasicModalModule,
    BasicMessageModule,

    // 共通パーツモジュール
    NTCCommonPartsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [...COMPONENTS],
})
export class DashboardViewModule {}
