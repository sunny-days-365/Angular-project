import { Store } from '@ngrx/store';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { PointListPanelAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/point-list-panel/point-list-panel.action';
import { PointListPanelSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/point-list-panel/point-list-panel.selector';
import { NtcModusTimePickerComponent } from '@nikon-trimble-sok/modus-wrapper';
import { pointTypeNames } from 'src/app/helper-utility/api-helper/projects-models';
import { EditMode } from '../../point-list-panel.definition';
import {
  ModusDateInputEventDetails,
  ModusTimePickerEventDetails,
} from '@trimble-oss/modus-web-components';
import { ModusCheckbox } from '@trimble-oss/modus-angular-components';

@Component({
  selector: 'ntc-project-detail-data-3d-view-parts-point-list-panel-edit-bar',
  templateUrl: './edit-bar.component.html',
  styleUrls: ['./edit-bar.component.scss'],
})
export class EditBarComponent extends BaseComponent {
  @Input() editMode: EditMode | undefined = EditMode.Init;
  @Input() selectedPointIds: string[] = [];
  @Input() checkedAll: boolean = false;
  @Output() editModeChanged = new EventEmitter<EditMode | undefined>();
  @Output() checkAll = new EventEmitter<boolean>();

  @ViewChild('TimePicker') timePicker!: NtcModusTimePickerComponent;
  @ViewChild('CheckAllInputForDate') checkAllInputForDate:
    | ModusCheckbox
    | undefined;
  @ViewChild('CheckAllInputForType') checkAllInputForType:
    | ModusCheckbox
    | undefined;

  public EditModeForTemplate = EditMode;
  public pointTypeOptions: string[] = [];

  public newPointType: string = '';
  public newDate: string = '';
  public newTime: string = '';

  constructor(private store: Store<ApplicationState>) {
    super('EditBarComponent');

    this.addSubscriptionsList(
      this.store
        .select(PointListPanelSelector.selectorPointTypeFilterOptions)
        .subscribe((options) => {
          const newOptions = (options ?? []).filter(
            (option): option is string => typeof option === 'string',
          );
          this.pointTypeOptions = Array.from(
            new Set([...pointTypeNames, ...newOptions]),
          );
        }),
    );
  }

  setEditMode(mode: EditMode | undefined) {
    this.newPointType = '';
    this.newDate = '';
    this.newTime = '';
    this.checkAll.emit(false);
    this.editModeChanged.emit(mode);
  }

  handlePointTypeChange(event: CustomEvent) {
    this.newPointType = event.detail;
  }

  handleDateChange(event: ModusDateInputEventDetails) {
    const customEvent = event as unknown as CustomEvent;
    this.newDate = customEvent.detail.value;
  }

  handleCheckAllForDateClick() {
    this.checkAll.emit(!this.checkedAll);
  }

  handleCheckAllForTypeClick() {
    this.checkAll.emit(!this.checkedAll);
  }

  handleTimeChange(event: ModusTimePickerEventDetails) {
    const customEvent = event as unknown as CustomEvent;
    this.timePicker.isValidFormatTime = customEvent.detail.value !== null;
    this.newTime = this.formatTime(customEvent.detail.value);
  }

  isInvalidPointType(): boolean {
    return this.selectedPointIds.length === 0 || this.newPointType === '';
  }

  isInvalidDateTime(): boolean {
    if (this.newTime === '') this.newTime = this.formatTime('17:00');
    return (
      this.selectedPointIds.length === 0 ||
      this.newDate === '' ||
      this.newDate === undefined ||
      this.newDate === null ||
      this.newTime === '' ||
      this.newTime === null
    );
  }

  onPointTypeUpdateBtnClicked() {
    this.store.dispatch(
      PointListPanelAction.UpdatePointTypeAction({
        pointIds: this.selectedPointIds,
        value: this.newPointType,
      }),
    );
    this.editModeChanged.emit(undefined);
  }

  onSurveyDateUpdateBtnClicked() {
    const combinedString = `${this.newDate}T${this.newTime}:00`;
    const isoString = new Date(combinedString).toISOString();

    this.store.dispatch(
      PointListPanelAction.UpdateSurveyDateAction({
        pointIds: this.selectedPointIds,
        value: isoString,
      }),
    );
    this.editModeChanged.emit(undefined);
  }

  formatTime(timeStr: string) {
    return timeStr.replace(/^(\d):/, '0$1:').replace(/:(\d)$/, ':0$1');
  }
}
