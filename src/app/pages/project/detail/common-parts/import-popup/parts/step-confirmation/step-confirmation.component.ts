import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, combineLatest, firstValueFrom, map, of, take } from 'rxjs';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  DropDataListItem,
  ImportStepEnum,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';
import { ImportPopupStepConfirmationConfigComponent } from './config/config.component';
import { ImportPopupSettingsService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-settings.service';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { ImportPopupSettingsModel } from 'src/app/stores/strage/model/project/detail/data-3d-view/left-panel/import/import-popup-from.model';
import {
  PointCsvImportSettingsService,
  PointCloudCsvImportSettingsService,
} from '@nikon-trimble-sok/api-sdk-d3';
import {
  checkOptionOfUploadData,
  UploadDataList,
} from '../../import-popup.definition';

@Component({
  selector: 'ntc-import-popup-step-confirmation',
  templateUrl: './step-confirmation.component.html',
  styleUrls: ['./step-confirmation.component.scss'],
})
export class ImportPopupStepConfirmationComponent
  extends BaseComponent
  implements OnInit, OnDestroy
{
  @ViewChild('config') config:
    | ImportPopupStepConfirmationConfigComponent
    | undefined;

  public projectId: string | undefined;

  public uploadData: UploadDataList = [];

  public isLoading: boolean = false;

  private intersectionObserver: IntersectionObserver | undefined;

  get isDisableCancelButton() {
    return true;
  }

  get isDisableNextButton() {
    return this.uploadData.length <= 0;
  }

  constructor(
    private elementRef: ElementRef,
    private store: Store<ApplicationState>,
    private pointCsvImportSettingsService: PointCsvImportSettingsService,
    private pointCloudCsvImportSettingsService: PointCloudCsvImportSettingsService,
    private importPopupSettingsService: ImportPopupSettingsService,
  ) {
    super('ImportPopupStepConfirmationComponent');

    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectId)
        .subscribe((projectId) => {
          if (!projectId) {
            return;
          }
          this.projectId = projectId;
        }),
    );

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ImportPopupSelector.selectorUploadFiles),
        this.store.select(ImportPopupSelector.selectorFilesSelected),
        this.store.select(
          ImportPopupSelector.selectWMwmDeviceControllerFieldDataSelectedItemList,
        ),
      ]).subscribe(
        ([
          _uploadFiles,
          selectedFilesFromTree,
          wmDeviceControllerFieldDataSelectedItemList,
        ]) => {
          this.uploadData = [
            ..._uploadFiles,
            ...selectedFilesFromTree,
            ...wmDeviceControllerFieldDataSelectedItemList,
          ].map((item) => ({
            name: item.name,
            size: item.size,
            isFolder: (item as DropDataListItem).isFolder,
          }));
        },
      ),
    );
  }

  ngOnInit(): void {
    // このコンポーネントの可視状態を監視
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // 初期化
        if (this.config) {
          this.isLoading = true;
          this.config.initialize();
          this.isLoading = false;
        }
      });
    });
    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  async onOk() {
    if (!this.projectId) {
      return;
    }

    this.isLoading = true;

    this.importPopupSettingsService.setProjectId(this.projectId);

    let storedSettings = this.importPopupSettingsService.get();
    if (!storedSettings) {
      storedSettings = new ImportPopupSettingsModel();
    }

    // アップロードファイルの種類からオプションをチェック
    const {
      enableCsvImportSettings,
      // enablePointCloudScaleTypes,
      // enableAutoCADImportSettings,
    } = checkOptionOfUploadData(this.uploadData);

    // CSVの設定を読み込む必要がある場合
    if (enableCsvImportSettings) {
      // CSVの設定を読み込み
      const { pointCsvImportSettings, pointCloudCsvImportSettings } =
        await firstValueFrom(
          combineLatest([
            this.pointCsvImportSettingsService.pointCsvImportSettingsGet(
              this.projectId,
            ),
            this.pointCloudCsvImportSettingsService.pointCloudCsvImportSettingsGet(
              this.projectId,
            ),
          ]).pipe(
            take(1),
            map(([pointCsvImportSettings, pointCloudCsvImportSettings]) => {
              return {
                pointCsvImportSettings: pointCsvImportSettings,
                pointCloudCsvImportSettings: pointCloudCsvImportSettings,
              };
            }),
            catchError(() => {
              return of({
                pointCsvImportSettings: undefined,
                pointCloudCsvImportSettings: undefined,
              });
            }),
          ),
        );
      // ローカルストレージに格納
      storedSettings.pointCsvImportSettings = pointCsvImportSettings;
      storedSettings.pointCloudCsvImportSettings = pointCloudCsvImportSettings;
    }

    this.importPopupSettingsService.upsert(() => storedSettings!);

    this.isLoading = false;

    this.store.dispatch(
      ImportPopupAction.ExecuteImport({
        importPopupSettingsModel: storedSettings,
      }),
    );

    // change step to confimation
    this.store.dispatch(
      ImportPopupAction.SetCurrentStep({
        step: ImportStepEnum.Import,
      }),
    );
  }

  onCancel() {}

  public override ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    super.ngOnDestroy();
  }
}
