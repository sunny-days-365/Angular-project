import { Routes } from '@angular/router';
import { ProjectOuterFrameComponent } from './detail/project-outer-frame/project-outer-frame.component';
import { NavbarOuterFrameComponent } from './navbar-outer-frame/navbar-outer-frame.component';

//import { ProjectListComponent } from './project-list/project-list.component';
import { LeftSideAreaComponent } from './detail/project-outer-frame/area/left-side-area/left-side-area.component';
import { MainAreaComponent } from './detail/project-outer-frame/area/main-area/main-area.component';
import { UnderMainAreaComponent } from './detail/project-outer-frame/area/under-main-area/under-main-area.component';
import { RightSideAreaComponent } from './detail/project-outer-frame/area/right-side-area/right-side-area.component';
import { AreaOuterFrameComponent } from './detail/project-outer-frame/area/area-outer-frame/area-outer-frame.component';
import { HeaderAreaComponent } from './detail/project-outer-frame/area/header-area/header-area.component';

export const routes: Routes = [
  {
    path: '**',
    component: NavbarOuterFrameComponent,
    // children: [
    //   // {
    //   //   path: ProjectListComponentPath,
    //   //   component: ProjectListComponent,
    //   // },
    //   {
    //     path: ProjectDetailPath,
    //     component: ProjectOuterFrameComponent,
    //     children: [
    //       {
    //         path: Data3DViewComponentPath,
    //         component: Data3dViewComponent,
    //       },
    //       {
    //         path: DashboardViewComponentPath,
    //         component: DashboardViewComponent,
    //       },
    //       {
    //         path: MapViewComponentPath,
    //         component: MapViewComponent,
    //       },
    //     ],
    //   },
    // ],
    // 画面遷移チェック
    //    canActivate: [canActivateToken],
  },
];

export const routedComponents = [
  NavbarOuterFrameComponent,
  ProjectOuterFrameComponent,
  //ProjectListComponent,

  // // 3d-view関係
  // Data3dViewComponent,
  // FileTreeViewComponent,
  // CrossSectionViewComponent,

  // 進捗確認関係
  // DashboardViewComponent,
  // ConstructionProgressComponent,
  // ProgressChartComponent,
  // ProgressHeatMapComponent,
  // TodoListComponent,
  // WeatherComponent,
  // ConstructionProgressListComponent,

  //地図関係
  //MapViewComponent,

  AreaOuterFrameComponent,
  LeftSideAreaComponent,
  MainAreaComponent,
  RightSideAreaComponent,
  UnderMainAreaComponent,
  HeaderAreaComponent,

  // // NTクラウドコマンド関係
  // FormReportComponent,
  // CrossSectionalComponent,
  // ClassificationComponent,
  // ThinningOutComponent,
  // ConstructionHistoryComponent,
  // LiftSliceComponent,
  // WosDesignComponent,
  // WosProjectComponent,
  // EarthwordNumberCalculationComponent,
  // VolumeCalculationComponent,
];
