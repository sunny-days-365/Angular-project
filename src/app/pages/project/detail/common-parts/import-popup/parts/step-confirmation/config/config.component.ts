import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  AutoCADImportSettings,
  PointCloudCsvImportSettings,
  PointCloudScaleTypes,
  PointCsvImportSettings,
} from '@nikon-trimble-sok/api-sdk-d3';
import {
  BaseComponent,
  SelectDataItem,
} from '@nikon-trimble-sok/parts-components';
import { distinctUntilChanged, startWith, take } from 'rxjs';
import {
  LinearUnitType,
  PointCloudScaleType,
} from 'src/app/helper-utility/api-helper/projects-models';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ImportPopupSettingsModel } from 'src/app/stores/strage/model/project/detail/data-3d-view/left-panel/import/import-popup-from.model';
import { ImportPopupSettingsService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-settings.service';
import {
  checkOptionOfUploadData,
  UploadDataList,
} from '../../../import-popup.definition';
import { ImportPopupSettingImportPopupComponent } from '../../csv-column-setting/csv-column-setting.component';
import { CoordinateTypeEnum } from '../../csv-column-setting/csv-column-setting.defination';

@Component({
  selector:
    'ntc-import-popup-step-confirmation-config [projectId] [uploadData]',
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss',
})
export class ImportPopupStepConfirmationConfigComponent
  extends BaseComponent
  implements OnChanges
{
  @Input()
  projectId: string | undefined;

  @ViewChild('modalSettingImport') modalSettingImport:
    | ImportPopupSettingImportPopupComponent
    | undefined;

  @Input()
  uploadData: UploadDataList = [];

  public pointCloudScaleTypes: PointCloudScaleTypes | undefined;

  public autoCADImportSettings: AutoCADImportSettings | undefined;

  public pointCsvImportSettings: PointCsvImportSettings | undefined;

  public pointCloudCsvImportSettings: PointCloudCsvImportSettings | undefined;

  public enablePointCloudScaleTypes: boolean = false;

  public enableAutoCADImportSettings: boolean = false;

  public enableCsvImportSettings: boolean = false;

  public noSettings: boolean = true;

  public settingsModel: ImportPopupSettingsModel =
    new ImportPopupSettingsModel();

  // スケールタイプ
  public readonly pointCloudScaleType: SelectDataItem[] = [
    {
      label: '地上',
      id: '' + PointCloudScaleType.ground_surface,
      disabled: false,
    },
    {
      label: 'グリッド',
      id: '' + PointCloudScaleType.grid,
      disabled: false,
    },
    {
      label: 'その他',
      id: '' + PointCloudScaleType.else,
      disabled: false,
    },
  ];

  // CADデータ変換オプション
  public readonly convertToCad: SelectDataItem[] = [
    {
      label: '図面へ変換',
      id: 'true',
      disabled: false,
    },
    {
      label: '境界線データへ変換',
      id: 'false',
      disabled: false,
    },
  ];

  // 作図単位
  public readonly linearUnitType: SelectDataItem[] = [
    {
      label: 'mm',
      id: '' + LinearUnitType.mm,
      disabled: false,
    },
    {
      label: 'cm',
      id: '' + LinearUnitType.cm,
      disabled: false,
    },
    {
      label: 'm',
      id: '' + LinearUnitType.m,
      disabled: false,
    },
  ];

  // POINTCLOUDデータ変換オプション
  public readonly convertToPoint: SelectDataItem[] = [
    {
      label: 'ポイントに変換',
      id: 'true',
      disabled: false,
    },
    {
      label: '点群データに変換',
      id: 'false',
      disabled: false,
    },
  ];

  // 座標系オプション
  public readonly csvCoordinateTypeOtions: SelectDataItem[] = [
    {
      label: '測量系',
      id: CoordinateTypeEnum.NEZ,
      disabled: false,
    },
    {
      label: '数学系',
      id: CoordinateTypeEnum.XYZ,
      disabled: false,
    },
  ];

  public form = new FormGroup({
    pointCloudScaleType: new FormControl(''),
    georeferenced: new FormControl(''),
    canCreateMultiple: new FormControl(''),
    convertToCad: new FormControl(''),
    linearUnitType: new FormControl(''),
    convertToPoint: new FormControl(''),
    csvCoordinateType: new FormControl(''),
  });

  constructor(
    private store: Store<ApplicationState>,
    private importPopupSettingsService: ImportPopupSettingsService,
  ) {
    super('ImportPopupStepConfirmationConfigComponent');

    // on change pointCloudScaleType
    this.addSubscriptionsList(
      this.form.controls['pointCloudScaleType'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.scaleType = Number(value);
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }),
    );

    // on change georeferenced
    this.addSubscriptionsList(
      this.form.controls['georeferenced'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.georeferenced = value == 'true' ? true : false;
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }),
    );

    // on change canCreateMultiple
    this.addSubscriptionsList(
      this.form.controls['canCreateMultiple'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.canCreateMultiple = value == 'true' ? true : false;
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }),
    );

    // on change convertToCad
    this.addSubscriptionsList(
      this.form.controls['convertToCad'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.convertToCad = value == 'true' ? true : false;
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }),
    );

    // on change linearUnitType
    this.addSubscriptionsList(
      this.form.controls['linearUnitType'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.unitType = Number(value);
          this.importPopupSettingsService.upsert(() => this.settingsModel);
          this.store.dispatch(
            ImportPopupAction.SetLinearUnitTypes({
              unitTypes: Number(value),
            }),
          );
        }),
    );

    // on change convertToPoint
    this.addSubscriptionsList(
      this.form.controls['convertToPoint'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.convertToPoint = value == 'true' ? true : false;
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }),
    );

    // on change csvCoordinateType
    this.addSubscriptionsList(
      this.form.controls['csvCoordinateType'].valueChanges
        .pipe(startWith(undefined), distinctUntilChanged())
        .subscribe((value) => {
          if (!this.projectId) {
            return;
          }
          this.importPopupSettingsService.setProjectId(this.projectId);
          this.settingsModel.csvCoordinateType =
            value == CoordinateTypeEnum.XYZ
              ? CoordinateTypeEnum.XYZ
              : CoordinateTypeEnum.NEZ;
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }),
    );
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['uploadData']) {
      this.checkAvailableOptions();
    }
  }

  /**
   * CSVカラム設定
   */
  public openSetting() {
    this.modalSettingImport?.open(
      this.settingsModel.convertToPoint,
      this.settingsModel.csvCoordinateType,
    );
  }

  /**
   * 初期化
   */
  public initialize() {
    this.store
      .select(ApplicationStateSelector.selectorProjectId)
      .pipe(take(1))
      .subscribe((projectId) => {
        if (!projectId) {
          return;
        }
        this.projectId = projectId;
        this.importPopupSettingsService.setProjectId(projectId);

        const storedSettings = this.importPopupSettingsService.get();
        if (storedSettings) {
          this.settingsModel = storedSettings;
        } else {
          this.settingsModel = new ImportPopupSettingsModel();
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }
        if (!this.settingsModel.csvCoordinateType) {
          this.settingsModel.csvCoordinateType = CoordinateTypeEnum.NEZ;
          this.importPopupSettingsService.upsert(() => this.settingsModel);
        }

        this.form.controls['pointCloudScaleType'].patchValue(
          this.settingsModel.scaleType.toString(),
          { emitEvent: false },
        );

        this.form.controls['georeferenced'].patchValue(
          this.settingsModel.georeferenced ? 'true' : 'false',
          { emitEvent: false },
        );

        this.form.controls['canCreateMultiple'].patchValue(
          this.settingsModel.canCreateMultiple ? 'true' : 'false',
          { emitEvent: false },
        );

        this.form.controls['convertToCad'].patchValue(
          this.settingsModel.convertToCad ? 'true' : 'false',
          { emitEvent: false },
        );

        this.form.controls['convertToPoint'].patchValue(
          this.settingsModel.convertToPoint ? 'true' : 'false',
          { emitEvent: false },
        );

        this.form.controls['csvCoordinateType'].patchValue(
          this.settingsModel.csvCoordinateType,
          { emitEvent: false },
        );

        this.form.controls['linearUnitType'].patchValue(
          this.settingsModel.unitType.toString(),
          { emitEvent: false },
        );
      });
  }

  public toggleGeoreferenced($event: unknown) {
    const pointerEvent = $event as PointerEvent;
    pointerEvent.preventDefault();
    this.form.controls['georeferenced'].patchValue(
      this.form.controls['georeferenced'].value === 'true' ? 'false' : 'true',
    );
  }

  public toggleCanCreateMultiple($event: unknown) {
    const pointerEvent = $event as PointerEvent;
    pointerEvent.preventDefault();
    this.form.controls['canCreateMultiple'].patchValue(
      this.form.controls['canCreateMultiple'].value === 'true'
        ? 'false'
        : 'true',
    );
  }

  private checkAvailableOptions() {
    const {
      enablePointCloudScaleTypes,
      enableAutoCADImportSettings,
      enableCsvImportSettings,
    } = checkOptionOfUploadData(this.uploadData);
    this.enablePointCloudScaleTypes = enablePointCloudScaleTypes;
    this.enableAutoCADImportSettings = enableAutoCADImportSettings;
    this.enableCsvImportSettings = enableCsvImportSettings;

    if (
      this.enablePointCloudScaleTypes ||
      this.enableAutoCADImportSettings ||
      this.enableCsvImportSettings
    ) {
      this.noSettings = false;
    } else {
      this.noSettings = true;
    }
  }
}
