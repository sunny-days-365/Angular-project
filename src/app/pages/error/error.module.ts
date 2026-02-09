import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PagesErrorComponent } from './error.component';
import { PushPipe, LetDirective } from '@ngrx/component';
import { ModusWrapperModule } from '@nikon-trimble-sok/modus-wrapper';
import { BasicLoadingIndicatorModule } from '@nikon-trimble-sok/parts-components';
import { ModusAngularComponentsModule } from '@trimble-oss/modus-angular-components';
import { NTCloudStoreModule } from 'src/app/stores/nt-cloud-store.module';
import { DirectivesModule } from '@nikon-trimble-sok/common';

const COMPONENTS = [PagesErrorComponent];
export const routes: Routes = [
  {
    path: '400',
    component: PagesErrorComponent,
    data: { code: '400' },
  },
  {
    path: '401',
    component: PagesErrorComponent,
    data: { code: '401' },
  },
  {
    path: '404',
    component: PagesErrorComponent,
    data: { code: '404' },
  },
  {
    path: '500',
    component: PagesErrorComponent,
    data: { code: '500' },
  },
  {
    path: '503',
    component: PagesErrorComponent,
    data: { code: '503' },
  },
  {
    path: '**',
    component: PagesErrorComponent,
  },
];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),

    PushPipe,
    NTCloudStoreModule,
    LetDirective,

    ModusWrapperModule,
    BasicLoadingIndicatorModule,

    DirectivesModule,
    ModusAngularComponentsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [...COMPONENTS],
})
export class PagesErrorComponentModule {}
