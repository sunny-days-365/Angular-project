import { Component, EventEmitter, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { environment } from 'src/environments/environment';
import { PaginationControl } from 'src/app/helper-utility/pagination-helper/pagination-helper.definition';
import { WMDeviceData, WMProjectLink } from '@nikon-trimble-sok/api-sdk-d3';
import { ColumnIds } from './survey-controller.defination';
import {
  NTCTableColumn,
  NTCTableSortOptions,
} from 'src/app/parts-components/basic-table/basic-table.definition';
import {
  combineLatest,
  distinctUntilChanged,
  Observable,
  of,
  Subject,
  takeUntil,
} from 'rxjs';
import { ProjectListSelector } from 'src/app/stores/selectors/project-list/ProjectListState.selector';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ImportStepEnum } from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { Actions, ofType } from '@ngrx/effects';
import { WmProjectSelector } from 'src/app/stores/selectors/project/wm-project.selector';
import { WmProjectAction } from 'src/app/stores/actions/project/wm-project.action';

@Component({
  selector: 'ntc-import-popup-step-select-file-survey-controller',
  templateUrl: './survey-controller.component.html',
  styleUrls: ['./survey-controller.component.scss'],
})
export class ImportPopupStepSelectFileSurveyControllerComponent extends BaseComponent {
  @Output() dataToParent = new EventEmitter<WMDeviceData>();

  public isLoading$: Observable<boolean> = of(false);

  public wmDeviceData$: Observable<WMDeviceData[]> = of([]);

  public wmProjectLink$: Observable<WMProjectLink | undefined> = of();

  public defaultSort: NTCTableSortOptions | undefined;

  public DEFAULT_THUMBNAIL = `${environment.AssetsRootPath}img/setting/default_thumbnail.svg`;

  public selectedSurveyControllerData: WMDeviceData | undefined;
  public wmProjectLink: WMProjectLink | undefined;

  public paginationControl: PaginationControl<WMDeviceData> = {
    data: [],
    actions: {
      loadMore: () => {},
      reload: () => {},
      run: () => {},
    },
  };

  public readonly columns: NTCTableColumn<WMDeviceData>[] = [
    {
      display: '',
      id: ColumnIds.Thumbnail,
      width: '40px',
      render() {
        return `${environment.AssetsRootPath}img/setting/default_thumbnail.svg`;
      },
    },
    {
      display: 'デバイス名',
      id: ColumnIds.DeviceName,
      sorter: true,
      ellipsis: true,
      minWidth: '70px',
      maxWidth: '100px',
    },
    {
      display: 'シリアル番号',
      id: ColumnIds.serialNumber,
      minWidth: '70px',
      maxWidth: '100px',
      sorter: true,
      ellipsis: true,
    },
    {
      display: '説明',
      minWidth: '70px',
      maxWidth: '100px',
      ellipsis: true,
      sorter: true,
      id: ColumnIds.Description,
    },
  ];

  private initializeSubject$ = new Subject();

  get isDisableNextButton() {
    return this.selectedSurveyControllerData === undefined;
  }

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ImportPopupStepSelectFileSurveyControllerComponent');

    this.wmProjectLink$ = this.store.select(
      ProjectListSelector.selectorWmProjectLink,
    );

    this.addSubscriptionsList(
      this.wmProjectLink$.subscribe((_wmProjectLink) => {
        this.wmProjectLink = _wmProjectLink;
        if (!this.wmProjectLink || !this.wmProjectLink.wmProjectId) {
          return;
        }

        this.store.dispatch(
          WmProjectAction.GetWmProjectsDevicesAction({
            wmProjectId: this.wmProjectLink?.wmProjectId || '',
          }),
        );
      }),
    );

    // データ取得後は１回だけ実行
    this.addSubscriptionsList(
      combineLatest([
        this.store.select(ImportPopupSelector.selectorCurrentStep),
        this.store.select(WmProjectSelector.selectorWmProjectDevices),
      ])
        .pipe(takeUntil(this.initializeSubject$))
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return (
              curr[0] !== ImportStepEnum.SelectSurveyController &&
              (curr !== undefined || prev[0] === curr[0])
            );
          }),
        )
        .subscribe((value) => {
          // 画面を開いた時、かつ、データ取得前
          if (
            value[0] === ImportStepEnum.SelectSurveyController &&
            value[1] === undefined
          ) {
            this.store.dispatch(ImportPopupAction.SetFileSelectLoading());
          }
          // 画面を開いた時、かつ、データ取得後
          if (value[0] === ImportStepEnum.SelectSurveyController && value[1]) {
            this.initializeSubject$.next(void 0);
            this.paginationControl.data = value[1];
            // ページネーション制御の実行
            this.paginationControl.actions.run();
            this.store.dispatch(ImportPopupAction.UnsetFileSelectLoading());
          }
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(ImportPopupAction.ResetSelectedWMDeviceController))
        .subscribe(() => {
          this.selectedSurveyControllerData = undefined;
        }),
    );
  }

  saveUploadDataToStore() {}

  onSortChange(sort: NTCTableSortOptions) {
    this.defaultSort = sort;
  }

  isSelected(row: WMDeviceData): boolean {
    return this.selectedSurveyControllerData == row;
  }

  onRowActionClick(row: WMDeviceData) {
    this.selectedSurveyControllerData = { ...row };

    if (this.selectedSurveyControllerData && this.wmProjectLink?.wmAccountId) {
      this.dataToParent.emit(this.selectedSurveyControllerData);
      this.store.dispatch(
        ImportPopupAction.SetSelectedWMDeviceController({
          wmDeviceDataController: this.selectedSurveyControllerData,
        }),
      );
      this.store.dispatch(ImportPopupAction.SetFileSelectLoading());
      this.store.dispatch(ImportPopupAction.ResetSelectedList());
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: ImportStepEnum.File,
        }),
      );
    }
  }

  onScrollDown() {
    this.paginationControl.actions.loadMore();
  }
}
