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
import { BaseImageModule } from '@nikon-trimble-sok/parts-components';
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
import { DirectivesModule } from '@nikon-trimble-sok/common';
import { BasicListFileModule } from 'src/app/parts-components/basic-list-file/basic-list-file.module';
import { BasicMessageModule } from '@nikon-trimble-sok/parts-components';
import { BasicModalModule } from 'src/app/parts-components/basic-modal/basic-modal.module';
import { ColorPickerModule } from 'ngx-color-picker';
import { ConstructionHistoryEditModalComponent } from './construction-history/edit/construction-history.component';
import { AccordionService } from '../data-3d-view/parts/right-panel/accordion-panel/accordion-panel.service';
import { ConstructionHistoryConfirmationModalComponent } from './construction-history/confirmation/confirmation.component';
import { PdfViewerModalComponent } from './pdfviewer/pdfviewer.component';
import { PdfViewerModule } from 'ng2-pdf-viewer';

//所属するコンポーネント
const COMPONENTS = [
  ConstructionHistoryConfirmationModalComponent,
  ConstructionHistoryEditModalComponent,
  PdfViewerModalComponent,
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
    DirectivesModule,
    BasicMessageModule,
    BasicModalModule,
    ColorPickerModule,
    PdfViewerModule,
  ],
  providers: [AccordionService],
})
export class NTCCommonPartsModule {}
