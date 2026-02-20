import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Component, Input } from '@angular/core';
import { NumberFormatHelperService } from 'src/app/helper-utility/number-format-helper/number-format-helper.service';

@Component({
  selector: 'ntc-construction-week-card-range-average',
  templateUrl: './construction-week-card-range-average.component.html',
  styleUrls: ['./construction-week-card-range-average.component.scss'],
})
export class ConstructionWeekCardRangeAverageComponent extends BaseComponent {
  @Input() icons: string | undefined;
  @Input() title: string | undefined;
  @Input() past7DaysAverage: number = 0;
  @Input() past5WeekAverage: number = 0;
  @Input() past5MonthAverage: number = 0;

  protected readonly formatter = new NumberFormatHelperService();

  constructor(private store: Store<ApplicationState>) {
    super('ConstructionWeekCardRangeAverageComponent');
  }

  public toFixedString(volume: number | undefined) {
    return this.formatter.formatCutfill(volume ?? 0.0, false, true);
  }
}
