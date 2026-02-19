import { Component, ElementRef, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Store, select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Observable } from 'rxjs';
import { ConstructionProgressSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/construction-progress.selector';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';
import {
  ConstructionProgressState,
  ConstructionProgressViewData,
  ConstructionProgressForView,
} from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';
import { DashboardWideSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/dashboard-wide.selector';
import { UpdateState } from 'src/app/stores/states/project/detail/dashboard-view/dashboard.state';
import { Actions, ofType } from '@ngrx/effects';
import { NavbarOuterFrameAction } from 'src/app/stores/actions/project/navbar-outer-frame.action';
import {
  ConstructionActivitySubType,
  toViewData,
} from '../../dashboard-view.defination';

Chart.register(ChartDataLabels);

//進捗率表示
@Component({
  selector:
    'ntc-project-project-dashboard-view-project-progress-construction-progress',
  templateUrl: './construction-progress.component.html',
  styleUrls: ['./construction-progress.component.scss'],
  providers: [Title],
})
export class ConstructionProgressComponent extends BaseComponent {
  public chart: Chart | undefined;

  // 建設の進捗状態
  public readonly constructionProgress$: Observable<
    ConstructionProgressState | undefined
  >;

  public MAX_TICKS_LIMIT: number = 5;

  // *** デバッグ用設定 ***
  // 画面上に表示される「今日」の日付を上書きする。
  // 以下パラメータに入力した日付を「今日」として扱い、計算を行う。
  public testToday: Date | undefined = undefined;
  // *** デバッグ用設定 ***

  public cpViewData: ConstructionProgressViewData | undefined;

  // 読み込み中の判定
  public isLoading: boolean = true;

  public rawDataArray: ConstructionProgressForView[] | undefined;

  public constructionActivity: ConstructionActivity | undefined;

  public isSidebarExpanded: boolean = false;

  public displayDesignVolumeMax: number | undefined;

  public displayDesignVolumeMin: number | undefined;

  public displayProgressRateMax: number | undefined;

  public displayProgressRateMin: number | undefined;

  public titleText: string = '';

  public cutText: string = '切土';

  public fillText: string = '盛土';

  private currentSelected = false;

  @ViewChild('progressChart') private progressChart?: ElementRef;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ConstructionProgressComponent');

    this.constructionProgress$ = this.store.pipe(
      select(ConstructionProgressSelector.selectorConstructionProgress),
    );

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(ConstructionProgressSelector.selectorConstructionProgress))
        .subscribe((item) => {
          this.rawDataArray = item?.rawData;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(ConstructionProgressSelector.selectorConstructionActive))
        .subscribe((item) => {
          this.constructionActivity = item?.contructionActivities;
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
        .pipe(select(ConstructionProgressSelector.selectorConstructionProgress))
        .subscribe((value) => {
          if (!value) {
            this.isLoading = true;
          } else if (value.inProcess) {
            this.isLoading = true;
          } else {
            this.isLoading = false;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(
          select(
            ConstructionProgressSelector.selectorConstructionProgressViewData,
          ),
        )
        .subscribe((currentChartViewData) => {
          try {
            if (currentChartViewData) {
              // 切土、盛土の値がマイナスだった部分を除去した配列
              this.cpViewData = {
                dateTimeArray: [],
                goalArray: [],
                cutVolumeArray: [],
                fillVolumeArray: [],
                targetProgressRateArray: [],
                remainedCutArray: [],
                remainedFillArray: [],
                startDate: this.constructionActivity?.startTime ?? new Date(),
                goalEndDate: this.constructionActivity?.endTime ?? new Date(),
              };

              for (
                let i = 0;
                i < (currentChartViewData?.dateTimeArray.length ?? 0);
                i++
              ) {
                let isOk = true;
                if (
                  currentChartViewData?.cutVolumeArray[i] &&
                  currentChartViewData?.cutVolumeArray[i] < 0
                ) {
                  // Still show chart when cutVolume is negative
                  isOk = true;
                }

                if (isOk) {
                  this.cpViewData.dateTimeArray.push(
                    currentChartViewData?.dateTimeArray[i] ?? '',
                  );
                  this.cpViewData.goalArray.push(
                    currentChartViewData?.goalArray[i] ?? 0,
                  );
                  this.cpViewData.cutVolumeArray.push(
                    currentChartViewData?.cutVolumeArray[i] ?? 0,
                  );
                  this.cpViewData.fillVolumeArray.push(
                    currentChartViewData?.fillVolumeArray[i] ?? 0,
                  );
                  this.cpViewData.remainedCutArray.push(
                    currentChartViewData?.remainedCutArray[i] ?? 0,
                  );
                  this.cpViewData.remainedFillArray.push(
                    currentChartViewData?.remainedFillArray[i] ?? 0,
                  );
                  this.cpViewData.targetProgressRateArray.push(
                    currentChartViewData?.targetProgressRateArray[i] ?? 0,
                  );
                }
              }

              this.chart?.destroy();
              this.currentSelected = false;

              this.createConstructionProgressChart(
                this.cpViewData.dateTimeArray ?? [],
                this.cpViewData.goalArray ?? [],
                this.cpViewData.cutVolumeArray ?? [],
                this.cpViewData.fillVolumeArray ?? [],
                this.cpViewData.targetProgressRateArray ?? [],
              );
            }
          } catch (exp) {
            // [Memo]
            // stremaが止まってしまうと表示が更新されなくなるので、
            // 例外が発生したとしても、一端ここで拾って処理する
            this.L.error(exp);
          }
        }),
    );

    // BEGIN: DEBUG ONLY - REMOVE IN PRODUCTION
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(NavbarOuterFrameAction.SetTestTodayAction))
        .subscribe(({ date }) => {
          if (!this.rawDataArray) return;
          this.testToday = date;

          this.updateFormatChart(
            toViewData(
              this.rawDataArray,
              this.constructionActivity,
              this.currentSelected,
              undefined,
              undefined,
              this.testToday,
            ),
          );
        }),
    );
    // END: DEBUG ONLY - REMOVE IN PRODUCTION
  }

  get isCurrentSelected(): boolean {
    return this.currentSelected;
  }

  public graphSwitching(currentSelected: boolean) {
    // 差分・累積表示アイコン押下時の切り替え機能を作成
    this.currentSelected = currentSelected;
    if (this.rawDataArray) {
      this.updateFormatChart(
        toViewData(
          this.rawDataArray,
          this.constructionActivity,
          this.currentSelected,
          undefined,
          undefined,
          this.testToday,
        ),
      );
    }
  }

  public updateFormatChart(data: ConstructionProgressViewData): void {
    // 切土、盛土の値がマイナスだった部分を除去した配列
    this.cpViewData = {
      dateTimeArray: [],
      goalArray: [],
      cutVolumeArray: [],
      fillVolumeArray: [],
      remainedCutArray: [],
      remainedFillArray: [],
      targetProgressRateArray: [],
      startDate: this.constructionActivity?.startTime ?? new Date(),
      goalEndDate: this.constructionActivity?.endTime ?? new Date(),
    };

    for (let i = 0; i < (data?.dateTimeArray.length ?? 0); i++) {
      this.cpViewData.dateTimeArray.push(data?.dateTimeArray[i] ?? '');
      this.cpViewData.goalArray.push(data?.goalArray[i] ?? 0);
      this.cpViewData.cutVolumeArray.push(data?.cutVolumeArray[i] ?? 0);
      this.cpViewData.fillVolumeArray.push(data?.fillVolumeArray[i] ?? 0);
      this.cpViewData.remainedCutArray.push(data?.remainedCutArray[i] ?? 0);
      this.cpViewData.remainedFillArray.push(data?.remainedFillArray[i] ?? 0);
      this.cpViewData.targetProgressRateArray.push(
        data?.targetProgressRateArray[i] ?? 0,
      );
    }

    this.chart?.destroy();

    this.createConstructionProgressChart(
      this.cpViewData.dateTimeArray ?? [],
      this.cpViewData.goalArray ?? [],
      this.cpViewData.cutVolumeArray ?? [],
      this.cpViewData.fillVolumeArray ?? [],
      this.cpViewData.targetProgressRateArray ?? [],
    );
  }

  // グラフ最大値を桁数に応じて丸める
  private round(volume: number) {
    let base = '1';
    const digit = volume.toString().length - 1;
    for (let i = 0; i < digit - 1; i++) {
      base = base + '0';
    }
    return Math.round(volume / Number(base)) * Number(base);
  }

  // 進捗グラフを表示する
  private createConstructionProgressChart(
    dateTimeArray: string[],
    goalArray: number[],
    cutVolumeArray: number[],
    fillVolumeArray: number[],
    targetProgressRateArray: number[],
  ) {
    const canvas = this.progressChart?.nativeElement;

    if (!canvas) return;

    if (this.rawDataArray) {
      const designCutVolume = this.rawDataArray[0].design?.cutVolume ?? 0;
      const designFillVolume = this.rawDataArray[0].design?.fillVolume ?? 0;
      const totalDesignVolume = Math.ceil(designCutVolume + designFillVolume);

      if (this.currentSelected) {
        let totalCutFillVolumeMax = 0;
        let totalCutFillVolumeMin = 0;
        for (let i = 0; i < dateTimeArray.length; i++) {
          const cutVolume = cutVolumeArray[i];
          const fillVolume = fillVolumeArray[i];
          const totalCutFillVolume = cutVolumeArray[i] + fillVolumeArray[i];
          if (
            totalCutFillVolumeMax < totalCutFillVolume ||
            (cutVolume >= 0 &&
              fillVolume < 0 &&
              totalCutFillVolumeMax < cutVolume) ||
            (fillVolume >= 0 &&
              cutVolume < 0 &&
              totalCutFillVolumeMax < fillVolume)
          ) {
            if (cutVolume >= 0 && fillVolume < 0) {
              totalCutFillVolumeMax = cutVolume;
            } else if (fillVolume >= 0 && cutVolume < 0) {
              totalCutFillVolumeMax = fillVolume;
            } else {
              totalCutFillVolumeMax = totalCutFillVolume;
            }
          }

          if (
            totalCutFillVolumeMin > totalCutFillVolume ||
            (cutVolume >= 0 &&
              fillVolume < 0 &&
              totalCutFillVolumeMin > fillVolume) ||
            (fillVolume >= 0 &&
              cutVolume < 0 &&
              totalCutFillVolumeMin > cutVolume)
          ) {
            if (cutVolume >= 0 && fillVolume < 0) {
              totalCutFillVolumeMin = fillVolume;
            } else if (fillVolume >= 0 && cutVolume < 0) {
              totalCutFillVolumeMin = cutVolume;
            } else {
              totalCutFillVolumeMin = totalCutFillVolume;
            }
          }
        }

        // max,minの値によってはグラフをはみ出る場合があるため、余白を用意する
        if (totalCutFillVolumeMax) {
          totalCutFillVolumeMax = totalCutFillVolumeMax * 1.2;
        }
        if (totalCutFillVolumeMin) {
          totalCutFillVolumeMin = totalCutFillVolumeMin * 1.2;
        }

        // 日々のグラフの場合、目標進捗率のY軸は切土/盛土量と同等の値に変更する
        this.displayDesignVolumeMax = this.round(
          Math.ceil(totalCutFillVolumeMax),
        );
        this.displayDesignVolumeMin = this.round(
          Math.floor(totalCutFillVolumeMin),
        );
        this.displayProgressRateMax = this.round(
          Math.floor(totalCutFillVolumeMax),
        );
        this.displayProgressRateMin = this.round(
          Math.floor(totalCutFillVolumeMin),
        );
      } else {
        // chartのmax
        let totalCutFillVolumeMin = 0;
        let totalCutFillVolumeMax = totalDesignVolume;
        for (let i = 0; i < dateTimeArray.length; i++) {
          totalCutFillVolumeMax = Math.max(
            totalCutFillVolumeMax,
            cutVolumeArray[i],
            fillVolumeArray[i],
          );
          totalCutFillVolumeMin = Math.min(
            totalCutFillVolumeMin,
            cutVolumeArray[i],
            fillVolumeArray[i],
          );
        }
        this.displayDesignVolumeMax = this.round(
          Math.ceil(totalCutFillVolumeMax),
        );
        this.displayDesignVolumeMin =
          this.round(Math.ceil(totalCutFillVolumeMin)) * 1.2;
        this.displayProgressRateMax = 100;
        this.displayProgressRateMin =
          (100 * (this.displayDesignVolumeMin ?? 1)) /
          this.displayDesignVolumeMax;
      }

      // 見出し
      if (this.currentSelected) {
        this.titleText = '当初目標値';
      } else {
        this.titleText = '目標進捗率';
      }

      // 項目名
      if (
        this.constructionActivity?.activitySubType ===
        ConstructionActivitySubType.cut
      ) {
        this.cutText = '切土';
        this.fillText = 'hiddenFill';
      } else if (
        this.constructionActivity?.activitySubType ===
        ConstructionActivitySubType.fill
      ) {
        this.cutText = 'hiddenCut';
        this.fillText = '盛土';
      } else {
        this.cutText = '切土';
        this.fillText = '盛土';
      }
    }

    // 縦軸の一方を進捗率％とし、進捗率を折れ線グラフにして複合で表示する
    this.chart = new Chart('ConstructionProgress', {
      data: {
        labels: dateTimeArray,
        datasets: [
          {
            type: 'line',
            label: this.titleText,
            data: targetProgressRateArray,
            xAxisID: 'xCutFill',
            yAxisID: 'yCutFillLine',
            borderColor: '#FEC157',
            backgroundColor: '#FEC157',
            borderWidth: 1.5,
          },
          {
            type: 'bar',
            label: '目標出来高',
            data: goalArray,
            xAxisID: 'xCutFill',
            yAxisID: 'yCutFillBar',
            backgroundColor: '#cbcdd6',
          },
          {
            type: 'bar',
            label: this.fillText,
            data: fillVolumeArray,
            xAxisID: 'xCutFill',
            yAxisID: 'yCutFillBar',
            backgroundColor: '#0063a3',
            hidden: this.fillText === 'hiddenFill',
          },
          {
            type: 'bar',
            label: this.cutText,
            data: cutVolumeArray,
            xAxisID: 'xCutFill',
            yAxisID: 'yCutFillBar',
            backgroundColor: '#c81922',
            hidden: this.cutText === 'hiddenCut',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
          point: {
            radius: 0,
          },
        },
        // 土量は少数以下1桁表示（2位四捨五入）進捗率は、整数桁まで
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.formattedValue !== null) {
                  if (
                    context.dataset.type === 'line' &&
                    context.dataset.label === '目標進捗率'
                  ) {
                    label +=
                      Math.round(
                        Number(context.formattedValue.replace(/,/g, '')),
                      ).toLocaleString() + '%';
                  } else {
                    label +=
                      (
                        Math.round(
                          Number(context.formattedValue.replace(/,/g, '')) * 10,
                        ) / 10
                      ).toLocaleString() + ' m\u00B3';
                  }
                }
                return label;
              },
            },
          },
          legend: {
            position: 'bottom',
            align: 'start',
            labels: {
              usePointStyle: true,
              useBorderRadius: true,
              borderRadius: 4,
              boxWidth: 8,
              boxHeight: 8,
              textAlign: 'left',
              filter: function (items) {
                if (items.text === 'hiddenCut' || items.text === 'hiddenFill') {
                  return false;
                } else {
                  return true;
                }
              },
            },
          },
          title: {
            display: false,
          },
          datalabels: {
            display: false,
          },
        },
        scales: {
          x: {
            display: false,
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 12,
              },
            },
          },
          yCutFillBar: {
            stacked: true,
            position: 'left',
            grid: {
              display: true,
            },
            title: {
              display: true,
              text: '切土/盛土量 (m\u00B3)',
            },
            max: this.displayDesignVolumeMax,
            min: this.displayDesignVolumeMin,
            beginAtZero: true,
          },
          yCutFillLine: {
            display: false,
            stacked: true,
            position: 'right',
            grid: {
              display: false,
            },
            title: {
              display: true,
              text: '進捗率 (%)',
            },
            max: this.displayProgressRateMax,
            min: this.displayProgressRateMin,
            beginAtZero: true,
          },
          xCutFill: {
            stacked: true,
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0,
              maxTicksLimit: this.MAX_TICKS_LIMIT,
              includeBounds: true,
            },
          },
        },
      },
    });
  }
}
