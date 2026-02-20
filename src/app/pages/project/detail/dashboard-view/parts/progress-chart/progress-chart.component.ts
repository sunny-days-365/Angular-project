import { AfterViewInit, Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Store, select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { distinctUntilChanged } from 'rxjs';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DashboardSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/dashboard-selector';
import {
  ProgressChartForView,
  ProgressChartViewData,
} from 'src/app/stores/states/project/detail/dashboard-view/progress-chart.state';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';
import { DashboardWideSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/dashboard-wide.selector';
import { UpdateState } from 'src/app/stores/states/project/detail/dashboard-view/dashboard.state';
import { NumberFormatHelperService } from 'src/app/helper-utility/number-format-helper/number-format-helper.service';
import { ConstructionActivitySubType } from '../../dashboard-view.defination';
import { Actions, ofType } from '@ngrx/effects';
import { NavbarOuterFrameAction } from 'src/app/stores/actions/project/navbar-outer-frame.action';
import { ProgressChartActionReducer } from 'src/app/stores/reducers/project/detail/dashboard-view/progress-chart.reducer';
import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';

Chart.register(ChartDataLabels);

// 基本色
const colorBase: string = '#cbcdd6';
// 切土チャート用
const colorCut: string[] = ['#c81922', '#800404'];
const labelCut = ['切土完了', '切土残り'];
// 盛土チャート用
const colorFill: string[] = ['#0063a3', '#04426b'];
const labelFill = ['盛土完了', '盛土残り'];

//進捗率表示
@Component({
  selector:
    'ntc-project-project-dashboard-view-project-progress-progress-chart',
  templateUrl: './progress-chart.component.html',
  styleUrls: ['./progress-chart.component.scss'],
  providers: [Title],
})
export class ProgressChartComponent
  extends BaseComponent
  implements AfterViewInit
{
  // 切土チャート
  public cutChart: Chart<'doughnut', number[]> | undefined;
  public cutComplete: number = 0;
  public cutRemained: number = 0;
  // 盛土チャート
  public fillChart: Chart<'doughnut', number[]> | undefined;
  public fillComplete: number = 0;
  public fillRemained: number = 0;

  protected readonly _format = new NumberFormatHelperService();

  public readonly ConstructionActivitySubType = ConstructionActivitySubType;

  // 建設の進捗状態
  public chartViewData: ProgressChartViewData | undefined;

  // 読み込み中の判定
  public isLoading: boolean = true;

  public isSidebarExpanded: boolean = false;

  public activitySubType: number = ConstructionActivitySubType.cutfill;

  public showCutChart: boolean = false;
  public showFillChart: boolean = false;

  protected readonly DIGIT_DISPLAY = 1;

  // BEGIN: DEBUG ONLY - REMOVE IN PRODUCTION
  private rawDataArray: ProgressChartForView[] | undefined;
  private constructionActivity: ConstructionActivity | undefined;
  // END: DEBUG ONLY - REMOVE IN PRODUCTION

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ProgressChartComponent');

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(
          DashboardSelector.ProgressChartSelector
            .selectorProgressChartActivitySubType,
        )
        .subscribe((activitySubType: number) => {
          this.activitySubType = activitySubType;
          this.showCutChart =
            this.activitySubType === ConstructionActivitySubType.cutfill ||
            this.activitySubType === ConstructionActivitySubType.cut;
          this.showFillChart =
            this.activitySubType === ConstructionActivitySubType.cutfill ||
            this.activitySubType === ConstructionActivitySubType.fill;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(DashboardWideSelector.selectDashboardUpdateState))
        .subscribe((value) => {
          if (value == UpdateState.IN_PROCESS) {
            this.isLoading = true;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(
          select(DashboardSelector.ProgressChartSelector.selectorProgressChart),
        )
        .subscribe((value) => {
          if (!value) {
            this.isLoading = true;
          } else if (value.inProcess) {
            this.isLoading = true;
          } else {
            this.isLoading = false;
          }
          this.rawDataArray = value?.rawData;
          this.constructionActivity = value?.constructionActivity;
          this.chartViewData = value?.viewData;
        }),
    );
  }

  ngAfterViewInit(): void {
    this.addSubscriptionsList(
      this.store
        .pipe(
          select(
            DashboardSelector.ProgressChartSelector
              .selectorProgressChartCutProgressRate,
          ),
          distinctUntilChanged(),
        )
        .subscribe((x) => {
          this.updateCutChart(x);
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(
          select(
            DashboardSelector.ProgressChartSelector
              .selectorProgressChartFillProgressRate,
          ),
          distinctUntilChanged(),
        )
        .subscribe((x) => {
          this.updateFillChart(x);
        }),
    );

    // BEGIN: DEBUG ONLY - REMOVE IN PRODUCTION
    this.addSubscriptionsList(
      this.store
        .pipe(
          select(DashboardSelector.ProgressChartSelector.selectorProgressChart),
          distinctUntilChanged(),
        )
        .subscribe((data) => {
          this.rawDataArray = data?.rawData;
          this.constructionActivity = data?.constructionActivity;
        }),
    );

    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(NavbarOuterFrameAction.SetTestTodayAction))
        .subscribe(({ date }) => {
          if (!this.rawDataArray) return;
          this.chartViewData = ProgressChartActionReducer.toViewData(
            this.rawDataArray,
            this.constructionActivity,
            date,
          );

          this.updateCutChart(this.chartViewData.cutProgressRate);
          this.updateFillChart(this.chartViewData.fillProgressRate);
        }),
    );
    // END: DEBUG ONLY - REMOVE IN PRODUCTION
  }

  /**
   * 完了率を更新し、残り率を自動計算してチャートを更新する
   */
  public updateCutChart(cutComplete: number | undefined) {
    if (
      cutComplete != undefined &&
      !isNaN(cutComplete) &&
      cutComplete !== Infinity
    ) {
      cutComplete = cutComplete ?? 0;
    } else if (cutComplete === undefined || isNaN(cutComplete)) {
      cutComplete = 0;
    } else {
      this.cutChart?.destroy();
      this.cutChart = undefined;
      this.cutComplete = cutComplete;
      this.cutRemained = 0;
      return;
    }

    this.cutComplete = Number(
      this._format.formatCutfill(Number(cutComplete), false),
    );
    let _cutRemained = 0;
    if (this.cutComplete > 100) {
      const hundred = Math.floor(this.cutComplete / 100);
      _cutRemained = (this.cutComplete - hundred * 100) * -1;
    } else if (this.cutComplete < 0) {
      const hundred = Math.floor(this.cutComplete / 100);
      _cutRemained = (this.cutComplete - hundred * 100) * -1;
    } else {
      _cutRemained = 100 - this.cutComplete;
    }
    this.cutRemained = Number(
      this._format.formatCutfill(Number(_cutRemained), false),
    );

    let _cutComplete = 0;
    _cutRemained = 0;
    if (this.cutRemained < 0) {
      _cutComplete = this.cutRemained * -1;
      _cutRemained = 100 - _cutComplete;
    } else {
      _cutComplete = this.cutComplete;
      _cutRemained = this.cutRemained;
    }

    this._updateCutChart(_cutComplete, _cutRemained);
  }

  /**
   * 完了率を更新し、残り率を自動計算してチャートを更新する
   */
  public updateFillChart(fillComplete: number | undefined) {
    if (
      fillComplete != undefined &&
      !isNaN(fillComplete) &&
      fillComplete !== Infinity
    ) {
      fillComplete = fillComplete ?? 0;
    } else if (fillComplete === undefined || isNaN(fillComplete)) {
      fillComplete = 0;
    } else {
      this.fillChart?.destroy();
      this.fillChart = undefined;
      this.fillComplete = fillComplete;
      this.fillRemained = 0;
      return;
    }

    this.fillComplete = Number(
      this._format.formatCutfill(Number(fillComplete), false),
    );
    let _fillRemained = 0;
    if (this.fillComplete > 100) {
      const hundred = Math.floor(this.fillComplete / 100);
      _fillRemained = (this.fillComplete - hundred * 100) * -1;
    } else if (this.fillComplete < 0) {
      const hundred = Math.floor(this.fillComplete / 100);
      _fillRemained = (this.fillComplete - hundred * 100) * -1;
    } else {
      _fillRemained = 100 - this.fillComplete;
    }
    this.fillRemained = Number(
      this._format.formatCutfill(Number(_fillRemained), false),
    );

    let _fillComplete = 0;
    _fillRemained = 0;
    if (this.fillRemained < 0) {
      _fillComplete = this.fillRemained * -1;
      _fillRemained = 100 - _fillComplete;
    } else {
      _fillComplete = this.fillComplete;
      _fillRemained = this.fillRemained;
    }

    this._updateFillChart(_fillComplete, _fillRemained);
  }

  /**
   * 切土チャートを更新する
   */
  private _updateCutChart(_data1: number, _data2: number) {
    if (!this.cutChart) {
      this.cutChart = new Chart('cutChart', {
        type: 'doughnut',
        data: {
          labels: labelCut,
          datasets: [
            {
              data: [_data1, _data2],
              backgroundColor: [colorCut[0], colorBase],
              hoverOffset: 4,
            },
          ],
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            datalabels: {
              display: false,
            },
          },
        },

        plugins: [
          {
            id: 'text',
            beforeDraw: (chart) => {
              const width = chart.width;
              const height = chart.height;
              const ctx = chart.ctx;

              ctx.restore();
              ctx.font = "24px 'Noto Sans JP'";
              ctx.textBaseline = 'middle';

              const text = this.cutComplete + '%';
              const textX = Math.round(
                (width - ctx.measureText(text).width) / 2,
              );
              const textY = height / 2;
              ctx.fillText(text, textX, textY);
              ctx.save();
            },
          },
        ],
      });
    }
    if (this.cutComplete < -100) {
      this.cutChart.data.datasets[0].backgroundColor = [
        colorCut[0],
        colorCut[1],
      ];
      this.cutChart.data.labels = [labelCut[1], labelCut[1]];
      this.cutChart.options!.plugins!.tooltip!.callbacks = {
        label: () => {
          return this.cutComplete + '%';
        },
      };
    } else if (this.cutComplete < 0) {
      this.cutChart.data.datasets[0].backgroundColor = [colorBase, colorCut[0]];
      this.cutChart.data.labels = [labelCut[1], labelCut[1]];
      this.cutChart.options!.plugins!.tooltip!.callbacks = {
        label: () => {
          return this.cutComplete + '%';
        },
      };
    } else if (this.cutComplete > 100) {
      this.cutChart.data.datasets[0].backgroundColor = [
        colorCut[1],
        colorCut[0],
      ];
      this.cutChart.data.labels = [labelCut[0], labelCut[0]];
      this.cutChart.options!.plugins!.tooltip!.callbacks = {
        label: () => {
          return this.cutComplete + '%';
        },
      };
    } else {
      this.cutChart.data.datasets[0].backgroundColor = [colorCut[0], colorBase];
      this.cutChart.data.labels = [labelCut[0], labelCut[1]];
      this.cutChart.options!.plugins!.tooltip!.callbacks = {
        label: (context) => {
          return Number(context.raw) + '%';
        },
      };
    }
    this.cutChart.data.datasets[0].data = [_data1, _data2];
    this.cutChart.update();
  }

  /**
   * 盛土チャートを更新する
   */
  private _updateFillChart(_data1: number, _data2: number) {
    if (!this.fillChart) {
      this.fillChart = new Chart('fillChart', {
        type: 'doughnut',
        data: {
          labels: labelFill,
          datasets: [
            {
              data: [_data1, _data2],
              backgroundColor: [colorFill[0], colorBase],
              hoverOffset: 4,
            },
          ],
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            datalabels: {
              display: false,
            },
          },
        },

        plugins: [
          {
            id: 'text',
            beforeDraw: (chart) => {
              const width = chart.width;
              const height = chart.height;
              const ctx = chart.ctx;

              ctx.restore();
              ctx.font = "24px 'Noto Sans JP'";
              ctx.textBaseline = 'middle';

              const text = this.fillComplete + '%';
              const textX = Math.round(
                (width - ctx.measureText(text).width) / 2,
              );
              const textY = height / 2;
              ctx.fillText(text, textX, textY);
              ctx.save();
            },
          },
        ],
      });
    }
    if (this.fillComplete < -100) {
      this.fillChart.data.datasets[0].backgroundColor = [
        colorFill[0],
        colorFill[1],
      ];
      this.fillChart.data.labels = [labelFill[1], labelFill[1]];
      this.fillChart.options!.plugins!.tooltip!.callbacks = {
        label: () => {
          return this.fillComplete + '%';
        },
      };
    } else if (this.fillComplete < 0) {
      this.fillChart.data.datasets[0].backgroundColor = [
        colorBase,
        colorFill[0],
      ];
      this.fillChart.data.labels = [labelFill[1], labelFill[1]];
      this.fillChart.options!.plugins!.tooltip!.callbacks = {
        label: () => {
          return this.fillComplete + '%';
        },
      };
    } else if (this.fillComplete > 100) {
      this.fillChart.data.datasets[0].backgroundColor = [
        colorFill[1],
        colorFill[0],
      ];
      this.fillChart.data.labels = [labelFill[0], labelFill[0]];
      this.fillChart.options!.plugins!.tooltip!.callbacks = {
        label: () => {
          return this.fillComplete + '%';
        },
      };
    } else {
      this.fillChart.data.datasets[0].backgroundColor = [
        colorFill[0],
        colorBase,
      ];
      this.fillChart.data.labels = [labelFill[0], labelFill[1]];
      this.fillChart.options!.plugins!.tooltip!.callbacks = {
        label: (context) => {
          return Number(context.raw) + '%';
        },
      };
    }

    this.fillChart.data.datasets[0].data = [_data1, _data2];
    this.fillChart.update();
  }

  public fixedCutFillVolume(volume: number | undefined) {
    return this._format.formatCutfill(volume ?? 0.0, true, true);
  }
}
