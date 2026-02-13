import { Observable } from 'rxjs';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { Store, select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import {
  ImportFrom,
  ImportFromEnum,
  ImportStep,
  ImportStepEnum,
  ImportType,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';
import { ImportPopupStepSelectTypeComponent } from './parts/step-select-type/step-select-type.component';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import { ImportPopupStepSelectFileComponent } from './parts/step-select-file/step-select-file.component';
import { ImportPopupStepConfirmationComponent } from './parts/step-confirmation/step-confirmation.component';
import { Actions, ofType } from '@ngrx/effects';
import {
  BACK_BUTTON_TEXT,
  CANCEL_BUTTON_ABORT_IMPORT_TEXT,
  NEXT_BUTTON_LAST_TEXT,
  NEXT_BUTTON_START_IMPORT_TEXT,
  NEXT_BUTTON_TEXT,
} from './import-popup.definition';
import { ImportPopupFromService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-from.service';
import { ImportPopupStepImportComponent } from './parts/step-import/step-import.component';
import { ImportService } from 'src/app/services/import/import.service';

@Component({
  selector: 'ntc-import-popup',
  templateUrl: './import-popup.component.html',
  styleUrls: ['./import-popup.component.scss'],
})
export class ImportPopupComponent
  extends BaseComponent
  implements AfterViewInit
{
  @Input() initialStep: ImportStepEnum | undefined;

  @Input() importType: ImportType | undefined;

  @Input() showTab: boolean = false;

  @ViewChild('modalImport') modalImport: BasicModalComponent | undefined;

  @ViewChild('selectType') selectType:
    | ImportPopupStepSelectTypeComponent
    | undefined;

  @ViewChild('selectFile') selectFile:
    | ImportPopupStepSelectFileComponent
    | undefined;

  @ViewChild('confirmImport') confirmImport:
    | ImportPopupStepConfirmationComponent
    | undefined;

  @ViewChild('import') import: ImportPopupStepImportComponent | undefined;

  public isLoading$: Observable<boolean | undefined>;

  public importFrom: ImportFrom = ImportFromEnum.Local;

  public currentStep: ImportStep | undefined;

  public importInProgress: boolean | undefined;

  public dimPopup: boolean = false;

  // ファイル管理でフォルダ選択中かどうか
  private folderSelected: boolean = false;

  // インポート処理中止可能かどうか
  private importProcessAbortable: boolean = false;

  get isSelectingType() {
    return this.currentStep === ImportStepEnum.Type;
  }

  get isSelectingFile() {
    return (
      this.currentStep === ImportStepEnum.File ||
      this.currentStep === ImportStepEnum.SelectSurveyController
    );
  }

  get isSelectingConfirmation() {
    return this.currentStep === ImportStepEnum.Confirmation;
  }

  get isSelectingImport() {
    return this.currentStep === ImportStepEnum.Import;
  }

  get currentComponentRef() {
    if (this.isSelectingType) {
      return this.selectType;
    } else if (this.isSelectingFile) {
      return this.selectFile;
    } else if (this.isSelectingConfirmation) {
      return this.confirmImport;
    } else if (this.isSelectingImport) {
      return this.import;
    }
    return undefined;
  }

  get centralizeButton() {
    return false;
  }

  get isDisableCancelButton() {
    return this.currentComponentRef?.isDisableCancelButton;
  }

  get isDisableNextButton() {
    return this.currentComponentRef?.isDisableNextButton;
  }

  get isDisableBackButton() {
    return this.isSelectingImport;
  }

  get cancelButtonText() {
    if (this.isSelectingImport) {
      if (this.importInProgress && this.importProcessAbortable) {
        return CANCEL_BUTTON_ABORT_IMPORT_TEXT;
      } else {
        return undefined;
      }
    }
    return undefined;
  }

  get nextButtonText() {
    if (this.isSelectingConfirmation) {
      return NEXT_BUTTON_START_IMPORT_TEXT;
    } else if (this.isSelectingImport) {
      return NEXT_BUTTON_LAST_TEXT;
    } else if (
      this.currentStep === ImportStepEnum.SelectSurveyController &&
      this.importFrom === ImportFromEnum.SurveyControl
    ) {
      return NEXT_BUTTON_TEXT;
    }
    return NEXT_BUTTON_TEXT;
  }

  get backButtonText() {
    if (this.isSelectingType || this.isSelectingImport) return undefined;
    if (this.initialStep) {
      switch (this.currentStep) {
        case ImportStepEnum.File:
          if (this.initialStep == ImportStepEnum.File) {
            return undefined;
          } else {
            return BACK_BUTTON_TEXT;
          }
        case ImportStepEnum.Confirmation:
          if (this.initialStep == ImportStepEnum.Confirmation) {
            return undefined;
          } else {
            return BACK_BUTTON_TEXT;
          }
      }
    }
    return BACK_BUTTON_TEXT;
  }

  get cancelButtonClass() {
    return 'borderless';
  }

  get cancelButtonColor() {
    if (this.isSelectingImport) {
      if (this.importInProgress) {
        return 'primary';
      } else {
        return 'secondary';
      }
    }
    return 'secondary';
  }

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private importPopupFromService: ImportPopupFromService,
    private cdRef: ChangeDetectorRef,
    private importService: ImportService,
  ) {
    super('ImportPopupComponent');

    this.isLoading$ = this.store.pipe(
      select(ImportPopupSelector.selectorActionInProcess),
    );

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorCurrentStep)
        .subscribe((step) => {
          if (step === ImportStepEnum.Type) {
            this.resetState();
          }
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

    this.addSubscriptionsList(
      this.actions$.pipe(ofType(ImportPopupAction.ClosePopup)).subscribe(() => {
        this.close();
      }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectImportInProgress)
        .subscribe((importInProgress) => {
          this.importInProgress = importInProgress;
        }),
    );

    //get folder selected
    this.addSubscriptionsList(
      this.store
        .pipe(select(ImportPopupSelector.selectorFolderSelected))
        .subscribe((item) => {
          this.folderSelected = !!item;
        }),
    );

    this.addSubscriptionsList(
      this.actions$.pipe(ofType(ImportPopupAction.DimPopup)).subscribe(() => {
        this.dimPopup = true;
      }),
    );

    this.addSubscriptionsList(
      this.actions$.pipe(ofType(ImportPopupAction.UnDimPopup)).subscribe(() => {
        this.dimPopup = false;
      }),
    );

    // インポート処理の状態変更検知
    this.addSubscriptionsList(
      this.importService.onChangeObservable$.subscribe(() => {
        const importAbortable = this.import?.isImportAbortable() ?? false;
        if (this.importProcessAbortable !== importAbortable) {
          this.cdRef.detectChanges();
        }
        this.importProcessAbortable = importAbortable;
      }),
    );
  }

  ngAfterViewInit(): void {
    this.open();
  }

  public onOk() {
    this.currentComponentRef?.onOk();
  }

  public onCancel() {
    this.currentComponentRef?.onCancel();
  }

  public onBack() {
    let newStep = ImportStepEnum.Type;

    if (this.currentStep === ImportStepEnum.SelectSurveyController) {
      newStep = ImportStepEnum.Type;
    } else if (this.isSelectingFile) {
      if (this.importFrom == ImportFromEnum.SurveyControl) {
        newStep = ImportStepEnum.SelectSurveyController;
        this.store.dispatch(
          ImportPopupAction.resetSelectedWMDeviceControllerFieldData(),
        );
      } else {
        newStep = ImportStepEnum.Type;
      }
    } else if (this.isSelectingConfirmation) {
      newStep = ImportStepEnum.File;
    }

    this.store.dispatch(
      ImportPopupAction.SetCurrentStep({
        step: newStep,
      }),
    );
  }

  // define public functions that will be exported via ViewChild
  public open(
    step?: ImportStepEnum,
    importFrom?: ImportFrom,
    showTab?: boolean,
  ) {
    if (step) {
      this.initialStep = step;
    }

    if (this.initialStep) {
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: this.initialStep,
        }),
      );
    } else {
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: ImportStepEnum.Type,
        }),
      );
    }

    if (importFrom) {
      this.importPopupFromService.upsert(() => ({
        value: importFrom,
      }));
      this.store.dispatch(
        ImportPopupAction.SetImportFrom({
          importFrom: importFrom,
        }),
      );
    }

    if (showTab !== undefined) {
      this.showTab = showTab;
    }

    // フォルダ選択中はリセットしない
    if (!this.folderSelected) {
      this.store.dispatch(
        ImportPopupAction.GetFileListViewAction({
          folderId: undefined,
        }),
      );
    }

    this.selectType?.open();
    this.modalImport?.open();
  }

  public close() {
    this.modalImport?.close();
  }

  handleUploadPointCloudDone() {
    this.close();
  }

  resetState() {
    this.store.dispatch(
      ImportPopupAction.SetListFileSelected({
        fileSelectedList: [],
      }),
    );
    this.store.dispatch(
      ImportPopupAction.SetListFieldDataSelected({
        fieldDataSelectedList: [],
      }),
    );
    // フォルダ選択中はリセットしない
    if (!this.folderSelected) {
      this.store.dispatch(ImportPopupAction.ResetSelectedList());
    }
    this.store.dispatch(ImportPopupAction.ResetSelectedWMDeviceController());
    this.store.dispatch(ImportPopupAction.ResetListNTCFieldDataSelected());
    this.store.dispatch(ImportPopupAction.SetUploadFileFileOnly({ files: [] }));
    this.store.dispatch(ImportPopupAction.ResetImportState());
  }
}
