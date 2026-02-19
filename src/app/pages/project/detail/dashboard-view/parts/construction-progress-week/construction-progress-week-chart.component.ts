import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Component, ViewChild } from '@angular/core';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ConstructionProgressSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/construction-progress.selector';
import { NumberFormatHelperService } from 'src/app/helper-utility/number-format-helper/number-format-helper.service';
import { Actions, ofType } from '@ngrx/effects';
import { NavbarOuterFrameAction } from 'src/app/stores/actions/project/navbar-outer-frame.action';
import { ConstructionWeekCardRangeChartComponent } from './parts/construction-week-card-range-chart.component';
import { ChartDataSet, RangeChartData } from './parts/chart-data.definition';
import { ConstructionProgressForView } from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';
import {
  ConstructionActivitySubType,
  dateArray,
  DateRange,
} from '../../dashboard-view.defination';
import { combineLatest, distinctUntilChanged } from 'rxjs';
import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';
import { format } from 'date-fns';

export enum SumType {
  day,
  week,
  month,
}

@Component({
  selector:
    'ntc-project-project-dashboard-view-construction-progress-week-chart-component',
  templateUrl: './construction-progress-week-chart.component.html',
  styleUrls: ['./construction-progress-week-chart.component.scss'],
})
export class ConstructionProgressWeekChartComponent extends BaseComponent {
  @ViewChild('past7DaysChart') past7DaysChart:
    | ConstructionWeekCardRangeChartComponent
    | undefined;
  @ViewChild('past5WeekChart') past5WeekChart:
    | ConstructionWeekCardRangeChartComponent
    | undefined;
  @ViewChild('past5MonthChart') past5MonthChart:
    | ConstructionWeekCardRangeChartComponent
    | undefined;

  protected readonly _format = new NumberFormatHelperService();

  public isLoading = true;

  // *** デバッグ用設定 ***
  // 画面上に表示される「今日」の日付を上書きする。
  // 以下パラメータに入力した日付を「今日」として扱い、計算を行う。
  public testToday: Date | undefined = undefined;
  // *** デバッグ用設定 ***

  public today = this.testToday || new Date();

  public past7DaysData: RangeChartData;
  public past5WeekData: RangeChartData;
  public past5MonthData: RangeChartData;
  public past7DaysAverage: number = 0;
  public past5WeekAverage: number = 0;
  public past5MonthAverage: number = 0;

  private constructionProgressList: ConstructionProgressForView[] = [];
  private constructionActivity: ConstructionActivity = {};

  private readonly pastDays = 6;
  private readonly pastWeeks = 4;
  private readonly pastMonths = 4;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ConstructionProgressWeekV2Component');

    this.today.setHours(0, 0, 0, 0);

    // 過去７日間
    this.past7DaysData = new RangeChartData(
      this.addDays(this.today, -this.pastDays),
      this.today,
    );
    // 過去５週間
    this.past5WeekData = new RangeChartData(
      this.addWeeks(this.today, -this.pastWeeks),
      this.today,
    );
    // 過去５か月
    this.past5MonthData = new RangeChartData(
      this.addMonth(this.today, -this.pastMonths),
      this.today,
    );

    this.addSubscriptionsList(
      combineLatest([
        this.store.select(
          ConstructionProgressSelector.selectorConstructionProgress,
        ),
        this.store.select(
          ConstructionProgressSelector.selectorConstructionActive,
        ),
        this.store.select(
          ConstructionProgressSelector.selectorConstructionProgressRawData,
        ),
      ])
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return (
              !curr[0] ||
              !curr[1] ||
              prev[0]?.inProcess === curr[0]?.inProcess ||
              prev[1]?.inProcess === curr[1]?.inProcess
            );
          }),
        )
        .subscribe((value) => {
          this.isLoading = (value[0]?.inProcess || value[1]?.inProcess) ?? true;

          if (this.isLoading) return;

          this.constructionProgressList = value[0]?.rawData ?? [];
          this.constructionActivity = value[1]?.contructionActivities ?? {};

          // Chart更新
          this.updateChart();
        }),
    );

    // BEGIN: DEBUG ONLY - REMOVE IN PRODUCTION
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(NavbarOuterFrameAction.SetTestTodayAction))
        .subscribe(({ date }) => {
          this.testToday = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0,
          );

          // Chart更新
          this.updateChart();
        }),
    );
    // END: DEBUG ONLY - REMOVE IN PRODUCTION
  }

  /**
   * Chart更新
   */
  private updateChart() {
    if (this.testToday) {
      this.today = this.testToday;
    }
    // 過去７日間
    this.past7DaysData.updateDateRange(
      this.getDateRange(SumType.day, this.pastDays),
    );
    // データリセット
    this.past7DaysData.resetData();
    // ラベルセット
    this.past7DaysData.setLabels(
      this.getLabels(
        this.past7DaysData.startDate,
        this.past7DaysData.endDate,
        SumType.day,
        7,
        'MM/dd',
      ),
    );
    // 盛土
    this.past7DaysData.addChartDataSet(
      this.getChartDataSet(
        this.past7DaysData.startDate,
        this.past7DaysData.endDate,
        SumType.day,
        7,
        ConstructionActivitySubType.fill,
      ),
    );
    // 切土
    this.past7DaysData.addChartDataSet(
      this.getChartDataSet(
        this.past7DaysData.startDate,
        this.past7DaysData.endDate,
        SumType.day,
        7,
        ConstructionActivitySubType.cut,
      ),
    );
    this.past7DaysChart?.updateChart();

    // 平均取得
    this.past7DaysAverage = this.getAverage(this.past7DaysData);

    // 過去５週間
    this.past5WeekData.updateDateRange(
      this.getDateRange(SumType.week, this.pastWeeks),
    );
    // データリセット
    this.past5WeekData.resetData();
    // ラベルセット
    this.past5WeekData.setLabels(
      this.getLabels(
        this.past5WeekData.startDate,
        this.past5WeekData.endDate,
        SumType.week,
        this.pastWeeks + 1,
        'MM/dd',
      ),
    );
    // 盛土
    this.past5WeekData.addChartDataSet(
      this.getChartDataSet(
        this.past5WeekData.startDate,
        this.past5WeekData.endDate,
        SumType.week,
        this.pastWeeks + 1,
        ConstructionActivitySubType.fill,
      ),
    );
    // 切土
    this.past5WeekData.addChartDataSet(
      this.getChartDataSet(
        this.past5WeekData.startDate,
        this.past5WeekData.endDate,
        SumType.week,
        this.pastWeeks + 1,
        ConstructionActivitySubType.cut,
      ),
    );
    this.past5WeekChart?.updateChart();

    // 平均取得
    this.past5WeekAverage = this.getAverage(this.past5WeekData);

    // 過去５か月
    this.past5MonthData.updateDateRange(
      this.getDateRange(SumType.month, this.pastMonths),
    );
    // データリセット
    this.past5MonthData.resetData();
    // ラベルセット
    this.past5MonthData.setLabels(
      this.getLabels(
        this.past5MonthData.startDate,
        this.past5MonthData.endDate,
        SumType.month,
        this.pastMonths + 1,
        'yyyy/MM',
      ),
    );
    // 盛土
    this.past5MonthData.addChartDataSet(
      this.getChartDataSet(
        this.past5MonthData.startDate,
        this.past5MonthData.endDate,
        SumType.month,
        this.pastMonths + 1,
        ConstructionActivitySubType.fill,
      ),
    );
    // 切土
    this.past5MonthData.addChartDataSet(
      this.getChartDataSet(
        this.past5MonthData.startDate,
        this.past5MonthData.endDate,
        SumType.month,
        this.pastMonths + 1,
        ConstructionActivitySubType.cut,
      ),
    );
    this.past5MonthChart?.updateChart();

    // 平均取得
    this.past5MonthAverage = this.getAverage(this.past5MonthData);
  }

  /**
   * 日付取得
   */
  private getDateRange(sumType: SumType, sumCount: number): DateRange {
    let from = new Date();
    from.setHours(0, 0, 0, 0);
    let to = this.today;
    to.setHours(0, 0, 0, 0);

    if (this.constructionActivity.endTime) {
      const endTime = new Date(this.constructionActivity.endTime);
      endTime.setHours(0, 0, 0, 0);
      if (to.getTime() > endTime.getTime()) {
        to = endTime;
      }
    }

    let minDate: Date = new Date();
    minDate.setHours(0, 0, 0, 0);
    if (this.constructionActivity.startTime) {
      const constructionStartTime = new Date(
        this.constructionActivity.startTime,
      );
      minDate = new Date(
        constructionStartTime.getFullYear(),
        constructionStartTime.getMonth(),
        constructionStartTime.getDate(),
        0,
        0,
        0,
      );
    }

    switch (sumType) {
      case SumType.day: {
        from = this.addDays(to, -sumCount);
        break;
      }
      case SumType.week: {
        from = this.getLastSunday(this.addWeeks(to, -sumCount));
        minDate = this.getLastSunday(minDate);
        break;
      }
      case SumType.month: {
        const fromMonth = this.addMonth(to, -sumCount);
        fromMonth.setDate(1);
        from = fromMonth;
        minDate.setDate(1);
        break;
      }
    }

    if (from.getTime() < minDate.getTime()) {
      from = minDate;
    }
    if (to.getTime() < minDate.getTime()) {
      to = minDate;
    }

    return {
      from: from,
      to: to,
    };
  }

  /**
   * ラベル取得
   */
  private getLabels(
    fromDate: Date,
    toDate: Date,
    sumType: SumType,
    sumCount: number,
    formatStr: string,
  ): string[] {
    const retList: string[] = [];
    const dateList = dateArray(fromDate, toDate);
    switch (sumType) {
      case SumType.day: {
        let date = toDate;
        for (let i = sumCount - 1; i >= 0; i--) {
          if (date && date.getTime() >= fromDate.getTime()) {
            retList.push(format(date, formatStr));
          } else {
            retList.push('');
          }
          date = this.addDays(date, -1);
        }
        retList.reverse();
        break;
      }
      case SumType.week: {
        let endDate = dateList[dateList.length - 1];
        const lastDate = this.getLastSunday(dateList[0]);
        for (let i = 0; i < sumCount; i++) {
          const startDate = this.getLastSunday(endDate);
          let date1Str = '';
          if (startDate && startDate.getTime() >= lastDate.getTime()) {
            date1Str = format(startDate, formatStr);
          } else {
            date1Str = '';
          }
          retList.push(date1Str);
          endDate = this.addWeeks(startDate, -1);
        }
        retList.reverse();
        break;
      }
      case SumType.month: {
        let endDate = dateList[dateList.length - 1];
        endDate.setDate(1);
        const lastDate = dateList[0];
        lastDate.setDate(1);
        for (let i = 0; i < sumCount; i++) {
          const startDate = endDate;
          startDate.setDate(1);
          let date1Str = '';
          if (startDate && startDate.getTime() >= lastDate.getTime()) {
            date1Str = format(startDate, formatStr);
          } else {
            date1Str = '';
          }
          retList.push(date1Str);
          endDate = this.addMonth(startDate, -1);
        }
        retList.reverse();
        break;
      }
    }
    return retList;
  }

  /**
   * ChartのdataSet取得
   */
  private getChartDataSet(
    fromDate: Date,
    toDate: Date,
    sumType: SumType,
    sumCount: number,
    activitySubType:
      | ConstructionActivitySubType.cut
      | ConstructionActivitySubType.fill,
  ): ChartDataSet {
    const label = this.getLegendLabel(activitySubType);
    const { data, rawData } = this.getDataList(
      fromDate,
      toDate,
      sumType,
      sumCount,
      activitySubType,
    );
    const color = this.getColorCode(data.length, activitySubType);
    return {
      label: label,
      data: data,
      backgroundColor: color,
      hidden:
        this.constructionActivity.activitySubType !=
          ConstructionActivitySubType.cutfill &&
        this.constructionActivity.activitySubType != activitySubType,
      rawData: rawData,
    };
  }

  /**
   * Chartのデータ部のlabel取得
   */
  private getLegendLabel(
    activitySubType:
      | ConstructionActivitySubType.cut
      | ConstructionActivitySubType.fill,
  ): string {
    if (
      this.constructionActivity.activitySubType !=
        ConstructionActivitySubType.cutfill &&
      this.constructionActivity.activitySubType != activitySubType
    ) {
      return 'hidden';
    }
    // 切土/盛土
    switch (activitySubType) {
      case ConstructionActivitySubType.cut:
        return '切土';
      case ConstructionActivitySubType.fill:
        return '盛土';
    }
  }

  /**
   * Chartのデータ部の背景色取得
   */
  private getColorCode(
    length: number,
    activitySubType:
      | ConstructionActivitySubType.cut
      | ConstructionActivitySubType.fill,
  ): string[] {
    const ret: string[] = new Array(length);
    // 切土/盛土
    switch (activitySubType) {
      case ConstructionActivitySubType.cut:
        ret.fill('#c81922');
        break;
      case ConstructionActivitySubType.fill:
        ret.fill('#0063a3');
        break;
    }
    return ret;
  }

  /**
   * Chartのデータ取得
   */
  private getDataList(
    fromDate: Date,
    toDate: Date,
    sumType: SumType,
    sumCount: number,
    activitySubType:
      | ConstructionActivitySubType.cut
      | ConstructionActivitySubType.fill,
  ): { data: number[]; rawData: (number | undefined)[] } {
    if (!this.constructionProgressList) {
      return { data: [], rawData: [] };
    }

    // 年月日が指定されていない場合の回避策
    if (fromDate.getFullYear() === 1) {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
    }
    if (toDate.getFullYear() === 1) {
      toDate = new Date();
      toDate.setHours(0, 0, 0, 0);
    }

    const dateList = dateArray(fromDate, toDate);
    const numberList: number[] = [];
    const rawDataList: (number | undefined)[] = [];

    // 値取得
    switch (sumType) {
      case SumType.day: {
        let date = toDate;
        for (let i = sumCount - 1; i >= 0; i--) {
          let value = undefined;
          if (
            date.getTime() < fromDate.getTime() ||
            date.getTime() > toDate.getTime()
          ) {
            // 範囲外
          } else if (date && date.getTime() >= fromDate.getTime()) {
            value = this.getValue(date, activitySubType);
          }
          date = this.addDays(date, -1);
          numberList.push(value ?? 0);
          rawDataList.push(value);
        }
        numberList.reverse();
        rawDataList.reverse();
        break;
      }
      case SumType.week: {
        let endDate = dateList[dateList.length - 1];
        const lastDate = this.getLastSunday(dateList[0]);
        for (let i = 0; i < sumCount; i++) {
          const startDate = this.getLastSunday(endDate);
          const _dateList = dateArray(startDate, endDate);
          let value = undefined;
          for (const date of _dateList) {
            if (
              date.getTime() < fromDate.getTime() ||
              date.getTime() > toDate.getTime()
            ) {
              // 範囲外
            } else if (date && date.getTime() >= lastDate.getTime()) {
              const currentValue = this.getValue(date, activitySubType);
              if (currentValue !== undefined) {
                value = (value ?? 0) + currentValue;
              }
            }
          }
          numberList.push(value ?? 0);
          rawDataList.push(value);
          endDate = this.addDays(startDate, -1);
        }
        numberList.reverse();
        rawDataList.reverse();
        break;
      }
      case SumType.month: {
        let endDate = dateList[dateList.length - 1];
        endDate.setDate(1);
        const lastDate = dateList[0];
        lastDate.setDate(1);
        for (let i = 0; i < sumCount; i++) {
          const startDate = endDate;
          startDate.setDate(1);
          endDate = this.addMonth(endDate, 1);
          endDate = this.addDays(endDate, -1);
          const _dateList = dateArray(startDate, endDate);
          let value = undefined;
          for (const date of _dateList) {
            if (
              date.getTime() < fromDate.getTime() ||
              date.getTime() > toDate.getTime()
            ) {
              // 範囲外
            } else if (date && date.getTime() >= lastDate.getTime()) {
              const currentValue = this.getValue(date, activitySubType);
              if (currentValue !== undefined) {
                value = (value ?? 0) + currentValue;
              }
            }
          }
          numberList.push(value ?? 0);
          rawDataList.push(value);
          endDate = this.addDays(startDate, -1);
        }
        numberList.reverse();
        rawDataList.reverse();
        break;
      }
    }
    return { data: numberList, rawData: rawDataList };
  }

  /**
   * activitySubType毎の値取得
   */
  private getValue(
    date: Date,
    activitySubType:
      | ConstructionActivitySubType.cut
      | ConstructionActivitySubType.fill,
  ): number | undefined {
    date.setHours(0, 0, 0, 0);
    let fromDate = date;
    if (this.constructionActivity.startTime) {
      const constructionStartTime = new Date(
        this.constructionActivity.startTime,
      );
      fromDate = new Date(
        constructionStartTime.getFullYear(),
        constructionStartTime.getMonth(),
        constructionStartTime.getDate(),
        0,
        0,
        0,
      );
    }

    const toDate = this.constructionActivity.endTime
      ? new Date(this.constructionActivity.endTime)
      : this.today;
    toDate.setHours(0, 0, 0, 0);

    if (
      date.getTime() < fromDate.getTime() ||
      date.getTime() > toDate.getTime()
    ) {
      return 0;
    }
    const constructionProgress = this.constructionProgressList.find((item) => {
      return item.dateTimeForView?.toDateString() == date.toDateString();
    });
    if (!constructionProgress) {
      return undefined;
    }
    let ret = 0;
    switch (activitySubType) {
      case ConstructionActivitySubType.cut:
        ret = constructionProgress?.difference?.cutVolume ?? 0;
        break;
      case ConstructionActivitySubType.fill:
        ret = constructionProgress?.difference?.fillVolume ?? 0;
        break;
    }
    return Math.round(ret * 10) / 10;
  }

  /**
   * 平均取得
   */
  private getAverage(rangeChartData: RangeChartData): number {
    let total = 0;
    let dataCount = 0;
    let sumTypeCount = 0; // 切土/盛土の表示されているタイプ数

    const chartData = rangeChartData.getChartData();
    const labels = chartData.labels;

    for (const chartDataSet of chartData.datasets) {
      if (chartDataSet.hidden) continue;
      ++sumTypeCount;
      for (let i = 0; i < chartDataSet.data.length; i++) {
        // 日付のラベルが空欄の場合はスキップ
        if (!labels[i]) continue;
        // 実際のデータがない=undefinedの場合はスキップ
        const value = chartDataSet.rawData[i];
        if (value === undefined) continue;
        total += chartDataSet.data[i];
        dataCount++;
      }
    }
    dataCount = dataCount > 0 ? dataCount / sumTypeCount : 0; // タイプ数で割る
    const average = dataCount > 0 ? total / dataCount : 0;
    return Math.round(average * 10) / 10;
  }

  /**
   * 直近の日曜日を取得
   */
  private getLastSunday(date: Date) {
    const retDate = new Date(date);
    retDate.setHours(0, 0, 0, 0);
    retDate.setDate(retDate.getDate() - retDate.getDay());
    return retDate;
  }

  /**
   * 日付加算
   */
  private addDays(date: Date, numberOfdays: number) {
    const _date = new Date(date);
    _date.setHours(0, 0, 0, 0);
    _date.setDate(_date.getDate() + numberOfdays);
    return _date;
  }

  /**
   * 週加算
   */
  private addWeeks(date: Date, numberOfWeeks: number) {
    const _date = new Date(date);
    _date.setHours(0, 0, 0, 0);
    _date.setDate(_date.getDate() + 1);
    _date.setDate(_date.getDate() + numberOfWeeks * 7);
    return _date;
  }

  /**
   * 月加算
   */
  private addMonth(date: Date, numberOfMonths: number) {
    const _date = new Date(date);
    _date.setHours(0, 0, 0, 0);
    const d = _date.getDate();
    _date.setMonth(_date.getMonth() + numberOfMonths);
    if (_date.getDate() != d) {
      _date.setDate(0);
    }
    return _date;
  }
}
