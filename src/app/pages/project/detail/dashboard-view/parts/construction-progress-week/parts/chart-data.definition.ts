import { DateRange } from '../../../dashboard-view.defination';

export type ChartDataSet = {
  label: string;
  data: number[];
  backgroundColor: string[];
  hidden: boolean;
  rawData: (number | undefined)[]; // 実績がない箇所をundefinedで保持するためのフィールド
};

export type ChartData = {
  labels: string[];
  datasets: ChartDataSet[];
};

export class RangeChartData {
  public startDate: Date;
  public endDate: Date;
  private data: ChartData;

  constructor(startDate: Date, endDate: Date) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.data = {
      labels: [],
      datasets: [],
    };
  }

  public resetData() {
    this.data = {
      labels: [],
      datasets: [],
    };
  }

  public updateDateRange(dateRange: DateRange) {
    this.startDate = dateRange.from;
    this.endDate = dateRange.to;
  }

  public hasDateRange(): boolean {
    return !!this.startDate && !!this.endDate;
  }

  public getLabels(): string[] {
    return this.data.labels;
  }

  public setLabels(labels: string[]) {
    this.data.labels = labels;
  }

  public addChartDataSet(dataset: ChartDataSet) {
    this.data.datasets.push(dataset);
  }

  public getChartDataSets(): ChartDataSet[] {
    return this.data.datasets;
  }

  public getChartData(): ChartData {
    return this.data;
  }
}
