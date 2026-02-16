import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ImportPopupUploadLocalUploadComponent } from './upload/upload.component';
import { Store } from '@ngrx/store';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Actions, ofType } from '@ngrx/effects';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import {
  isValidFileExtensionAllowed,
  isValidFileSize,
} from 'src/app/helper-utility/file-helper/file-helper';
import { NtcFolderEntry } from 'src/app/stores/states/project/detail/file-view/file-view.state';
import { NtcModusSelectComponentOptionType } from '@nikon-trimble-sok/modus-wrapper';

@Component({
  selector: 'ntc-import-popup-step-select-file-local',
  templateUrl: './local.component.html',
  styleUrls: ['./local.component.scss'],
})
export class ImportPopupStepSelectFileLocalComponent
  extends BaseComponent
  implements AfterViewInit
{
  @Input()
  public selectorClass: string = '';

  @Input()
  public fileAcceptExtensionList: string[] = [];

  @ViewChild('uploadFile') uploadFile:
    | ImportPopupUploadLocalUploadComponent
    | undefined;

  public readonly NtCommandImportViewMode = {
    local: 1,
    fileManagement: 2,
  };

  public files: File[] = [];

  public selectedFilesFromTree: NtcFolderEntry[] = [];

  public projectId: string | undefined;

  public isError: boolean = false;

  public inProgress: boolean | undefined;

  public folderId: string | null | undefined;

  public isResetData: boolean = true;

  public isDisabledUploadError: boolean = false;

  public assignmentActive: Record<string, NtcModusSelectComponentOptionType> =
    {};

  public importColorActive: Record<string, number> = {};

  get isDisableNextButton() {
    return (
      (!this.files.length && !this.selectedFilesFromTree.length) ||
      this.isDisabledUploadError
    );
  }

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private cdr: ChangeDetectorRef,
  ) {
    super('ImportPopupStepSelectFileLocalComponent');

    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectId)
        .subscribe((projectId) => {
          this.projectId = projectId;
        }),
    );

    // Show loading when upload
    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorActionInProcess)
        .subscribe((isLoading) => {
          this.inProgress = isLoading;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorFilesSelected)
        .subscribe((_selectedFiles) => {
          this.selectedFilesFromTree = _selectedFiles;
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ImportFileComplete))
        .subscribe(() => {
          this.reset();
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ResetImportState))
        .subscribe(() => {
          this.reset();
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.OpenImportPopup))
        .subscribe(() => {
          this.reset();
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ImportTypesActive))
        .subscribe(({ colors, assignmentActive }) => {
          this.importColorActive = colors;
          this.assignmentActive = assignmentActive;
        }),
    );
  }

  // The console will throw an error in the template unless we call detectChanges
  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  private reset() {
    this.uploadFile?.resetFile();
    this.isDisabledUploadError = false;
    this.files = [];
  }

  //tabs upload file
  protected fileUploadChange(files: File[]) {
    if (
      !isValidFileSize(files) ||
      !isValidFileExtensionAllowed(files, this.fileAcceptExtensionList)
    ) {
      this.isDisabledUploadError = true;
    } else {
      this.isDisabledUploadError = false;
      this.files = files;
      this.store.dispatch(
        ImportPopupAction.SetUploadFileFileOnly({ files: this.files }),
      );
    }
  }

  public saveUploadDataToStore() {
    this.store.dispatch(
      ImportPopupAction.SetUploadFileFileOnly({ files: this.files }),
    );
  }

  public open() {
    if (this.isResetData) {
      this.uploadFile?.resetFile();
      this.files = [];
      this.assignmentActive = {};
      this.importColorActive = {};
    }
  }
}
