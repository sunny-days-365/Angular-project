import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { isValidFileExtensionAllowed } from 'src/app/helper-utility/file-helper/file-helper';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { NtcFolderEntry } from 'src/app/stores/states/project/detail/file-view/file-view.state';
import {
  ACCEPT_FILE_UPLOAD_EXTENSION,
  WMDeviceDataTree,
} from '../../../import-popup.definition';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { Actions, ofType } from '@ngrx/effects';
import {
  ImportFrom,
  ImportFromEnum,
  ImportStepEnum,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';
import {
  WMDeviceControllerFieldData,
  WMDeviceData,
} from '@nikon-trimble-sok/api-sdk-d3';
import { Observable } from 'rxjs';
import { NTCWMDeviceControllerFieldData } from 'src/app/helper-utility/api-helper/projects-models';

@Component({
  selector: 'ntc-import-popup-step-select-file-file-management',
  templateUrl: './file-management.component.html',
  styleUrls: ['./file-management.component.scss'],
})
export class ImportPopupStepSelectFileFileManagementComponent
  extends BaseComponent
  implements OnChanges
{
  @Input()
  public fileAcceptExtensionList: string[] = ACCEPT_FILE_UPLOAD_EXTENSION;

  @Input() selectedSurveyControllerData: WMDeviceData | undefined;

  public fileSelectedList: NtcFolderEntry[] = [];
  public fieldDataSelectedList: NTCWMDeviceControllerFieldData[] = [];

  public fileIdSelectedList: Record<string, boolean> = {};
  public fieldDataIdSelectedList: Record<string, boolean> = {};

  public listFolder: NtcFolderEntry[] | undefined;

  public crumbs: NtcFolderEntry[] = [];

  public wmCrumbs: NtcFolderEntry[] = [];

  public folderSelected: NtcFolderEntry | undefined;

  public importFrom: ImportFrom = ImportFromEnum.Local;

  public isLoading$: Observable<boolean | undefined>;

  // 測量用コントローラのアイテム表示用
  public fieldDataList: WMDeviceControllerFieldData[] = [];

  // 測量用コントローラ用ツリー構造
  private wmDeviceDataTree: WMDeviceDataTree | undefined;

  // 選択中の測量用コントローラのフォルダ
  private currentWMDeviceControllerFieldData:
    | WMDeviceControllerFieldData
    | undefined;

  get isFromSurveyController() {
    return this.importFrom === ImportFromEnum.SurveyControl;
  }

  get isDisableNextButton() {
    return (
      (!this.fileIdSelectedList ||
        Object.keys(this.fileIdSelectedList).length <= 0) &&
      (!this.fieldDataIdSelectedList ||
        Object.keys(this.fieldDataIdSelectedList).length <= 0)
    );
  }

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ImportPopupStepSelectFileFileManagementComponent');

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorImportFrom)
        .subscribe((importFrom) => {
          this.importFrom = importFrom ?? ImportFromEnum.FileManage;
        }),
    );

    // ファイル管理
    this.addSubscriptionsList(
      this.store
        .pipe(select(ImportPopupSelector.selectorFiles))
        .subscribe((item) => {
          if (item.length) {
            this.listFolder = item;
            this.crumbs = item[0].path as NtcFolderEntry[];
          } else if (this.folderSelected) {
            const folderActive = {
              id: this.folderSelected?.id,
              versionId: this.folderSelected?.versionId,
              name: this.folderSelected?.name,
            };
            this.crumbs = [...this.crumbs, folderActive] as NtcFolderEntry[];
            this.listFolder = item;
          } else {
            this.listFolder = [];
          }
        }),
    );

    // 測量コントローラ
    this.addSubscriptionsList(
      this.store
        .pipe(
          select(
            ImportPopupSelector.selectWMwmDeviceControllerFieldDataViewItemList,
          ),
        )
        .subscribe((dataList) => {
          this.store.dispatch(ImportPopupAction.UnsetFileSelectLoading());

          this.fieldDataList = [...(dataList ?? [])];
          // WMDeviceControllerFieldData型をNtcFolderEntry型に変換
          const item: NtcFolderEntry[] = this.convertToNtcFolderEntry(
            dataList ?? [],
          );

          if (item.length) {
            this.listFolder = item;
          } else {
            this.listFolder = [];
          }

          // ツリー構造更新
          dataList?.forEach((item) => {
            this.updateWMDeviceDataTree(item);
          });
          // パンくずリスト更新
          this.updateWMDeviceCrumb();
        }),
    );

    //get folder selected
    this.addSubscriptionsList(
      this.store
        .pipe(select(ImportPopupSelector.selectorFolderSelected))
        .subscribe((item) => {
          this.folderSelected = item;
        }),
    );

    // Subscribe file selected list
    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorFilesSelected)
        .subscribe((_file: NtcFolderEntry[]) => {
          this.fileSelectedList = _file;
          const selectedIds: Record<string, boolean> = {};

          if (_file) {
            _file?.forEach((item: NtcFolderEntry) => {
              selectedIds[item.id] = true;
            });
            this.fileIdSelectedList = selectedIds;
          }
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
        .pipe(ofType(ImportPopupAction.ResetSelectedList))
        .subscribe(() => {
          this.crumbs = [];
          this.listFolder = [];
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ResetSelectedWMDeviceController))
        .subscribe(() => {
          this.selectedSurveyControllerData = undefined;
          this.wmCrumbs = [];
          this.wmDeviceDataTree = undefined;
          this.currentWMDeviceControllerFieldData = undefined;
        }),
    );

    // ファイル管理選択
    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorCurrentStep)
        .subscribe((step) => {
          if (
            step == ImportStepEnum.File &&
            this.importFrom === ImportFromEnum.FileManage &&
            this.folderSelected
          ) {
            this.handleSelectedFolder(this.folderSelected);
          }
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.GetFileListViewNotFoundAction))
        .subscribe(() => {
          this.folderSelected = undefined;
          this.reset();
        }),
    );

    this.isLoading$ = this.store.select(
      ImportPopupSelector.selectorActionInProcess,
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 測量コントローラ選択変更
    if (changes['selectedSurveyControllerData']) {
      this.crumbs = [];
      this.wmCrumbs = [];
      this.listFolder = [];
      this.fieldDataIdSelectedList = {};
      this.fieldDataSelectedList = [];
      this.wmDeviceDataTree = undefined;
      this.currentWMDeviceControllerFieldData = undefined;
    }
  }

  public open() {}

  public saveUploadDataToStore() {}

  /**
   * ファイル管理のフォルダ選択
   */
  public handleSelectedFolder(data: NtcFolderEntry) {
    this.store.dispatch(
      ImportPopupAction.GetFileListViewAction({
        folderId: data.id,
      }),
    );

    //set folder selected id
    this.store.dispatch(
      ImportPopupAction.FolderSelected({
        folder: data,
      }),
    );
  }

  /**
   * 測量コントローラのフォルダ選択
   */
  public handleSelectedFieldDataFolder(data: WMDeviceControllerFieldData) {
    this.currentWMDeviceControllerFieldData = data;

    const _fieldDataList: WMDeviceControllerFieldData[] = [];

    _fieldDataList.push(data);
    if (this.wmDeviceDataTree) {
      let node = this.wmDeviceDataTree.findFirstById(data.entryId ?? '');
      while (node && node.parent && node.parent.data) {
        _fieldDataList.push(node.parent.data);
        node = node.parent;
      }
    }
    const fieldDataList = _fieldDataList.reverse();

    this.store.dispatch(
      ImportPopupAction.SetSelectedWMDeviceControllerFieldData({
        wmDeviceControllerFieldData: fieldDataList,
      }),
    );
  }

  reset() {
    // フォルダ選択中はリセットしない
    if (!this.folderSelected) {
      this.store.dispatch(
        ImportPopupAction.GetFileListViewAction({
          folderId: undefined,
        }),
      );
    }
  }

  // click checkbox
  public changeCheckBoxNtcFolderEntry(event: Event, file: NtcFolderEntry) {
    event.preventDefault();
    if (isValidFileExtensionAllowed([file], this.fileAcceptExtensionList)) {
      // Check isFileSelected
      const isFileSelected = this.isFileSelected(file.id);

      // Check conditions for updating
      let newSelectedList: NtcFolderEntry[] = [];
      if (isFileSelected) {
        // Remove file from list
        newSelectedList = this.fileSelectedList?.filter(
          (item: NtcFolderEntry) => item.id !== file.id,
        );
      } else {
        // Add file to list
        newSelectedList = [...this.fileSelectedList, file];
      }

      this.fileSelectedList = newSelectedList;

      const selectedIds: Record<string, boolean> = {};
      this.fileSelectedList?.forEach((item: NtcFolderEntry) => {
        selectedIds[item.id] = true;
      });
      this.fileIdSelectedList = selectedIds;

      // Update file selected list in store
      this.store.dispatch(
        ImportPopupAction.SetListFileSelected({
          fileSelectedList: newSelectedList,
        }),
      );
    }
  }

  public changeCheckboxWMDeviceControllerFieldData(
    event: Event,
    fieldData: WMDeviceControllerFieldData,
  ) {
    event.preventDefault();
    if (
      isValidFileExtensionAllowed(
        [{ name: fieldData.entryName } as File],
        this.fileAcceptExtensionList,
      )
    ) {
      // Check isFileSelected
      const isFileSelected = this.isFieldDataSelected(fieldData.entryId ?? '');

      // Check conditions for updating
      let newSelectedList: NTCWMDeviceControllerFieldData[] = [];
      if (isFileSelected) {
        // Remove file from list
        newSelectedList = this.fieldDataSelectedList?.filter(
          (item: WMDeviceControllerFieldData) =>
            item.entryId !== fieldData.entryId,
        );
      } else {
        // Add file to list
        newSelectedList = [
          ...this.fieldDataSelectedList,
          fieldData as NTCWMDeviceControllerFieldData,
        ];
      }

      this.fieldDataSelectedList = newSelectedList;

      const selectedIds: Record<string, boolean> = {};
      this.fieldDataSelectedList?.forEach(
        (item: WMDeviceControllerFieldData) => {
          selectedIds[item.entryId ?? ''] = true;
        },
      );
      this.fieldDataIdSelectedList = selectedIds;

      // Update file selected list in store
      this.store.dispatch(
        ImportPopupAction.SetListFieldDataSelected({
          fieldDataSelectedList: newSelectedList,
        }),
      );
    }
  }

  public isFileSelected(id: string): boolean {
    return Boolean(this.fileIdSelectedList?.[id]);
  }

  public isFieldDataSelected(id: string): boolean {
    return Boolean(this.fieldDataIdSelectedList?.[id]);
  }

  //check filetype
  public isValidFileType(file: NtcFolderEntry[]) {
    return !isValidFileExtensionAllowed(file, this.fileAcceptExtensionList);
  }
  public isValidFieldDataType(fieldData: WMDeviceControllerFieldData) {
    return !isValidFileExtensionAllowed(
      [{ name: fieldData.entryName } as File],
      this.fileAcceptExtensionList,
    );
  }

  /**
   * ファイル管理用パンくずリストクリック
   */
  public onChangeBreadcrumb(crumb: NtcFolderEntry) {
    this.store.dispatch(
      ImportPopupAction.GetFileListViewAction({
        folderId: crumb.id,
      }),
    );

    //set folder selected id
    this.store.dispatch(
      ImportPopupAction.FolderSelected({
        folder: crumb,
      }),
    );
  }

  /**
   * 測量コントローラ用パンくずリストクリック
   */
  public onChangeBreadcrumbSurvey(crumb: NtcFolderEntry) {
    this.changeWMDeviceFolder(crumb.id);
  }

  private convertToNtcFolderEntry(
    folders: WMDeviceControllerFieldData[],
  ): NtcFolderEntry[] {
    return folders.map((data) => ({
      id: data.entryId ?? '',
      name: data.entryName ?? '',
      type: data.type === 'folder' ? 'FOLDER' : 'FILE',
      origin: '',
      children: undefined,
    }));
  }

  /**
   * 測量コントローラ用ツリー構造更新
   */
  private updateWMDeviceDataTree(data: WMDeviceControllerFieldData) {
    if (!this.selectedSurveyControllerData) {
      return;
    }
    // ツリー構造初期化
    if (!this.wmDeviceDataTree) {
      this.wmDeviceDataTree = new WMDeviceDataTree(
        this.selectedSurveyControllerData.deviceId ?? '',
        this.selectedSurveyControllerData.deviceName ?? '',
        undefined,
      );
    }
    if (!this.wmDeviceDataTree) {
      return;
    }
    // 親の要素取得
    let parentNode;
    if (!this.currentWMDeviceControllerFieldData) {
      parentNode = this.wmDeviceDataTree.findFirstById(
        this.selectedSurveyControllerData.deviceId ?? '',
      );
    } else {
      parentNode = this.wmDeviceDataTree.findFirstById(
        this.currentWMDeviceControllerFieldData.entryId ?? '',
      );
    }
    if (!parentNode) {
      return;
    }
    // 親要素に紐づけ
    const child = this.wmDeviceDataTree.findFirstById(data.entryId ?? '');
    if (!child) {
      parentNode.addChild(
        new WMDeviceDataTree(data.entryId ?? '', data.entryName ?? '', data),
      );
    }
  }

  /**
   * 測量コントローラ用ツリー構造をベースにパンくずリストを更新
   */
  private updateWMDeviceCrumb() {
    if (!this.selectedSurveyControllerData || !this.wmDeviceDataTree) {
      return;
    }

    const _treeCrumbs: WMDeviceDataTree[] = [];

    // 親の要素取得
    let node;
    if (!this.currentWMDeviceControllerFieldData) {
      node = this.wmDeviceDataTree.findFirstById(
        this.selectedSurveyControllerData.deviceId ?? '',
      );
    } else {
      node = this.wmDeviceDataTree.findFirstById(
        this.currentWMDeviceControllerFieldData.entryId ?? '',
      );
    }
    if (!node) {
      return;
    }
    _treeCrumbs.push(node);
    while (node.parent) {
      _treeCrumbs.push(node.parent);
      node = node.parent;
    }
    const treeCrumbs = _treeCrumbs.reverse();

    // パンくずリスト構築
    this.wmCrumbs = [];
    treeCrumbs.forEach((item) => {
      this.wmCrumbs.push({
        id: item.id,
        type: 'FOLDER',
        origin: '',
        children: [],
        name: item.name,
      });
    });
  }

  /**
   * 測量コントローラのフォルダ階層変更
   */
  private changeWMDeviceFolder(id: string) {
    const _fieldDataList: WMDeviceControllerFieldData[] = [];

    if (this.wmDeviceDataTree) {
      let node = this.wmDeviceDataTree.findFirstById(id);

      while (node && node.data) {
        _fieldDataList.push(node.data);
        node = node.parent;
      }
    }

    if (this.selectedSurveyControllerData && _fieldDataList.length <= 0) {
      this.currentWMDeviceControllerFieldData = undefined;
      this.wmDeviceDataTree = undefined;
      this.store.dispatch(ImportPopupAction.SetFileSelectLoading());
      this.store.dispatch(
        ImportPopupAction.SetSelectedWMDeviceController({
          wmDeviceDataController: this.selectedSurveyControllerData,
        }),
      );
      return;
    }

    this.currentWMDeviceControllerFieldData = _fieldDataList[0];

    const fieldDataList = _fieldDataList.reverse();

    this.store.dispatch(
      ImportPopupAction.SetSelectedWMDeviceControllerFieldData({
        wmDeviceControllerFieldData: fieldDataList,
      }),
    );
  }
}
