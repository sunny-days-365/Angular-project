import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  PointCsvImportSettingsService,
  PointCloudCsvImportSettingsService,
  QuerySetPointCloudCsvImportSettingsParam,
  QuerySetPointCsvImportSettingsParam,
  PointCsvImportSettings,
  PointCloudCsvImportSettings,
  WMDevicesService,
  WMProjectLink,
} from '@nikon-trimble-sok/api-sdk-d3';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import {
  BaseComponent,
  SelectDataItem,
} from '@nikon-trimble-sok/parts-components';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  of,
  startWith,
  take,
} from 'rxjs';
import { extractErrorMessage } from 'src/app/helper-utility/error-helper/error-helper';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ImportPopupCsvPreviewComponent } from './csv-preview/csv-preview.component';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { ProjectListSelector } from 'src/app/stores/selectors/project-list/ProjectListState.selector';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { NTCWMDeviceControllerFieldData } from 'src/app/helper-utility/api-helper/projects-models';
import { NtcFolderEntry } from 'src/app/stores/states/project/detail/file-view/file-view.state';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import JSZip from 'jszip';
import { GetAcquiredTokens } from 'src/app/helper-utility/trimble-identity-helper/acquired-token';
import { HttpClient } from '@angular/common/http';
import { TrimbleFileApiServices } from 'src/app/services/trimble-file-api-services/trimble-file-api-services';
import { Actions } from '@ngrx/effects';
import {
  CoordinateTypeEnum,
  EAST_SUFFIX,
  NORTH_SUFFIX,
} from './csv-column-setting.defination';
import _ from 'lodash';
import Encoding from 'encoding-japanese';
import { ImportPopupSettingsService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-settings.service';
import { ImportPopupSettingsModel } from 'src/app/stores/strage/model/project/detail/data-3d-view/left-panel/import/import-popup-from.model';

export type FileItem = {
  id: string;
  name: string;
  file: File | undefined;
  ntcFolderEntry: NtcFolderEntry | undefined;
  wmDeviceFieldData: NTCWMDeviceControllerFieldData | undefined;
};

@Component({
  selector: 'ntc-import-popup-csv-column-setting',
  templateUrl: './csv-column-setting.component.html',
  styleUrls: ['./csv-column-setting.component.scss'],
})
export class ImportPopupSettingImportPopupComponent extends BaseComponent {
  public projectId: string | undefined;

  @ViewChild('modalSetting') modalSetting: BasicModalComponent | undefined;

  @ViewChild('modalPreview') modalPreview:
    | ImportPopupCsvPreviewComponent
    | undefined;

  public readonly TabSettings = {
    point: 1,
    pointCloud: 2,
  };

  public activeTabs: number = this.TabSettings.point;

  public isLoading: boolean = true;

  public isUpdating: boolean = false;

  public hasError: boolean = false;

  public errorMessage: string | undefined = undefined;

  public csvSampleErrorMessage: string | undefined = undefined;

  // 行数
  public readonly rowOptions: SelectDataItem[] = [];

  // カラム
  public readonly pointColumnOptions: SelectDataItem[] = [];
  public readonly pointColumnOptionsNoOmit: SelectDataItem[] = [];
  public readonly pointCloudColumnOptions: SelectDataItem[] = [];
  public readonly pointCloudColumnOptionsNoOmit: SelectDataItem[] = [];

  // カラムデフォルト値
  private OMIT_VALUE = '-1';

  // サンプルCSVの取得行数
  private CSV_SAMPLE_LINE = 15;

  public pointForm = new FormGroup({
    pointIgnoreRowCount: new FormControl(''),
    pointNameIndex: new FormControl(''),
    pointNorthingIndex: new FormControl(''),
    pointEastingIndex: new FormControl(''),
    pointElevationIndex: new FormControl(''),
  });
  public pointCloudForm = new FormGroup({
    pointCloudIgnoreRowCount: new FormControl(''),
    pointCloudNorthingIndex: new FormControl(''),
    pointCloudEastingIndex: new FormControl(''),
    pointCloudElevationIndex: new FormControl(''),
    pointCloudRedIndex: new FormControl(''),
    pointCloudGreenIndex: new FormControl(''),
    pointCloudBlueIndex: new FormControl(''),
    pointCloudIntensityIndex: new FormControl(''),
  });

  // カラムチェック用
  public pointColumnValues: string[] = [];
  public pointCloudColumnValues: string[] = [];

  public convertToPoint: boolean = true;

  public csvCoordinateType: CoordinateTypeEnum | undefined;

  public csvFileOptions: SelectDataItem[] = [];

  private localFileList: Array<FileItem> = [];
  private TCFileList: Array<FileItem> = [];
  private WMDeviceFileList: Array<FileItem> = [];

  private fileItemList: FileItem[] = [];
  private cacheFileItemList: Record<string, File> = {};

  public sampleLines: string[] | undefined = [];

  public csvNotSelected: boolean = true;

  public csvForm = new FormGroup({
    csvFile: new FormControl(''),
  });

  private wmProjectLink: WMProjectLink | undefined;

  public dimPopup: boolean = false;

  public xSuffix: string = '';
  public ySuffix: string = '';

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
    private pointCsvImportSettingsService: PointCsvImportSettingsService,
    private pointCloudCsvImportSettingsService: PointCloudCsvImportSettingsService,
    private wmDevicesService: WMDevicesService,
    private trimbleFileApiServices: TrimbleFileApiServices,
    private httpClient: HttpClient,
    private importPopupSettingsService: ImportPopupSettingsService,
  ) {
    super('ImportPopupSettingImportPopupComponent');

    this.makeColumn();

    // select wmProjectLink
    this.addSubscriptionsList(
      this.store
        .select(ProjectListSelector.selectorWmProjectLink)
        .subscribe((wmProjectLink) => {
          this.wmProjectLink = wmProjectLink;
        }),
    );

    // select file
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
            this.isLoading = false;
            this.localFileList = _fileList
              .filter(
                (item) =>
                  item.name.split('.').pop()?.toLocaleLowerCase() === 'csv',
              )
              .map((item) => ({
                id: this.uid(),
                name: item.name,
                file: item,
                ntcFolderEntry: undefined,
                wmDeviceFieldData: undefined,
              }));
            this.TCFileList = _ntcFolderEntryList
              .filter(
                (item) =>
                  item.name.split('.').pop()?.toLocaleLowerCase() === 'csv',
              )
              .map((item) => ({
                id: this.uid(),
                name: item.name,
                file: undefined,
                ntcFolderEntry: item,
                wmDeviceFieldData: undefined,
              }));
            this.WMDeviceFileList = wmDeviceControllerFieldDataSelectedItemList
              .filter(
                (item) =>
                  item.name.split('.').pop()?.toLocaleLowerCase() === 'csv',
              )
              .map((item) => ({
                id: this.uid(),
                name: item.name,
                file: undefined,
                ntcFolderEntry: undefined,
                wmDeviceFieldData: item,
              }));
            this.csvFileOptions = [
              ...this.localFileList,
              ...this.TCFileList,
              ...this.WMDeviceFileList,
            ].map((item) => ({
              id: item.id,
              label: item.name,
              disabled: false,
            }));
            this.fileItemList = [
              ...this.localFileList,
              ...this.TCFileList,
              ...this.WMDeviceFileList,
            ];
          },
        ),
    );

    // on change csvFile
    this.addSubscriptionsList(
      this.csvForm.controls['csvFile'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe(async (value) => {
          if (!value) return;

          this.csvNotSelected = true;

          let file: File | undefined = undefined;
          const cachedFile = this.cacheFileItemList[value];
          if (!cachedFile) {
            this.isLoading = true;
            const fileItem = this.fileItemList.find(
              (item) => item.id === value,
            );
            if (fileItem?.file) {
              file = fileItem?.file;
            } else if (fileItem?.ntcFolderEntry) {
              file = await this.getFileManageFile(
                this.projectId,
                fileItem?.ntcFolderEntry,
              );
            } else if (fileItem?.wmDeviceFieldData) {
              file = await this.getWMDeviceFile(
                this.wmProjectLink?.wmAccountId,
                fileItem?.wmDeviceFieldData,
              );
            }
          } else {
            file = cachedFile;
          }

          if (!file) {
            this.csvSampleErrorMessage = extractAppMessage('SOK7003');
          } else {
            this.cacheFileItemList[value] = file;
            this.sampleLines = await this.getSampleLines(file);
            this.csvNotSelected = false;
          }

          this.isLoading = false;
        }),
    );

    // on change pointForm
    this.addSubscriptionsList(
      this.pointForm.valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe(() => {
          this.checkColumnValue();
        }),
    );

    // on change pointCloudForm
    this.addSubscriptionsList(
      this.pointCloudForm.valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe(() => {
          this.checkColumnValue();
        }),
    );

    // on change pointCloudRedIndex
    this.addSubscriptionsList(
      this.pointCloudForm.controls['pointCloudRedIndex'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (value === this.OMIT_VALUE) {
            this.pointCloudForm.controls['pointCloudGreenIndex'].patchValue(
              this.OMIT_VALUE,
              { emitEvent: false },
            );
            this.pointCloudForm.controls['pointCloudBlueIndex'].patchValue(
              this.OMIT_VALUE,
              { emitEvent: false },
            );
          }
        }),
    );

    // on change pointCloudGreenIndex
    this.addSubscriptionsList(
      this.pointCloudForm.controls['pointCloudGreenIndex'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (value === this.OMIT_VALUE) {
            this.pointCloudForm.controls['pointCloudRedIndex'].patchValue(
              this.OMIT_VALUE,
              { emitEvent: false },
            );
            this.pointCloudForm.controls['pointCloudBlueIndex'].patchValue(
              this.OMIT_VALUE,
              { emitEvent: false },
            );
          }
        }),
    );

    // on change pointCloudBlueIndex
    this.addSubscriptionsList(
      this.pointCloudForm.controls['pointCloudBlueIndex'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (value === this.OMIT_VALUE) {
            this.pointCloudForm.controls['pointCloudRedIndex'].patchValue(
              this.OMIT_VALUE,
              { emitEvent: false },
            );
            this.pointCloudForm.controls['pointCloudGreenIndex'].patchValue(
              this.OMIT_VALUE,
              { emitEvent: false },
            );
          }
        }),
    );
  }

  /**
   * 初期化
   */
  public initialize() {
    this.isLoading = true;

    this.errorMessage = undefined;

    this.store
      .select(ApplicationStateSelector.selectorProjectId)
      .pipe(take(1))
      .subscribe((projectId) => {
        if (!projectId) {
          this.errorMessage = extractAppMessage('SOK1003');
          return;
        }
        this.projectId = projectId;
        this.importPopupSettingsService.setProjectId(this.projectId);
        combineLatest([
          this.pointCsvImportSettingsService.pointCsvImportSettingsGet(
            projectId,
          ),
          this.pointCloudCsvImportSettingsService.pointCloudCsvImportSettingsGet(
            projectId,
          ),
        ])
          .pipe(take(1))
          .pipe(
            catchError((err) => {
              this.isLoading = false;
              this.hasError = true;
              this.errorMessage = extractErrorMessage(err);
              return of();
            }),
          )
          .subscribe(
            ([pointCsvImportSettings, pointCloudCsvImportSettings]) => {
              this.pointForm.controls['pointIgnoreRowCount'].patchValue(
                '' + pointCsvImportSettings.ignoreRowCount,
                { emitEvent: false },
              );
              this.pointForm.controls['pointNameIndex'].patchValue(
                '' + pointCsvImportSettings.pointNameIndex,
                { emitEvent: false },
              );
              this.pointForm.controls['pointNorthingIndex'].patchValue(
                '' + pointCsvImportSettings.northingIndex,
                { emitEvent: false },
              );
              this.pointForm.controls['pointEastingIndex'].patchValue(
                '' + pointCsvImportSettings.eastingIndex,
                { emitEvent: false },
              );
              this.pointForm.controls['pointElevationIndex'].patchValue(
                '' + pointCsvImportSettings.elevationIndex,
                { emitEvent: false },
              );
              this.pointCloudForm.controls[
                'pointCloudIgnoreRowCount'
              ].patchValue('' + pointCloudCsvImportSettings.ignoreRowCount, {
                emitEvent: false,
              });
              this.pointCloudForm.controls[
                'pointCloudNorthingIndex'
              ].patchValue('' + pointCloudCsvImportSettings.northingIndex, {
                emitEvent: false,
              });
              this.pointCloudForm.controls['pointCloudEastingIndex'].patchValue(
                '' + pointCloudCsvImportSettings.eastingIndex,
                { emitEvent: false },
              );
              this.pointCloudForm.controls[
                'pointCloudElevationIndex'
              ].patchValue('' + pointCloudCsvImportSettings.elevationIndex, {
                emitEvent: false,
              });
              this.pointCloudForm.controls['pointCloudRedIndex'].patchValue(
                '' + pointCloudCsvImportSettings.redIndex,
                { emitEvent: false },
              );
              this.pointCloudForm.controls['pointCloudGreenIndex'].patchValue(
                '' + pointCloudCsvImportSettings.greenIndex,
                { emitEvent: false },
              );
              this.pointCloudForm.controls['pointCloudBlueIndex'].patchValue(
                '' + pointCloudCsvImportSettings.blueIndex,
                { emitEvent: false },
              );
              this.pointCloudForm.controls[
                'pointCloudIntensityIndex'
              ].patchValue('' + pointCloudCsvImportSettings.intensityIndex, {
                emitEvent: false,
              });
              // ローカルストレージに格納
              let storedSettings = this.importPopupSettingsService.get();
              if (!storedSettings) {
                storedSettings = new ImportPopupSettingsModel();
              }
              storedSettings.pointCsvImportSettings = pointCsvImportSettings;
              storedSettings.pointCloudCsvImportSettings =
                pointCloudCsvImportSettings;
              this.importPopupSettingsService.upsert(() => storedSettings!);
              this.isLoading = false;
              this.hasError = false;
            },
          );
      });
  }

  public onChangeTabs(index: number) {
    this.activeTabs = index;
    if (this.activeTabs === this.TabSettings.point) {
      this.convertToPoint = true;
    } else {
      this.convertToPoint = false;
    }
  }

  /**
   * 設定更新
   */
  public onOk() {
    if (!this.projectId) {
      this.errorMessage = extractAppMessage('SOK1003');
      return;
    }

    this.isLoading = true;

    this.isUpdating = true;

    this.errorMessage = undefined;

    this.checkColumnValue();
    if (this.errorMessage) {
      return;
    }

    const pointCsvImportSettingsPostParam: QuerySetPointCsvImportSettingsParam =
      {
        projectId: this.projectId,
        settings: {
          ignoreRowCount: Number(
            this.pointForm.controls['pointIgnoreRowCount'].value,
          ),
          pointNameIndex: this.getColumnValue(
            this.pointForm.controls['pointNameIndex'].value,
          ),
          northingIndex: this.getColumnValue(
            this.pointForm.controls['pointNorthingIndex'].value,
          ),
          eastingIndex: this.getColumnValue(
            this.pointForm.controls['pointEastingIndex'].value,
          ),
          elevationIndex: this.getColumnValue(
            this.pointForm.controls['pointElevationIndex'].value,
          ),
        },
      };

    const pointCloudCsvImportSettingsPostParam: QuerySetPointCloudCsvImportSettingsParam =
      {
        projectId: this.projectId,
        settings: {
          ignoreRowCount: Number(
            this.pointCloudForm.controls['pointCloudIgnoreRowCount'].value,
          ),
          northingIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudNorthingIndex'].value,
          ),
          eastingIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudEastingIndex'].value,
          ),
          elevationIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudElevationIndex'].value,
          ),
          redIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudRedIndex'].value,
          ),
          greenIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudGreenIndex'].value,
          ),
          blueIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudBlueIndex'].value,
          ),
          intensityIndex: this.getColumnValue(
            this.pointCloudForm.controls['pointCloudIntensityIndex'].value,
          ),
        },
      };

    // ローカルストレージに格納
    let storedSettings = this.importPopupSettingsService.get();
    if (!storedSettings) {
      storedSettings = new ImportPopupSettingsModel();
    }
    storedSettings.pointCsvImportSettings =
      pointCsvImportSettingsPostParam.settings;
    storedSettings.pointCloudCsvImportSettings =
      pointCloudCsvImportSettingsPostParam.settings;
    this.importPopupSettingsService.upsert(() => storedSettings!);

    // API更新
    combineLatest([
      this.pointCsvImportSettingsService.pointCsvImportSettingsPost(
        pointCsvImportSettingsPostParam,
      ),
      this.pointCloudCsvImportSettingsService.pointCloudCsvImportSettingsPost(
        pointCloudCsvImportSettingsPostParam,
      ),
    ])
      .pipe(
        catchError((err) => {
          this.isLoading = false;
          this.isUpdating = false;
          this.hasError = true;
          this.errorMessage = extractErrorMessage(err);
          return of();
        }),
      )
      .subscribe(() => {
        this.isLoading = false;
        this.isUpdating = false;
        this.dimPopup = false;
        this.closeModal();
      });
  }

  /**
   * 開く
   */
  public open(convertToPoint: boolean, csvCoordinateType: CoordinateTypeEnum) {
    this.store.dispatch(ImportPopupAction.DimPopup());
    this.initialize();
    this.modalSetting?.open();
    this.convertToPoint = convertToPoint;
    if (this.convertToPoint) {
      this.activeTabs = this.TabSettings.point;
    } else {
      this.activeTabs = this.TabSettings.pointCloud;
    }
    this.csvCoordinateType = csvCoordinateType ?? CoordinateTypeEnum.NEZ;
    if (this.csvCoordinateType === CoordinateTypeEnum.NEZ) {
      this.xSuffix = NORTH_SUFFIX;
      this.ySuffix = EAST_SUFFIX;
    } else {
      this.xSuffix = EAST_SUFFIX;
      this.ySuffix = NORTH_SUFFIX;
    }
  }

  /**
   * 閉じる
   */
  public closeModal() {
    this.errorMessage = undefined;
    this.csvSampleErrorMessage = undefined;
    this.csvNotSelected = false;

    this.csvForm.controls['csvFile'].reset();
    this.sampleLines = undefined;
    this.store.dispatch(ImportPopupAction.UnDimPopup());
    this.modalSetting?.close();
  }

  /**
   * CSVプレビュー画面開く
   */
  public openPreview() {
    if (
      this.isLoading ||
      this.hasError ||
      !!this.errorMessage ||
      !!this.csvSampleErrorMessage ||
      !this.csvForm.controls.csvFile.value
    )
      return;

    this.dimPopup = true;

    // 受け渡しパラメータ
    const pointCsvImportSettings: PointCsvImportSettings = {
      ignoreRowCount: Number(
        this.pointForm.controls['pointIgnoreRowCount'].value,
      ),
      pointNameIndex: this.getColumnValue(
        this.pointForm.controls['pointNameIndex'].value,
      ),
      northingIndex: this.getColumnValue(
        this.pointForm.controls['pointNorthingIndex'].value,
      ),
      eastingIndex: this.getColumnValue(
        this.pointForm.controls['pointEastingIndex'].value,
      ),
      elevationIndex: this.getColumnValue(
        this.pointForm.controls['pointElevationIndex'].value,
      ),
    };
    const pointCloudCsvImportSettings: PointCloudCsvImportSettings = {
      ignoreRowCount: Number(
        this.pointCloudForm.controls['pointCloudIgnoreRowCount'].value,
      ),
      northingIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudNorthingIndex'].value,
      ),
      eastingIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudEastingIndex'].value,
      ),
      elevationIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudElevationIndex'].value,
      ),
      redIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudRedIndex'].value,
      ),
      greenIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudGreenIndex'].value,
      ),
      blueIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudBlueIndex'].value,
      ),
      intensityIndex: this.getColumnValue(
        this.pointCloudForm.controls['pointCloudIntensityIndex'].value,
      ),
    };

    this.modalPreview?.open(
      this.convertToPoint,
      this.csvCoordinateType ?? CoordinateTypeEnum.NEZ,
      pointCsvImportSettings,
      pointCloudCsvImportSettings,
      this.sampleLines ?? [],
    );
  }

  /**
   * CSVプレビュー画面閉じる
   */
  public closePreview() {
    this.dimPopup = false;
  }

  /**
   * カラム値チェック
   */
  private checkColumnValue() {
    this.errorMessage = undefined;
    this.checkPointColumnValue();
    this.checkPointCloudColumnValue();
  }

  /**
   * カラム値初期設定
   */
  private makeColumn() {
    // 行Option なし,
    this.rowOptions.push({
      label: 'なし',
      id: '0',
      disabled: false,
    });
    for (let i = 1; i <= 10; i++) {
      this.rowOptions.push({
        label: i + '行',
        id: i.toString(),
        disabled: false,
      });
    }

    this.pointColumnOptions.push({
      label: 'なし',
      id: this.OMIT_VALUE,
      disabled: false,
    });
    for (let i = 0; i < 10; i++) {
      this.pointColumnOptions.push({
        label: i + 1 + 'カラム目',
        id: i.toString(),
        disabled: false,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.pointColumnOptionsNoOmit.push({
        label: i + 1 + 'カラム目',
        id: i.toString(),
        disabled: false,
      });
    }

    this.pointCloudColumnOptions.push({
      label: 'なし',
      id: this.OMIT_VALUE,
      disabled: false,
    });
    for (let i = 0; i < 10; i++) {
      this.pointCloudColumnOptions.push({
        label: i + 1 + 'カラム目',
        id: i.toString(),
        disabled: false,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.pointCloudColumnOptionsNoOmit.push({
        label: i + 1 + 'カラム目',
        id: i.toString(),
        disabled: false,
      });
    }
  }

  /**
   * ポイント設定のカラム指定チェック
   */
  private checkPointColumnValue() {
    // ユニークチェック
    this.pointColumnValues = [];
    if (
      !this._checkPointColumnValueUnique(
        this.pointForm.controls['pointNameIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointColumnValueUnique(
        this.pointForm.controls['pointNorthingIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointColumnValueUnique(
        this.pointForm.controls['pointEastingIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointColumnValueUnique(
        this.pointForm.controls['pointElevationIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
  }

  /**
   * カラム値ユニークチェック
   */
  private _checkPointColumnValueUnique(value: string | null | undefined) {
    if (!value || value === this.OMIT_VALUE) return true;
    const index = this.pointColumnValues.findIndex((item) => item == value);
    if (index >= 0) {
      return false;
    }
    this.pointColumnValues.push(value);
    return true;
  }

  /**
   * 点群データ設定のカラム指定チェック
   */
  private checkPointCloudColumnValue() {
    // ユニークチェック
    this.pointCloudColumnValues = [];
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudNorthingIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudEastingIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudElevationIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudRedIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudGreenIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudBlueIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }
    if (
      !this._checkPointCloudColumnValueUnique(
        this.pointCloudForm.controls['pointCloudIntensityIndex'].value,
      )
    ) {
      this.errorMessage = extractAppMessage('SOK1100');
      return;
    }

    // RGBに「なし」を設定する場合は３カラムまとめて指定
    const red = this.pointCloudForm.controls['pointCloudRedIndex'].value;
    const green = this.pointCloudForm.controls['pointCloudGreenIndex'].value;
    const blue = this.pointCloudForm.controls['pointCloudBlueIndex'].value;
    if ([red, green, blue].includes(this.OMIT_VALUE)) {
      if (
        [red, green, blue].filter((value) => value !== this.OMIT_VALUE).length >
        0
      ) {
        this.errorMessage = extractAppMessage('SOK1101');
      }
    }
  }

  /**
   * カラム値ユニークチェック
   */
  private _checkPointCloudColumnValueUnique(value: string | null | undefined) {
    if (!value || value === this.OMIT_VALUE) return true;
    const index = this.pointCloudColumnValues.findIndex(
      (item) => item == value,
    );
    if (index >= 0) {
      return false;
    }
    this.pointCloudColumnValues.push(value);
    return true;
  }

  /**
   * カラム項目の値取得
   */
  private getColumnValue(value: string | null): number | undefined {
    return value === null ? undefined : Number(value);
  }

  /**
   * ファイル管理のファイル取得
   */
  private async getFileManageFile(
    projectId: string | undefined,
    ntcFolderEntry: NtcFolderEntry | undefined,
  ): Promise<File | undefined> {
    if (!projectId || !ntcFolderEntry) {
      return undefined;
    }

    let hasError = false;

    const token = await GetAcquiredTokens(this.store, this.actions$);

    if (!token) {
      return undefined;
    }

    const fileUrl = await this.trimbleFileApiServices
      .getDownloadSingleFile(ntcFolderEntry.id)
      .then((res) => res)
      .catch(() => {
        hasError = true;
      });

    if (hasError || !fileUrl) {
      return undefined;
    }

    const buffer = await firstValueFrom(
      this.httpClient.get(fileUrl.url, {
        headers: { Accept: '*/*' },
        responseType: 'arraybuffer',
      }),
    )
      .then((res) => res)
      .catch(() => {
        hasError = true;
      });

    if (hasError || !buffer) {
      return undefined;
    }

    const file = new File(
      [new Blob([buffer], { type: 'text/csv' })],
      ntcFolderEntry.name,
    );

    return file;
  }

  /**
   * WMDeviceのファイル取得
   */
  private async getWMDeviceFile(
    wmAccountId: string | null | undefined,
    wmDeviceFieldData: NTCWMDeviceControllerFieldData | undefined,
  ): Promise<File | undefined> {
    if (!wmAccountId || !wmDeviceFieldData) {
      return undefined;
    }

    let hasError = false;

    // DownloadUrl
    const fileUrl = await firstValueFrom(
      this.wmDevicesService.wmDevicesDeviceIdDownloadControllerFieldDataUrlPost(
        wmDeviceFieldData.deviceId,
        {
          accountId: wmAccountId,
          files: [
            {
              fileName: wmDeviceFieldData.name,
              path: wmDeviceFieldData.path,
            },
          ],
        },
        undefined,
        undefined,
        {
          httpHeaderAccept: 'text/plain',
        },
      ),
    )
      .then((res) => res)
      .catch(() => {
        hasError = true;
      });

    if (hasError || !fileUrl) {
      return undefined;
    }

    const responseZipFile = await firstValueFrom(
      this.httpClient.get(fileUrl, { responseType: 'arraybuffer' }),
    )
      .then((res) => res)
      .catch(() => {
        hasError = true;
      });

    if (hasError || !responseZipFile) {
      return undefined;
    }

    let downloadedFile: File | undefined = undefined;
    const zip = await JSZip.loadAsync(responseZipFile);
    for (const zipObject of Object.values(zip.files)) {
      if (zipObject.dir) {
        continue;
      }
      const fileName = zipObject.name.split('/').reverse()[0];
      const blob = await zipObject.async('blob');
      const file = new File([blob], fileName, {
        lastModified: zipObject.date.getTime(),
      });
      downloadedFile = file;
    }

    if (!downloadedFile) {
      return undefined;
    }

    return downloadedFile;
  }

  /**
   * CSVファイル内の先頭行を指定数返す
   */
  private async getSampleLines(file: File): Promise<string[] | undefined> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reject(undefined);
      };
      reader.onload = async (e) => {
        // ArrayBufferを取得
        const buffer = e.target?.result as ArrayBuffer;

        // 先頭の複数行を取得する
        const result = await this.processCSV(buffer);

        // 改行コードで分割し、指定行数分だけ返す
        const csvRowList = result.split('\n');
        const _ret = csvRowList.slice(0, this.CSV_SAMPLE_LINE);
        resolve(_ret);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * CSVの先頭行を指定数取得する
   * ArrayBufferをストリームで読み込み、改行コードの数が指定数に達したらそこで読み込みを止める
   * 文字コードはEncoding.jsで変換する
   */
  private async processCSV(buffer: ArrayBuffer) {
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: 'text/csv' });
    const reader = blob.stream().getReader();
    let result = '';
    let breakLineCounter = 0;

    // 改行コードの数が指定数に達する or ファイルの末端まで読み込み
    while (breakLineCounter < this.CSV_SAMPLE_LINE + 5) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // バイトチャンクを文字列に変換
      result += Encoding.convert(value, {
        to: 'UNICODE',
        type: 'string',
      });

      // 変換結果が文字列でない場合はエラー
      if (!result || typeof result !== 'string') {
        throw Error('decode error');
      }

      // 改行コードの数をカウント
      breakLineCounter = result.split('\n').length;
    }
    return result;
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
    } else if (array1.length <= 0 && array2.length <= 0) {
      return true;
    }

    let i = array1.length;
    if (i != array2.length) return false;

    while (i--) {
      if (!_.isEqual(array1[i], array2[i])) return false;
    }
    return true;
  }

  private uid(): string {
    return Math.random().toString(36).slice(2);
  }
}
