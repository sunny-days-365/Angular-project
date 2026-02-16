import { AfterViewInit, Component, EventEmitter, Output } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { combineLatest, distinctUntilChanged } from 'rxjs';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { TCAPISelector } from 'src/app/stores/selectors/project-list/TCAPI.selector';
import { Project } from 'trimble-connect-sdk';
import { ImportPopupSettingsService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-settings.service';
import { ImportPopupSettingsModel } from 'src/app/stores/strage/model/project/detail/data-3d-view/left-panel/import/import-popup-from.model';
import _ from 'lodash';
import {
  FileItem,
  FileItemStack,
  UploadStatusEnum,
} from 'src/app/services/import/import.service.definition';
import { ImportService } from 'src/app/services/import/import.service';

@Component({
  selector: 'ntc-import-popup-step-import',
  templateUrl: './step-import.component.html',
  styleUrl: './step-import.component.scss',
})
export class ImportPopupStepImportComponent
  extends BaseComponent
  implements AfterViewInit
{
  @Output() closeEvent = new EventEmitter();

  public project: Project | undefined;

  public processId: string | undefined;

  private fileList: Array<FileItem> = [];
  private ntcFolderEntryList: Array<FileItem> = [];
  private wmDeviceFieldDataList: Array<FileItem> = [];

  public STATUS_UPLOAD_AWAIT = UploadStatusEnum.uploadWaiting;
  public STATUS_IMPORT_AWAIT = UploadStatusEnum.importWaiting;
  public STATUS_DOWNLOAD_AWAIT = UploadStatusEnum.downloadWaiting;
  public STATUS_DOWNLOADING = UploadStatusEnum.downloading;
  public STATUS_UPLOADING = UploadStatusEnum.uploading;
  public STATUS_IMPORTING = UploadStatusEnum.importing;
  public STATUS_ERROR = UploadStatusEnum.error;
  public STATUS_DONE = UploadStatusEnum.done;
  public STATUS_CANCEL = UploadStatusEnum.cancel;

  get isDisableCancelButton() {
    if (!this.processId) {
      return true;
    }
    return !this.importService.isAbortable(this.processId);
  }

  get isDisableNextButton() {
    return false;
  }

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private importPopupSettingsService: ImportPopupSettingsService,
    private importService: ImportService,
  ) {
    super('ImportPopupStepImportComponent');

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ApplicationStateSelector.selectorProjectId),
        this.store.select(TCAPISelector.selectorProject),
      ]).subscribe(([projectId, projectList]) => {
        const _project = projectList.find((item) => item.id === projectId);
        this.project = _project;
      }),
    );

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ImportPopupSelector.selectorUploadFilesFileOnly),
        this.store.select(ImportPopupSelector.selectorFilesSelected),
        this.store.select(
          ImportPopupSelector.selectWMwmDeviceControllerFieldDataSelectedItemList,
        ),
      ])
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return (
              this.isArrayEqual(prev[0], curr[0]) &&
              this.isArrayEqual(prev[1], curr[1]) &&
              this.isArrayEqual(prev[2], curr[2])
            );
          }),
        )
        .subscribe(
          ([
            _fileList,
            _ntcFolderEntryList,
            wmDeviceControllerFieldDataSelectedItemList,
          ]) => {
            this.fileList = _fileList.map((item) => ({
              name: item.name,
              size: item.size,
              file: item,
              ntcFolderEntry: undefined,
              wmDeviceFieldData: undefined,
              status: UploadStatusEnum.uploadWaiting,
              errMessage: undefined,
            }));
            this.ntcFolderEntryList = _ntcFolderEntryList.map((item) => ({
              name: item.name,
              size: item.size,
              file: undefined,
              ntcFolderEntry: item,
              wmDeviceFieldData: undefined,
              status: UploadStatusEnum.importWaiting,
              errMessage: undefined,
            }));
            this.wmDeviceFieldDataList =
              wmDeviceControllerFieldDataSelectedItemList.map((item) => ({
                name: item.name,
                size: item.size,
                file: undefined,
                ntcFolderEntry: undefined,
                wmDeviceFieldData: item,
                status: UploadStatusEnum.downloadWaiting,
                errMessage: undefined,
              }));
          },
        ),
    );

    // TODO 2024/11/25 インポート条件設定時に戻す
    // this.addSubscriptionsList(
    //   this.actions$
    //     .pipe(ofType(ImportPopupAction.ImportTypesActive))
    //     .subscribe(({ colors }) => {
    //       this.importColorActive = colors;
    //     }),
    // );
  }

  ngAfterViewInit(): void {
    // インポート処理実行
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ExecuteImport))
        .subscribe((act) => {
          this.import(act.importPopupSettingsModel);
        }),
    );
  }

  onOk() {
    this.closeEvent.emit();
  }

  onCancel() {
    if (!this.processId) {
      return;
    }
    this.importService.abort(this.processId);
  }

  public isImportAbortable() {
    if (!this.processId) {
      return false;
    }
    return this.importService.isImportAbortable(this.processId);
  }

  /**
   * インポート処理実行
   */
  private import(importPopupSettingsModel: ImportPopupSettingsModel) {
    const dataList = [
      ...this.fileList,
      ...this.ntcFolderEntryList,
      ...this.wmDeviceFieldDataList,
    ];

    // インポートスタック用のID作成
    this.processId = this.importService.makeUID();

    if (!this.processId) {
      return;
    }

    // processIdと設定情報を紐づけ
    this.importService.setSettings(this.processId, importPopupSettingsModel);

    // データセット
    this.importService.setData(this.processId, dataList);

    // インポート開始
    this.importService.startImport(this.processId);
  }

  public getFileStack(): Array<FileItemStack> {
    if (!this.processId) {
      return [];
    }
    return this.importService.getFileStack(this.processId) ?? [];
  }

  /**
   * 簡易配列比較
   */
  private isArrayEqual(
    array1: unknown[] | undefined,
    array2: unknown[] | undefined,
  ) {
    if (!array1 && !array2) {
      return true;
    } else if (!array1 || !array2) {
      return false;
    }

    let i = array1.length;
    if (i != array2.length) return false;

    while (i--) {
      if (!_.isEqual(array1[i], array2[i])) return false;
    }
    return true;
  }
}
