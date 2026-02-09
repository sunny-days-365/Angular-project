import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ImportPopupComponent } from './import-popup/import-popup.component';
import { ImportPopupStepSelectFileLocalComponent } from './import-popup/parts/step-select-file/local/local.component';
import { ImportPopupBreadCrumbComponent } from './import-popup/parts/bread-crumb/bread-crumb.component';
import { ImportPopupPanelColorComponent } from './import-popup/parts/panel-color/panel-color.component';
import { ImportPopupSettingImportPopupComponent } from './import-popup/parts/csv-column-setting/csv-column-setting.component';
import { ImportPopupStepConfirmationComponent } from './import-popup/parts/step-confirmation/step-confirmation.component';
import { ImportPopupStepSelectFileComponent } from './import-popup/parts/step-select-file/step-select-file.component';
import { ImportPopupStepSelectFileFileManagementComponent } from './import-popup/parts/step-select-file/file-management/file-management.component';
import { ImportPopupStepSelectFileSurveyControllerComponent } from './import-popup/parts/step-select-file/survey-controller/survey-controller.component';
import { ImportPopupStepSelectTypeComponent } from './import-popup/parts/step-select-type/step-select-type.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { BasicModalModule } from 'src/app/parts-components/basic-modal/basic-modal.module';
import { BasicMessageModule } from '@nikon-trimble-sok/parts-components';
import { DirectivesModule } from '@nikon-trimble-sok/common';
import { BasicListFileModule } from 'src/app/parts-components/basic-list-file/basic-list-file.module';
import { BaseRangeInputModule } from '@nikon-trimble-sok/parts-components';
import { PipeModule } from '@nikon-trimble-sok/parts-components';
import { BasicBreadcrumbsModule } from 'src/app/parts-components/basic-breadcrumb/basic-breadcrumb.module';
import { BaseImageModule } from '@nikon-trimble-sok/parts-components';
import { BasicFormControlModule } from '@nikon-trimble-sok/parts-components';
import { MapBaseModule } from 'src/app/parts-components/map-base-component/map-base-component.module';
import { BaseDrawerModule } from 'src/app/parts-components/base-drawer/base-drawer.module';
import { BasicMoreActionModule } from 'src/app/parts-components/basic-more-action/basic-more-action.module';
import { BasicDropzoneModule } from 'src/app/parts-components/basic-dropzone/basic-dropzone.module';
import { BasicAlertModule } from '@nikon-trimble-sok/parts-components';
import { BasicLoadingIndicatorModule } from '@nikon-trimble-sok/parts-components';
import { ModusWrapperModule } from '@nikon-trimble-sok/modus-wrapper';
import {
  ReactiveFormsModule,
  FormsModule as ngFormsModule,
} from '@angular/forms';
import { ModusAngularComponentsModule } from '@trimble-oss/modus-angular-components';
import { NTCloudStoreModule } from 'src/app/stores/nt-cloud-store.module';
import { LetDirective, PushPipe } from '@ngrx/component';
import { CommonModule } from '@angular/common';
import { BasicTableModule } from 'src/app/parts-components/basic-table/basic-table.module';
import { ImportPopupUploadLocalUploadComponent } from './import-popup/parts/step-select-file/local/upload/upload.component';
import { ImportPopupStepConfirmationConfigComponent } from './import-popup/parts/step-confirmation/config/config.component';
import { ImportPopupStepImportComponent } from './import-popup/parts/step-import/step-import.component';
import { ImportPopupCsvPreviewComponent } from './import-popup/parts/csv-column-setting/csv-preview/csv-preview.component';
import { ImportAbortComponent } from './import-popup/parts/abort/abort.component';
import { ImportNotificationTitleComponent } from '../../../../parts-components/base-layout/navbar-outer-frame/parts/notification/notification-title.component';

//所属するコンポーネント
const COMPONENTS = [
  // Import Popup
  ImportPopupComponent,
  ImportPopupBreadCrumbComponent,
  ImportPopupPanelColorComponent,
  ImportPopupStepSelectTypeComponent,
  ImportPopupStepSelectFileComponent,
  ImportPopupStepSelectFileLocalComponent,
  ImportPopupStepSelectFileFileManagementComponent,
  ImportPopupStepSelectFileSurveyControllerComponent,
  ImportPopupUploadLocalUploadComponent,
  ImportPopupStepConfirmationComponent,
  ImportPopupSettingImportPopupComponent,
  ImportPopupStepConfirmationConfigComponent,
  ImportPopupStepImportComponent,
  ImportPopupCsvPreviewComponent,
  ImportAbortComponent,
  ImportNotificationTitleComponent,
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
    BasicTableModule,
  ],
  providers: [],
})
export class ImportPopupModule {}
