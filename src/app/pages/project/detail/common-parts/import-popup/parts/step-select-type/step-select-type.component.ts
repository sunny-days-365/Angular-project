import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { BasicRadioGroupOptions } from '@nikon-trimble-sok/parts-components';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  ImportFrom,
  ImportFromEnum,
  ImportStepEnum,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';
import { ImportPopupFromService } from 'src/app/stores/strage/services/project/detail/data-3d-view/left-panel/import/import-popup-from.service';

@Component({
  selector: 'ntc-import-popup-step-select-type',
  templateUrl: './step-select-type.component.html',
  styleUrls: ['./step-select-type.component.scss'],
})
export class ImportPopupStepSelectTypeComponent extends BaseComponent {
  importFromOptions: BasicRadioGroupOptions<ImportFrom>[] = [
    {
      id: ImportFromEnum.Local,
      label: 'PCから',
      value: ImportFromEnum.Local,
      icon: 'file',
    },
    {
      id: ImportFromEnum.FileManage,
      label: 'ファイル管理から',
      value: ImportFromEnum.FileManage,
      icon: 'folder_closed ',
    },
    {
      id: ImportFromEnum.SurveyControl,
      label: 'コントローラから',
      value: ImportFromEnum.SurveyControl,
      imgSrc: '/assets/img/setting/localize_type_03.svg',
      disabled: true,
    },
  ];

  form = new FormGroup({
    importFrom: new FormControl<ImportFrom>(ImportFromEnum.Local),
  });

  get isDisableCancelButton() {
    return true;
  }

  get isDisableNextButton() {
    return (
      this.importFromOptions[2]['disabled'] &&
      this.form.controls['importFrom'].value == ImportFromEnum.SurveyControl
    );
  }

  constructor(
    private store: Store<ApplicationState>,
    private importPopupFromService: ImportPopupFromService,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('ImportPopupStepSelectTypeComponent');

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorImportFrom)
        .subscribe((importFrom) => {
          if (importFrom) {
            this.form.controls['importFrom'].patchValue(importFrom);
          }
        }),
    );

    this.addSubscriptionsList(
      this.form.controls['importFrom'].valueChanges.subscribe((value) => {
        // store current value
        this.importPopupFromService.upsert(() => ({
          value: value as ImportFrom,
        }));
        this.store.dispatch(
          ImportPopupAction.SetImportFrom({
            importFrom: value as ImportFrom,
          }),
        );
      }),
    );

    this.addSubscriptionsList(
      this.projectAccessControlService.onChangeObservable$.subscribe(() => {
        this.importFromOptions[2]['disabled'] =
          !this.projectAccessControlService.isConstructionSupportAvailable();
      }),
    );
  }

  open() {
    const storedImportFrom = this.importPopupFromService.get();
    if (storedImportFrom) {
      this.form.controls['importFrom'].patchValue(
        storedImportFrom.value ?? null,
      );
    }
  }

  onOk() {
    // 測量用コントローラ選択時は別ルート
    if (
      (this.form.controls['importFrom'].value as ImportFrom) ==
      ImportFromEnum.SurveyControl
    ) {
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: ImportStepEnum.SelectSurveyController,
        }),
      );
    } else {
      this.store.dispatch(
        ImportPopupAction.SetCurrentStep({
          step: ImportStepEnum.File,
        }),
      );
    }
  }

  onCancel() {}
}
