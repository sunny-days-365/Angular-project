import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { NtcModusDateInputComponent } from '@nikon-trimble-sok/modus-wrapper';
import { ModusDateInputEventDetails } from '@trimble-oss/modus-web-components';

@Component({
  selector:
    'ntc-project-detail-data-3d-view-parts-point-list-panel-filter-bar-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
})
export class DateRangePickerComponent extends BaseComponent {
  @Input() label: string = '';
  @Output() dateRangeChange = new EventEmitter<{
    start: string | undefined;
    end: string | undefined;
    showBlankItem: boolean;
  }>();

  @ViewChild('startDateInput') startDateInput!: NtcModusDateInputComponent;
  @ViewChild('endDateInput') endDateInput!: NtcModusDateInputComponent;

  public expanded: boolean = false;
  public startDate: string | undefined = undefined;
  public endDate: string | undefined = undefined;
  public showBlankItem: boolean = false;

  constructor() {
    super('DateRangePickerComponent');
  }

  toggleExpand() {
    this.expanded = !this.expanded;
  }

  // Convert yyyy-mm-dd to yyyy/mm/dd for display
  formatDateForLabel(date: string): string {
    return date.replace(/-/g, '/');
  }

  // This function will update the label based on selected dates
  getSelectedDateRangeLabel() {
    if (this.showBlankItem) {
      return '日付なし';
    }
    if (this.startDate && !this.endDate) {
      return `${this.formatDateForLabel(this.startDate)} 以降`; // Only start date selected
    } else if (!this.startDate && this.endDate) {
      return `${this.formatDateForLabel(this.endDate)} 以前`; // Only end date selected
    } else if (this.startDate && this.endDate) {
      return `${this.formatDateForLabel(this.startDate)} - ${this.formatDateForLabel(this.endDate)}`; // Both start and end date selected
    } else {
      return this.label; // No date selected
    }
  }

  resetDateInputs() {
    this.startDateInput.rawValue = '';
    this.endDateInput.rawValue = '';
    this.startDate = undefined;
    this.endDate = undefined;
    this.startDateInput.isValidFormatDate = true;
    this.endDateInput.isValidFormatDate = true;
  }

  clearDates() {
    this.showBlankItem = false;
    this.resetDateInputs();
    this.dateRangeChange.emit({
      start: undefined,
      end: undefined,
      showBlankItem: this.showBlankItem,
    });
  }

  onStartDateSelect(event: ModusDateInputEventDetails) {
    const customEvent = event as unknown as CustomEvent;
    this.startDate = customEvent.detail.value;

    this.dateRangeChange.emit({
      start: this.startDate,
      end: this.endDate,
      showBlankItem: this.showBlankItem,
    });

    this.checkDateRange();
  }

  onEndDateSelect(event: ModusDateInputEventDetails) {
    const customEvent = event as unknown as CustomEvent;
    this.endDate = customEvent.detail.value;
    this.dateRangeChange.emit({
      start: this.startDate,
      end: this.endDate,
      showBlankItem: this.showBlankItem,
    });

    this.checkDateRange();
  }

  handleShowBlankItemChange() {
    this.showBlankItem = !this.showBlankItem;
    this.resetDateInputs();
    this.dateRangeChange.emit({
      start: undefined,
      end: undefined,
      showBlankItem: this.showBlankItem,
    });
  }

  /**
   * 日付範囲チェック
   */
  checkDateRange() {
    if (!this.startDate || !this.endDate) {
      this.startDateInput.errorText = undefined;
      return;
    }
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    if (startDate > endDate) {
      this.startDateInput.errorText = this.extractAppMessage('SOK1006');
    } else {
      this.startDateInput.errorText = undefined;
    }
  }
}
