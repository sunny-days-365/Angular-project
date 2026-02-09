import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule as ngFormsModule } from '@angular/forms';
import { routedComponents, routes } from './project-routing.module';
import { RouterModule } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LetDirective, PushPipe } from '@ngrx/component';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { AngularSplitModule } from 'angular-split';
import { MapViewModule } from './detail/map-view/map-view.module';
import { DashboardViewModule } from './detail/dashboard-view/dashboard-view.module';
import { Data3dViewModule } from './detail/data-3d-view/data-3d-view-module';
//import { ProjectOuterFrameModule } from './detail/project-outer-frame/project-outer-frame.module';
import { NTCloudStoreModule } from 'src/app/stores/nt-cloud-store.module';
import { ModusStudyViewModule } from './detail/modus-study-view/modus-study-view-module';
import { ImageViewModule } from './detail/image-view/image-view.module';
import { TeamViewModule } from './detail/team-view/team-view.module';
import { FileViewModule } from './detail/file-view/file-view.module';
import { WorkViewModule } from './detail/work-view/work-view.module';
import { SettingViewModule } from './detail/setting-view/setting-view.module';

@NgModule({
  declarations: [...routedComponents],
  imports: [
    CommonModule,
    ngFormsModule,
    RouterModule.forChild(routes),
    PushPipe,
    LetDirective,
    LeafletModule,
    AngularSplitModule,
    NTCloudStoreModule,

    // 外枠
    //    ProjectOuterFrameModule,

    //関係する個別のモジュール
    Data3dViewModule,
    DashboardViewModule,
    MapViewModule,
    FileViewModule,

    //実装サンプル 後で消す
    ModusStudyViewModule,

    // 工事写真管理
    ImageViewModule,
    TeamViewModule,

    WorkViewModule,
    SettingViewModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProjectModule {}
