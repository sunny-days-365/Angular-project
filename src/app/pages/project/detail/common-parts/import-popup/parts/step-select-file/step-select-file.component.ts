import { Component, Input, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  ImportFrom,
  ImportFromEnum,
  ImportStep,
  ImportStepEnum,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';
import { ImportPopupStepSelectFileLocalComponent } from './local/local.component';
import { NtcFolderEntry } from 'src/app/stores/states/project/detail/file-view/file-view.state';
import {
  AUTOCAD_EXTENSIONS,
  CAD_BOUNDARY_OR_FILES_EXTENSIONS,
  CORRIDOR_EXTENSIONS,
  JOB_XML_EXTENSIONS,
  POINT_CLOUD_EXTENSIONS,
  POINT_CSV_OR_POINT_CLOUD_CSV_EXTENSIONS,
  ZIP_EXTENSIONS,
} from '../../import-popup.definition';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { WMDeviceData } from '@nikon-trimble-sok/api-sdk-d3';
import { ImportPopupFromService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-from.service';
import { ImportPopupStepSelectFileFileManagementComponent } from './file-management/file-management.component';
import { ImportPopupStepSelectFileSurveyControllerComponent } from './survey-controller/survey-controller.component';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';

@Component({
  selector: 'ntc-import-popup-step-select-file',
  templateUrl: './step-select-file.component.html',
  styleUrls: ['./step-select-file.component.scss'],
})
export class ImportPopupStepSelectFileComponent extends BaseComponent {
  @Input() showTab: boolean = true;

  @ViewChild('local') localUploadComponent:
    | ImportPopupStepSelectFileLocalComponent
    | undefined;

  @ViewChild('fileManage') fileManageComponent:
    | ImportPopupStepSelectFileFileManagementComponent
    | undefined;

  @ViewChild('surveyControl') surveyControl:
    | ImportPopupStepSelectFileSurveyControllerComponent
    | undefined;

  public fileAcceptExtensionList: string[] = [];

  readonly ImportFromEnum = ImportFromEnum;

  public importFrom: ImportFrom = ImportFromEnum.Local;

  readonly ImportStepEnum = ImportStepEnum;

  public currentStep: ImportStep | undefined;

  public selectedSurveyControllerData: WMDeviceData | undefined;

  public surveyControllerImgSrc = '/assets/img/setting/localize_type_03.svg';

  get currentComponentRef() {
    if (this.importFrom === ImportFromEnum.Local) {
      return this.localUploadComponent;
    } else if (
      this.importFrom === ImportFromEnum.FileManage ||
      (this.currentStep === ImportStepEnum.File &&
        this.importFrom === ImportFromEnum.SurveyControl)
    ) {
      return this.fileManageComponent;
    } else if (
      this.currentStep === ImportStepEnum.SelectSurveyController &&
      this.importFrom === ImportFromEnum.SurveyControl
    ) {
      return this.surveyControl;
    }

    return undefined;
  }

  get isDisableCancelButton() {
    return true;
  }

  get isDisableNextButton() {
    return this.currentComponentRef?.isDisableNextButton;
  }

  constructor(
    private store: Store<ApplicationState>,
    private importPopupFromService: ImportPopupFromService,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('ImportPopupStepSelectFileComponent');

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorCurrentStep)
        .subscribe((step) => {
          this.currentStep = step;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorImportFrom)
        .subscribe((importFrom) => {
          this.importFrom = importFrom ?? ImportFromEnum.Local;
        }),
    );

    // 権限に応じてインポート可能なファイル拡張子を変更
    this.addSubscriptionsList(
      this.projectAccessControlService.onChangeObservable$.subscribe(() => {
        this.fileAcceptExtensionList = [];
        if (this.projectAccessControlService.isBasicAvailable()) {
          this.fileAcceptExtensionList = this.fileAcceptExtensionList
            .concat(AUTOCAD_EXTENSIONS)
            .concat(CAD_BOUNDARY_OR_FILES_EXTENSIONS)
            .concat(POINT_CSV_OR_POINT_CLOUD_CSV_EXTENSIONS)
            .concat(ZIP_EXTENSIONS)
            .concat(CORRIDOR_EXTENSIONS)
            .concat(JOB_XML_EXTENSIONS);
        }
        if (this.projectAccessControlService.isPointCloudAvailable()) {
          this.fileAcceptExtensionList = this.fileAcceptExtensionList.concat(
            POINT_CLOUD_EXTENSIONS,
          );
        }
      }),
    );
  }

  onChangeTabs(importFrom: ImportFrom) {
    this.importFrom = importFrom;
    // store current value
    this.importPopupFromService.upsert(() => ({
      value: this.importFrom,
    }));
    this.store.dispatch(
      ImportPopupAction.SetImportFrom({
        importFrom: this.importFrom,
      }),
    );
  }

  onFileChange(files: NtcFolderEntry[]) {
    this.store.dispatch(
      ImportPopupAction.SetListFileSelected({
        fileSelectedList: files,
      }),
    );
  }

  onOk() {
    // save selected files from tree and locally to store, it will be showed on preview screen
    this.currentComponentRef?.saveUploadDataToStore();

    // 測量用コントローラ選択時は別ルート
    if (
      this.currentStep == ImportStepEnum.SelectSurveyController &&
      this.importFrom == ImportFromEnum.SurveyControl
    ) {
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: ImportStepEnum.File,
        }),
      );
    } else {
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: ImportStepEnum.Confirmation,
        }),
      );
    }
  }

  onCancel() {}

  handleSurveyControlDataFromChild(data: WMDeviceData) {
    this.selectedSurveyControllerData = data;
  }
}
