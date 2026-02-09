import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LetDirective, PushPipe } from '@ngrx/component';
import { RouterModule, Routes } from '@angular/router';
import { NTCloudStoreModule } from 'src/app/stores/nt-cloud-store.module';
import { ModusWrapperModule } from '@nikon-trimble-sok/modus-wrapper';
import { BasicLoadingIndicatorModule } from '@nikon-trimble-sok/parts-components';
import { DirectivesModule } from '@nikon-trimble-sok/common';
import { ModusAngularComponentsModule } from '@trimble-oss/modus-angular-components';
import { EulaCheckComponent } from './eula-check.component';

const COMPONENTS = [EulaCheckComponent];
export const routes: Routes = [
  {
    path: '**',
    component: EulaCheckComponent,
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
export class EulaCheckComponentModule {}
