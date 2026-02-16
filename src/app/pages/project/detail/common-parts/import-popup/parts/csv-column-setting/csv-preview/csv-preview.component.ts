import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import {
  PointCsvImportSettings,
  PointCloudCsvImportSettings,
  CsvPreviewService,
  CsvPreviewSettings,
  QueryCsvPreviewParam,
  CsvPreviewLine,
} from '@nikon-trimble-sok/api-sdk-d3';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { firstValueFrom } from 'rxjs';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import {
  CoordinateTypeEnum,
  EAST_SUFFIX,
  MAX_COLLUMN_NUM,
  NORTH_SUFFIX,
  ViewPointCloudCsvImportSettings,
  ViewPointCsvImportSettings,
} from '../csv-column-setting.defination';

@Component({
  selector: 'ntc-import-popup-csv-preview',
  templateUrl: './csv-preview.component.html',
  styleUrl: './csv-preview.component.scss',
})
export class ImportPopupCsvPreviewComponent extends BaseComponent {
  @ViewChild('modalPreview') modalPreview: BasicModalComponent | undefined;

  @Output() emitOnClose = new EventEmitter<boolean>();

  // CSVカラム設定
  public pointCsvImportSettings: ViewPointCsvImportSettings | undefined;
  public pointCloudCsvImportSettings:
    | ViewPointCloudCsvImportSettings
    | undefined;

  public convertToPoint: boolean = true;

  public csvCoordinateType: CoordinateTypeEnum | undefined;

  public pointCsvPreviewSettings: CsvPreviewSettings[] = [];
  public pointCloudCsvPreviewSettings: CsvPreviewSettings[] = [];
  public csvRows: CsvPreviewLine[] = [];

  public isLoading: boolean = true;

  public hasError: boolean = false;

  public errorMessage: string | undefined = undefined;

  public COLUMN_NONE = 'none';
  public COLUMN_POINTNAME_NAME = '測点名';
  public COLUMN_NORTHING_NAME = '北距';
  public COLUMN_EASTING_NAME = '東距';
  public COLUMN_ELEVATION_NAME = '標高';
  public COLUMN_R_NAME = 'R値';
  public COLUMN_G_NAME = 'G値';
  public COLUMN_B_NAME = 'B値';
  public COLUMN_INTENSITY_NAME = '反射強度';
  public COLUMN_X_NAME = 'X座標';
  public COLUMN_Y_NAME = 'Y座標';

  public pointColumnCaptionList: string[] = [];
  public pointColumnCaptionSuffixList: string[] = [];
  public pointCloudColumnCaptionList: string[] = [];
  public pointCloudColumnCaptionSuffixList: string[] = [];

  public xSuffix: string = '';
  public ySuffix: string = '';

  constructor(private csvPreviewService: CsvPreviewService) {
    super('ImportPopupCsvPreviewComponent');
  }

  /**
   * モーダルを開き、値チェックを行う
   */
  public open(
    convertToPoint: boolean,
    csvCoordinateType: CoordinateTypeEnum,
    pointCsvImportSettings: PointCsvImportSettings,
    pointCloudCsvImportSettings: PointCloudCsvImportSettings,
    sampleLines: string[],
  ) {
    this.convertToPoint = convertToPoint;
    this.csvCoordinateType = csvCoordinateType ?? CoordinateTypeEnum.NEZ;
    if (this.csvCoordinateType === CoordinateTypeEnum.NEZ) {
      this.xSuffix = NORTH_SUFFIX;
      this.ySuffix = EAST_SUFFIX;
    } else {
      this.xSuffix = EAST_SUFFIX;
      this.ySuffix = NORTH_SUFFIX;
    }

    // エラーチェック
    this.hasError = false;
    this.errorMessage = undefined;
    this.checkPointCsvSettings(pointCsvImportSettings);
    this.checkPointCloudCsvSettings(pointCloudCsvImportSettings);

    // エラーがなければView用のモデルに詰め替え
    if (!this.hasError) {
      this.pointCsvImportSettings = {
        ignoreRowCount: pointCsvImportSettings.ignoreRowCount ?? 0,
        pointNameIndex: pointCsvImportSettings.pointNameIndex ?? 0,
        northingIndex: pointCsvImportSettings.northingIndex ?? 0,
        eastingIndex: pointCsvImportSettings.eastingIndex ?? 0,
        elevationIndex: pointCsvImportSettings.elevationIndex ?? 0,
      };
      this.pointCloudCsvImportSettings = {
        ignoreRowCount: pointCloudCsvImportSettings.ignoreRowCount ?? 0,
        northingIndex: pointCloudCsvImportSettings.northingIndex ?? 0,
        eastingIndex: pointCloudCsvImportSettings.eastingIndex ?? 0,
        elevationIndex: pointCloudCsvImportSettings.elevationIndex ?? 0,
        redIndex: pointCloudCsvImportSettings.redIndex ?? 0,
        greenIndex: pointCloudCsvImportSettings.greenIndex ?? 0,
        blueIndex: pointCloudCsvImportSettings.blueIndex ?? 0,
        intensityIndex: pointCloudCsvImportSettings.intensityIndex ?? 0,
      };
    }

    if (!this.pointCsvImportSettings || !this.pointCloudCsvImportSettings) {
      return;
    }

    const _pointCsvPreviewSettings = new Array(MAX_COLLUMN_NUM);
    _pointCsvPreviewSettings.fill(false);
    _pointCsvPreviewSettings[this.pointCsvImportSettings.pointNameIndex] =
      this.COLUMN_POINTNAME_NAME;
    _pointCsvPreviewSettings[this.pointCsvImportSettings.northingIndex] =
      this.COLUMN_NORTHING_NAME;
    _pointCsvPreviewSettings[this.pointCsvImportSettings.eastingIndex] =
      this.COLUMN_EASTING_NAME;
    if (this.pointCsvImportSettings.elevationIndex >= 0) {
      _pointCsvPreviewSettings[this.pointCsvImportSettings.elevationIndex] =
        this.COLUMN_ELEVATION_NAME;
    }

    const _pointCloudCsvImportSettings = new Array(MAX_COLLUMN_NUM);
    _pointCloudCsvImportSettings.fill(false);
    _pointCloudCsvImportSettings[
      this.pointCloudCsvImportSettings.eastingIndex
    ] = this.COLUMN_EASTING_NAME;
    _pointCloudCsvImportSettings[
      this.pointCloudCsvImportSettings.northingIndex
    ] = this.COLUMN_NORTHING_NAME;
    _pointCloudCsvImportSettings[
      this.pointCloudCsvImportSettings.elevationIndex
    ] = this.COLUMN_ELEVATION_NAME;
    if (this.pointCloudCsvImportSettings.redIndex >= 0) {
      _pointCloudCsvImportSettings[this.pointCloudCsvImportSettings.redIndex] =
        this.COLUMN_R_NAME;
    }
    if (this.pointCloudCsvImportSettings.greenIndex >= 0) {
      _pointCloudCsvImportSettings[
        this.pointCloudCsvImportSettings.greenIndex
      ] = this.COLUMN_G_NAME;
    }
    if (this.pointCloudCsvImportSettings.blueIndex >= 0) {
      _pointCloudCsvImportSettings[this.pointCloudCsvImportSettings.blueIndex] =
        this.COLUMN_B_NAME;
    }
    if (this.pointCloudCsvImportSettings.intensityIndex >= 0) {
      _pointCloudCsvImportSettings[
        this.pointCloudCsvImportSettings.intensityIndex
      ] = this.COLUMN_INTENSITY_NAME;
    }

    this.pointCsvPreviewSettings = [];
    this.pointCloudCsvPreviewSettings = [];

    // API用のパラメータ整理
    for (let i = 0; i < MAX_COLLUMN_NUM; i++) {
      if (!_pointCsvPreviewSettings[i]) continue;
      this.pointCsvPreviewSettings.push({
        columnIndex: i,
        columnName: _pointCsvPreviewSettings[i],
      });
    }

    for (let i = 0; i < MAX_COLLUMN_NUM; i++) {
      if (!_pointCloudCsvImportSettings[i]) continue;
      this.pointCloudCsvPreviewSettings.push({
        columnIndex: i,
        columnName: _pointCloudCsvImportSettings[i],
      });
    }

    // カラムキャプション設定
    this.arrangeColumnName();

    // API用パラメータ
    const ignoreRowCount =
      (this.convertToPoint
        ? this.pointCsvImportSettings?.ignoreRowCount
        : this.pointCloudCsvImportSettings?.ignoreRowCount) ?? 0;

    const payload: QueryCsvPreviewParam = {
      lines: sampleLines,
      ignoreRowCount: ignoreRowCount,
      previewSettings: this.convertToPoint
        ? this.pointCsvPreviewSettings
        : this.pointCloudCsvPreviewSettings,
    };

    this.isLoading = true;
    // プレビューAPI呼び出し
    firstValueFrom(this.csvPreviewService.csvPreviewPost(payload))
      .then((response) => {
        this.csvRows = response.lines ?? [];
      })
      .catch(() => {})
      .finally(() => {
        this.isLoading = false;
      });

    this.modalPreview?.open();
  }

  public close() {
    this.csvRows = [];
    this.pointColumnCaptionList = [];
    this.pointCloudColumnCaptionList = [];
    this.emitOnClose.emit();
    this.modalPreview?.close();
  }

  private arrangeColumnName() {
    this.pointColumnCaptionList = [];
    this.pointCloudColumnCaptionList = [];
    for (const pointCsvPreviewSetting of this.pointCsvPreviewSettings) {
      if (pointCsvPreviewSetting.columnName === this.COLUMN_NORTHING_NAME) {
        this.pointColumnCaptionList.push(this.COLUMN_X_NAME + this.xSuffix);
      } else if (
        pointCsvPreviewSetting.columnName === this.COLUMN_EASTING_NAME
      ) {
        this.pointColumnCaptionList.push(this.COLUMN_Y_NAME + this.ySuffix);
      } else {
        this.pointColumnCaptionList.push(
          pointCsvPreviewSetting.columnName ?? '',
        );
      }
    }
    for (const pointCloudCsvPreviewSetting of this
      .pointCloudCsvPreviewSettings) {
      if (
        pointCloudCsvPreviewSetting.columnName === this.COLUMN_NORTHING_NAME
      ) {
        this.pointCloudColumnCaptionList.push(
          this.COLUMN_X_NAME + this.xSuffix,
        );
      } else if (
        pointCloudCsvPreviewSetting.columnName === this.COLUMN_EASTING_NAME
      ) {
        this.pointCloudColumnCaptionList.push(
          this.COLUMN_Y_NAME + this.ySuffix,
        );
      } else {
        this.pointCloudColumnCaptionList.push(
          pointCloudCsvPreviewSetting.columnName ?? '',
        );
      }
    }
  }

  /**
   * ポイントの設定チェック
   */
  private checkPointCsvSettings(
    pointCsvImportSettings: PointCsvImportSettings,
  ) {
    if (!pointCsvImportSettings) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCsvImportSettings.pointNameIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCsvImportSettings.northingIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCsvImportSettings.eastingIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCsvImportSettings?.elevationIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
  }

  /**
   * 点群データの設定チェック
   */
  private checkPointCloudCsvSettings(
    pointCloudCsvImportSettings: PointCloudCsvImportSettings,
  ) {
    if (!pointCloudCsvImportSettings) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCloudCsvImportSettings.northingIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCloudCsvImportSettings.eastingIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCloudCsvImportSettings.elevationIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCloudCsvImportSettings.redIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCloudCsvImportSettings.greenIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
    if (pointCloudCsvImportSettings.blueIndex === undefined) {
      this.hasError = true;
      this.errorMessage = extractAppMessage('SOK1102');
      return;
    }
  }
}
