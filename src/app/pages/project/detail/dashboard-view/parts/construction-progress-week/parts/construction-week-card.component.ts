import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { DashboardSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/dashboard-selector';
import { Component, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { ProgressChartState } from 'src/app/stores/states/project/detail/dashboard-view/progress-chart.state';
import { ConstructionActivitySubType } from '../../../dashboard-view.defination';

@Component({
  selector: 'ntc-construction-week-card',
  templateUrl: './construction-week-card.component.html',
})
export class ConstructionWeekCardComponent extends BaseComponent {
  @Input() title?: string;
  @Input() icons?: string;
  @Input() dateRange?: string | Date;
  @Input() dailyConstructionTotalTitle?: string;
  @Input() actualAverageValueUpToToday?: string;
  @Input() cutTotalTitle?: string;
  @Input() fillTotalTitle?: string;
  @Input() cutTotalRemainingTitle?: string;
  @Input() fillTotalRemainingTitle?: string;
  @Input() cutVolume?: string;
  @Input() fillVolume?: string;
  @Input() cutFillVolume?: string;
  @Input() dailyVolume?: string;
  @Input() actualAverageVolume?: string;
  // 建設の進捗状態
  public readonly progressChart$: Observable<ProgressChartState | undefined>;

  public readonly constructionActivitySubType = ConstructionActivitySubType;
  public activitySubType: number = ConstructionActivitySubType.cutfill;

  // 残量表示(falseは実績)
  public remainingAmount: boolean = false;

  constructor(private store: Store<ApplicationState>) {
    super('ConstructionWeekCardComponent');

    (this.progressChart$ = this.store.select(
      DashboardSelector.ProgressChartSelector.selectorProgressChart,
    )),
      this.addSubscriptionsList(
        this.store
          .select(
            DashboardSelector.ProgressChartSelector
              .selectorProgressChartActivitySubType,
          )
          .subscribe((activitySubType: number) => {
            this.activitySubType = activitySubType;
          }),
      );
  }

  displayChange() {
    this.remainingAmount = !this.remainingAmount;
  }
}
