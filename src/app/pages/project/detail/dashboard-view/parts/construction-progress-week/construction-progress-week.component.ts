import { select, Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Title } from '@angular/platform-browser';
import { Component, ViewEncapsulation } from '@angular/core';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';
import { formatDate } from 'src/app/helper-utility/date-helper/date-helper';
import { ConstructionProgressSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/construction-progress.selector';
import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';
import { addDays, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import {
  ConstructionProgressState,
  ConstructionProgressViewData,
} from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';
import { ConstructionProgressForView } from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';
import { NumberFormatHelperService } from 'src/app/helper-utility/number-format-helper/number-format-helper.service';
import { Actions, ofType } from '@ngrx/effects';
import { NavbarOuterFrameAction } from 'src/app/stores/actions/project/navbar-outer-frame.action';
import {
  ConstructionActivitySubType,
  remainingNonWorkingDays,
  toViewData,
} from '../../dashboard-view.defination';

@Component({
  selector:
    'ntc-project-project-dashboard-view-construction-progress-week-component',
  templateUrl: './construction-progress-week.component.html',
  styleUrls: ['./construction-progress-week.component.scss'],
  providers: [Title],
  encapsulation: ViewEncapsulation.None,
})
export class ConstructionProgressWeekComponent extends BaseComponent {
  protected readonly _format = new NumberFormatHelperService();

  public isSidebarExpanded: boolean = false;

  // *** デバッグ用設定 ***
  // 画面上に表示される「今日」の日付を上書きする。
  // 以下パラメータに入力した日付を「今日」として扱い、計算を行う。
  public testToday: Date | undefined = undefined;
  // *** デバッグ用設定 ***

  public today = this.testToday || new Date();
  public yesterday = addDays(this.today, -1);

  // 週初め
  public startOfWeek = startOfWeek(this.today);

  // 先週の週初め
  public startLastWeekDay = subWeeks(this.startOfWeek, 1);

  // 先週末
  public lastWeekend = endOfWeek(this.startLastWeekDay);

  // 選択中の進捗確認設定
  public constructionActivity: ConstructionActivity | undefined = undefined;

  protected cpViewData: ConstructionProgressViewData | undefined = undefined;

  private rawData: ConstructionProgressState | undefined;

  public rawDataArray: ConstructionProgressForView[] | undefined;

  // 残量表示(falseは実績)
  public remainingAmount: boolean = false;

  // TODO: Wait for SOK API done
  constructionWeekData = [
    {
      title: '今日',
      icons: 'calendar_event',
      dateRange: formatDate(this.today, 'yyyy/MM/dd'),
      cutTotalTitle: '切土合計',
      fillTotalTitle: '盛土合計',
      cutTotalRemainingTitle: '切土残合計',
      fillTotalRemainingTitle: '盛土残合計',
      percentage: '0.0',
      cutVolume: '0.0',
      fillVolume: '0.0',
      cutFillVolume: '0.0',
      rateCutClass: 'rate--increase',
      rateCutIcon: 'arrow_up',
      rateCutText: '+0%',
      rateFillClass: 'rate--increase',
      rateFillIcon: 'arrow_up',
      rateFillText: '+0%',
      rateCutFillClass: 'rate--increase',
      rateCutFillIcon: 'arrow_up',
      rateCutFillText: '+0%',
    },
    {
      title: '昨日',
      icons: 'calendar_event',
      dateRange: formatDate(this.yesterday, 'yyyy/MM/dd'),
      cutTotalTitle: '切土合計',
      fillTotalTitle: '盛土合計',
      cutTotalRemainingTitle: '切土残合計',
      fillTotalRemainingTitle: '盛土残合計',
      percentage: '0.0',
      cutVolume: '0.0',
      fillVolume: '0.0',
      cutFillVolume: '0.0',
      rateCutClass: 'rate--decrease',
      rateCutIcon: 'arrow_down',
      rateCutText: '-0%',
      rateFillClass: 'rate--decrease',
      rateFillIcon: 'arrow_down',
      rateFillText: '-0%',
      rateCutFillClass: 'rate--decrease',
      rateCutFillIcon: 'arrow_down',
      rateCutFillText: '-0%',
    },
    {
      title: '先週',
      icons: 'calendar_week',
      dateRange:
        formatDate(this.startLastWeekDay, 'yyyy/MM/dd') +
        ' - ' +
        formatDate(this.lastWeekend, 'yyyy/MM/dd'),
      cutTotalTitle: '切土量',
      fillTotalTitle: '盛土量',
      cutTotalRemainingTitle: '切土残量',
      fillTotalRemainingTitle: '盛土残量',
      percentage: '0.0',
      cutVolume: '0.0',
      fillVolume: '0.0',
      cutFillVolume: '0.0',
      rateCutClass: 'rate--increase',
      rateCutIcon: 'arrow_up',
      rateCutText: '+0%',
      rateFillClass: 'rate--increase',
      rateFillIcon: 'arrow_up',
      rateFillText: '+0%',
      rateCutFillClass: 'rate--increase',
      rateCutFillIcon: 'arrow_up',
      rateCutFillText: '+0%',
    },
    {
      title: '日当たり施工数量',
      icons: 'line_graph',
      dateRange: '',
      dailyConstructionTotalTitle: '日当たり施工数量（目標値）',
      actualAverageValueUpToToday: '日当たり施工数量（実績値）',
      percentage: '0.0',
      dailyVolume: '0.0',
      actualAverageVolume: '0.0',
    },
  ];

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ConstructionProgressWeekComponent');

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
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
        .pipe(select(ConstructionProgressSelector.selectorConstructionProgress))
        .subscribe((x) => {
          try {
            if (x?.viewData) {
              this.rawData = x;
              // default show chart by Day
              this.handleChart();
            }
          } catch (exp) {
            this.L.error(exp);
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .pipe(select(ConstructionProgressSelector.selectorConstructionProgress))
        .subscribe((item) => {
          this.rawDataArray = item?.rawData;
          if (item?.rawData) {
            const array = [...item.rawData];
            array.sort((a, b) =>
              (b.dateTime ?? '').localeCompare(a.dateTime ?? ''),
            );
            this.rawDataArray = array;
          }
        }),
    );

    // BEGIN: DEBUG ONLY - REMOVE IN PRODUCTION
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(NavbarOuterFrameAction.SetTestTodayAction))
        .subscribe(({ date }) => {
          this.testToday = date;

          this.today = this.testToday;
          this.yesterday = addDays(this.today, -1);
          this.startOfWeek = startOfWeek(this.today);
          this.startLastWeekDay = subWeeks(this.startOfWeek, 1);
          this.lastWeekend = endOfWeek(this.startLastWeekDay);

          this.constructionWeekData = [
            {
              ...this.constructionWeekData[0],
              dateRange: formatDate(this.today, 'yyyy/MM/dd'),
            },
            {
              ...this.constructionWeekData[1],
              dateRange: formatDate(this.yesterday, 'yyyy/MM/dd'),
            },
            {
              ...this.constructionWeekData[2],
              dateRange:
                formatDate(this.startLastWeekDay, 'yyyy/MM/dd') +
                ' - ' +
                formatDate(this.lastWeekend, 'yyyy/MM/dd'),
            },
            {
              ...this.constructionWeekData[3],
            },
          ];

          this.handleChart();
        }),
    );
    // END: DEBUG ONLY - REMOVE IN PRODUCTION
  }

  handleChart(): void {
    if (!this.rawData?.rawData) return;

    // convert to data chart and show
    this.handleFormatChart(
      toViewData(
        this.rawData?.rawData,
        this.constructionActivity,
        true,
        undefined,
        undefined,
        this.testToday,
      ),
    );
  }

  handleFormatChart(data: ConstructionProgressViewData): void {
    if (!this.rawData?.rawData) return;
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

    for (let i = 0; i < (data?.dateTimeArray.length ?? 0); i++) {
      this.cpViewData.dateTimeArray.push(data?.dateTimeArray[i] ?? '');
      this.cpViewData.goalArray.push(data?.goalArray[i] ?? 0);
      this.cpViewData.cutVolumeArray.push(data?.cutVolumeArray[i] ?? 0);
      this.cpViewData.fillVolumeArray.push(data?.fillVolumeArray[i] ?? 0);
      data.targetProgressRateArray[i] &&
        this.cpViewData.targetProgressRateArray.push(
          data?.targetProgressRateArray[i],
        );
    }

    // 日々の値で計算した目標日当たり施工数量を取り出す。日当たり施工数量対象範囲が過去の日付の場合の目標日当たり施工数量は0となる。
    const findGoal = this.cpViewData.goalArray.find((item) => item !== 0);

    if (findGoal === undefined) {
      for (let i = 0; i <= 2; i++) {
        // 目標日当たり施工数量が0の場合、rateTextの算出ができないため、アイコンを非表示にしてハイフンを表示する
        this.constructionWeekData[i].rateCutClass = 'nodata';
        this.constructionWeekData[i].rateCutIcon = '';
        this.constructionWeekData[i].rateCutText = '----';
        this.constructionWeekData[i].rateFillClass = 'nodata';
        this.constructionWeekData[i].rateFillIcon = '';
        this.constructionWeekData[i].rateFillText = '----';
        this.constructionWeekData[i].rateCutFillClass = 'nodata';
        this.constructionWeekData[i].rateCutFillIcon = '';
        this.constructionWeekData[i].rateCutFillText = '----';
        this.constructionWeekData.slice(-1)[0].dailyVolume = '0.0';
      }
    } else {
      // 日当たり施工数量（目標）＝ 残りの土量÷残日数（今日を含む稼働日数ベース）
      this.constructionWeekData.slice(-1)[0].dailyVolume =
        this._format.formatCutfill(findGoal, false);

      this.handleFormat(
        toViewData(
          this.rawData?.rawData,
          this.constructionActivity,
          true,
          undefined,
          this.today,
          this.testToday,
        ),
      );

      const totalCut = this.cpViewData.cutVolumeArray.reduce(function (
        sum,
        element,
      ) {
        return sum + element;
      }, 0);

      const totalFill = this.cpViewData.fillVolumeArray.reduce(function (
        sum,
        element,
      ) {
        return sum + element;
      }, 0);

      const totalCutFill = totalCut + totalFill;
      const startDate = new Date(this.cpViewData.startDate);

      const nonWorkingDays = remainingNonWorkingDays(startDate, this.today);

      // 日当たり施工数量（実績）＝ 累計土量 ÷ 経過日数（稼働日数ベース）
      if (
        this.constructionActivity?.activitySubType ===
        ConstructionActivitySubType.cut
      ) {
        this.constructionWeekData.slice(-1)[0].actualAverageVolume =
          this._format.formatCutfill(
            totalCut / (this.cpViewData.dateTimeArray.length - nonWorkingDays),
            false,
          );
      } else if (
        this.constructionActivity?.activitySubType ===
        ConstructionActivitySubType.fill
      ) {
        this.constructionWeekData.slice(-1)[0].actualAverageVolume =
          this._format.formatCutfill(
            totalFill / (this.cpViewData.dateTimeArray.length - nonWorkingDays),
            false,
          );
      } else {
        this.constructionWeekData.slice(-1)[0].actualAverageVolume =
          this._format.formatCutfill(
            totalCutFill /
              (this.cpViewData.dateTimeArray.length - nonWorkingDays),
            false,
          );
      }

      this.handleFormat(
        toViewData(
          this.rawData?.rawData,
          this.constructionActivity,
          true,
          this.yesterday,
          this.today,
          this.testToday,
        ),
      );

      if (this.remainingAmount) {
        this.constructionWeekData[0].cutVolume = this._format.formatCutfill(
          this.cpViewData.remainedCutArray.slice(-1)[0],
          false,
        );
        this.constructionWeekData[0].fillVolume = this._format.formatCutfill(
          this.cpViewData.remainedFillArray.slice(-1)[0],
          false,
        );

        this.constructionWeekData[1].cutVolume = this._format.formatCutfill(
          this.cpViewData.remainedCutArray[0],
          false,
        );
        this.constructionWeekData[1].fillVolume = this._format.formatCutfill(
          this.cpViewData.remainedFillArray[0],
          false,
        );
      } else {
        this.constructionWeekData[0].cutVolume = this._format.formatCutfill(
          this.cpViewData.cutVolumeArray.slice(-1)[0],
          false,
        );
        this.constructionWeekData[0].fillVolume = this._format.formatCutfill(
          this.cpViewData.fillVolumeArray.slice(-1)[0],
          false,
        );

        this.constructionWeekData[1].cutVolume = this._format.formatCutfill(
          this.cpViewData.cutVolumeArray[0],
          false,
        );
        this.constructionWeekData[1].fillVolume = this._format.formatCutfill(
          this.cpViewData.fillVolumeArray[0],
          false,
        );
      }

      for (let i = 0; i <= 1; i++) {
        this.constructionWeekData[i].cutFillVolume = this._format
          .formatCutfill(
            Number(this.constructionWeekData[i].cutVolume) +
              Number(this.constructionWeekData[i].fillVolume),
            false,
          )
          .toString();
      }

      this.handleFormat(
        toViewData(
          this.rawData?.rawData,
          this.constructionActivity,
          false,
          this.startLastWeekDay,
          this.lastWeekend,
          this.testToday,
        ),
      );

      // 一番後ろの0でない累積データを採用(最終日が休みだと実績0となるため)。
      // memo：ES2023ではfindLastで後方検索が可能。reverse()は元のデータが反転するため注意。
      let cutVolumeArray;
      let fillVolumeArray;
      let cutVolumeArrayAeverse;
      let fillVolumeArrayAeverse;

      if (this.remainingAmount) {
        cutVolumeArray = this.cpViewData.remainedCutArray.find(
          (item) => item !== 0,
        );
        fillVolumeArray = this.cpViewData.remainedFillArray.find(
          (item) => item !== 0,
        );

        cutVolumeArrayAeverse = this.cpViewData.remainedCutArray.reverse();
        fillVolumeArrayAeverse = this.cpViewData.remainedFillArray.reverse();
      } else {
        cutVolumeArray = this.cpViewData.cutVolumeArray.find(
          (item) => item !== 0,
        );
        fillVolumeArray = this.cpViewData.fillVolumeArray.find(
          (item) => item !== 0,
        );

        cutVolumeArrayAeverse = this.cpViewData.cutVolumeArray.reverse();
        fillVolumeArrayAeverse = this.cpViewData.fillVolumeArray.reverse();
      }
      const weekDataFirst = cutVolumeArrayAeverse.find((item) => item !== 0);
      const weekDataLast = fillVolumeArrayAeverse.find((item) => item !== 0);
      if (weekDataFirst !== undefined) {
        this.constructionWeekData[2].cutVolume = this._format.formatCutfill(
          weekDataFirst - (cutVolumeArray || 0),
          false,
        );
      }
      if (weekDataLast !== undefined) {
        this.constructionWeekData[2].fillVolume = this._format.formatCutfill(
          weekDataLast - (fillVolumeArray || 0),
          false,
        );
      }
      this.constructionWeekData[2].cutFillVolume = this._format.formatCutfill(
        Number(this.constructionWeekData[2].cutVolume) +
          Number(this.constructionWeekData[2].fillVolume),
        false,
      );

      this.handleFormat(
        toViewData(
          this.rawData?.rawData,
          this.constructionActivity,
          false,
          this.yesterday,
          this.today,
          this.testToday,
        ),
      );
      for (let i = 0; i <= 2; i++) {
        // 切土/盛土が目標日当たり施工数量を超えているか算出
        if (
          this.constructionActivity?.activitySubType ===
          ConstructionActivitySubType.cut
        ) {
          const rateCut =
            Number(this.constructionWeekData[i].cutVolume) / findGoal;
          let rateCutPercent: number;
          if (rateCut < 1 && rateCut !== 0) {
            rateCutPercent = 100 - rateCut * 100;
            this.constructionWeekData[i].rateCutClass = 'rate--decrease';
            this.constructionWeekData[i].rateCutIcon = 'arrow_down';
            this.constructionWeekData[i].rateCutText =
              this._format.formatCutfill(Math.abs(rateCutPercent), false) + '%';
          } else if (rateCut > 1 && rateCut !== Infinity) {
            rateCutPercent = rateCut * 100 - 100;
            this.constructionWeekData[i].rateCutClass = 'rate--increase';
            this.constructionWeekData[i].rateCutIcon = 'arrow_up';
            this.constructionWeekData[i].rateCutText =
              '+' + this._format.formatCutfill(rateCutPercent, false) + '%';
          } else if (rateCut === Infinity || rateCut === 0) {
            // 実績0の場合、アイコンを非表示にしてハイフンを表示する
            this.constructionWeekData[i].rateCutClass = 'nodata';
            this.constructionWeekData[i].rateCutIcon = '';
            this.constructionWeekData[i].rateCutText = '----';
          } else {
            this.constructionWeekData[i].rateCutClass = 'nodata';
            this.constructionWeekData[i].rateCutIcon = '';
            this.constructionWeekData[i].rateCutText = '±0%';
          }
        } else if (
          this.constructionActivity?.activitySubType ===
          ConstructionActivitySubType.fill
        ) {
          const rateFill =
            Number(this.constructionWeekData[i].fillVolume) / findGoal;
          let rateFillPercent: number;
          if (rateFill < 1 && rateFill !== 0) {
            rateFillPercent = 100 - rateFill * 100;
            this.constructionWeekData[i].rateFillClass = 'rate--decrease';
            this.constructionWeekData[i].rateFillIcon = 'arrow_down';
            this.constructionWeekData[i].rateFillText =
              this._format.formatCutfill(Math.abs(rateFillPercent), false) +
              '%';
          } else if (rateFill > 1 && rateFill !== Infinity) {
            rateFillPercent = rateFill * 100 - 100;
            this.constructionWeekData[i].rateFillClass = 'rate--increase';
            this.constructionWeekData[i].rateFillIcon = 'arrow_up';
            this.constructionWeekData[i].rateFillText =
              '+' + this._format.formatCutfill(rateFillPercent, false) + '%';
          } else if (rateFill === Infinity || rateFill === 0) {
            // 実績0の場合、アイコンを非表示にしてハイフンを表示する
            this.constructionWeekData[i].rateFillClass = 'nodata';
            this.constructionWeekData[i].rateFillIcon = '';
            this.constructionWeekData[i].rateFillText = '----';
          } else {
            this.constructionWeekData[i].rateFillClass = 'nodata';
            this.constructionWeekData[i].rateFillIcon = '';
            this.constructionWeekData[i].rateFillText = '±0%';
          }
        } else {
          const rateCutFill =
            Number(this.constructionWeekData[i].cutFillVolume) / findGoal;
          let rateCutFillPercent: number;
          if (rateCutFill < 1 && rateCutFill !== 0) {
            rateCutFillPercent = 100 - rateCutFill * 100;
            this.constructionWeekData[i].rateCutFillClass = 'rate--decrease';
            this.constructionWeekData[i].rateCutFillIcon = 'arrow_down';
            this.constructionWeekData[i].rateCutFillText =
              this._format.formatCutfill(Math.abs(rateCutFillPercent), false) +
              '%';
          } else if (rateCutFill > 1 && rateCutFill !== Infinity) {
            rateCutFillPercent = rateCutFill * 100 - 100;
            this.constructionWeekData[i].rateCutFillClass = 'rate--increase';
            this.constructionWeekData[i].rateCutFillIcon = 'arrow_up';
            this.constructionWeekData[i].rateCutFillText =
              '+' + this._format.formatCutfill(rateCutFillPercent, false) + '%';
          } else if (rateCutFill === Infinity || rateCutFill === 0) {
            // 実績0の場合、アイコンを非表示にしてハイフンを表示する
            this.constructionWeekData[i].rateCutFillClass = 'nodata';
            this.constructionWeekData[i].rateCutFillIcon = '';
            this.constructionWeekData[i].rateCutFillText = '----';
          } else {
            this.constructionWeekData[i].rateCutFillClass = 'nodata';
            this.constructionWeekData[i].rateCutFillIcon = '';
            this.constructionWeekData[i].rateCutFillText = '±0%';
          }
        }
      }
    }
  }

  handleFormat(data: ConstructionProgressViewData): void {
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
      data.targetProgressRateArray[i] &&
        this.cpViewData.targetProgressRateArray.push(
          data?.targetProgressRateArray[i],
        );
    }
  }
}
