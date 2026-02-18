import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import Chart, { ChartOptions, LegendItem, TooltipItem } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { RangeChartData } from './chart-data.definition';

Chart.register(ChartDataLabels);

@Component({
  selector: 'ntc-construction-week-card-range-chart [id] [data]',
  templateUrl: './construction-week-card-range-chart.component.html',
  styleUrls: ['./construction-week-card-range-chart.component.scss'],
})
export class ConstructionWeekCardRangeChartComponent
  extends BaseComponent
  implements OnInit, AfterViewInit
{
  @Input() id: string | undefined;
  @Input() icons: string | undefined;
  @Input() title: string | undefined;
  @Input() data: RangeChartData | undefined;
  @Input() legendFontSize: number | undefined;

  @ViewChild('canvas') private canvas?: ElementRef;

  public chart: Chart | undefined;

  private chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 9.5,
          },
        },
      },
      y: {
        stacked: true,
        beginAtZero: false,
      },
    },
    plugins: {
      title: {
        display: false,
      },
      datalabels: {
        display: false,
      },
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          textAlign: 'left',
          filter: function (items: LegendItem) {
            return items.text !== 'hidden';
          },
          sort: function (li0: LegendItem) {
            return li0.text == '盛土' ? 1 : -1;
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<'bar'>) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.formattedValue !== null) {
              label +=
                (
                  Math.round(
                    Number(context.formattedValue.replace(/,/g, '')) * 10,
                  ) / 10
                ).toLocaleString() + ' m\u00B3';
            }
            return label;
          },
        },
      },
    },
  };

  constructor(private store: Store<ApplicationState>) {
    super('ConstructionWeekCardRangeChartComponent');
  }

  ngOnInit(): void {
    this.id = this.id ?? generateElementId();
    if (this.legendFontSize && this.chartOptions.scales.x.ticks.font.size) {
      this.chartOptions.scales.x.ticks.font.size = this.legendFontSize;
    }
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  public updateChart() {
    if (!this.id || !this.data) {
      return;
    }

    this.chart?.destroy();

    this.chart = new Chart(this.id, {
      type: 'bar',
      data: this.data.getChartData(),
      options: this.chartOptions as ChartOptions,
    });
  }

  private createChart() {
    if (!this.canvas?.nativeElement) return;
    const data = {
      labels: [],
      datasets: [],
    };
    this.chart = new Chart(this.id ?? generateElementId(), {
      type: 'bar',
      data: data,
      options: this.chartOptions as ChartOptions,
    });
  }
}
let counterElementId = 0;
function generateElementId(): string {
  return `chart_${counterElementId++}`;
}
