import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import { ImportPopupSelector } from 'src/app/stores/selectors/project/detail/data-3d-view/left-panel/import-popup/import-popup.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import {
  ImportStep,
  ImportStepEnum,
} from 'src/app/stores/states/project/detail/data-3d-view/left-panel/import-popup/import-popup.definition';

const ALL_ORDERED_BREAD_CRUMBS = [
  {
    id: ImportStepEnum.Type,
    label: 'ファイルタイプを選択',
  },
  {
    id: ImportStepEnum.File,
    label: 'ファイルを選択',
  },
  {
    id: ImportStepEnum.Confirmation,
    label: 'インポート確認',
  },
];

@Component({
  selector: 'ntc-import-popup-bread-crumb',
  templateUrl: './bread-crumb.component.html',
  styleUrls: ['./bread-crumb.component.scss'],
})
export class ImportPopupBreadCrumbComponent extends BaseComponent {
  allBreadCrumbs = ALL_ORDERED_BREAD_CRUMBS;

  breadCrumbs: Array<{ id: ImportStep; label: string }> = [];

  importInProgress: boolean = false;
  importAborting: boolean = false;

  public stepIndex: number = 0;

  public currentStep: ImportStep | undefined;

  get isSelectingImport() {
    return this.currentStep === ImportStepEnum.Import;
  }

  constructor(private store: Store<ApplicationState>) {
    super('ImportPopupBreadCrumbComponent');

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectorCurrentStep)
        .subscribe((step) => {
          if (step) {
            this.generateBreadCrumbs(step);
            this.currentStep = step;
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectImportInProgress)
        .subscribe((importInProgress) => {
          this.importInProgress = importInProgress;
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ImportPopupSelector.selectImportAborting)
        .subscribe((importAborting) => {
          this.importAborting = importAborting;
        }),
    );
  }

  generateBreadCrumbs(importStep: ImportStep) {
    if (importStep === ImportStepEnum.SelectSurveyController) {
      importStep = ImportStepEnum.File;
    }
    this.stepIndex = ALL_ORDERED_BREAD_CRUMBS.findIndex(
      (item) => item.id === importStep,
    );
    this.breadCrumbs = ALL_ORDERED_BREAD_CRUMBS.slice(0, this.stepIndex + 1);
  }

  onChangeBreadCrumb(id: ImportStep, index: number) {
    if (index >= this.stepIndex) {
      return;
    }
    this.store.dispatch(
      ImportPopupAction.SetCurrentStep({
        step: id,
      }),
    );
  }
}
