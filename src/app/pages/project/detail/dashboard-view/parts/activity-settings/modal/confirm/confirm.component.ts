import {
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { ConstructionActivityAction } from 'src/app/stores/actions/project/construction-activity.action';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';

@Component({
  selector: 'ntc-activity-settings-confirm-modal',
  templateUrl: './confirm.component.html',
  styleUrl: './confirm.component.scss',
})
export class ActivitySettingsConfirmModalComponent
  extends BaseComponent
  implements OnDestroy
{
  @ViewChild('modal') modal: BasicModalComponent | undefined;

  @Output() emitOnClose = new EventEmitter<boolean>();

  private projectId: string | undefined;
  public title: string = '';
  public message: string = '';
  public getLatestContructionData: boolean = false;
  public isDelaytaskHandling: boolean = false;

  private constructionActivity: ConstructionActivity | undefined;

  private onDestroySubject$ = new Subject();

  constructor(
    private store: Store<ApplicationState>,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('ActivitySettingsConfirmModalComponent');
  }

  public open(
    projectId: string,
    title: string,
    message: string,
    getLatestContructionData: boolean,
    isDelaytaskHandling: boolean,
    constructionActivity: ConstructionActivity,
  ) {
    this.title = title;
    this.message = message;
    this.getLatestContructionData = getLatestContructionData;
    this.isDelaytaskHandling = isDelaytaskHandling;
    this.projectId = projectId;
    // shallow copy
    this.constructionActivity = { ...constructionActivity };

    this.modal?.open();
    return;
  }
  /**
   * OKボタン
   */
  public onOK() {
    if (
      !this.projectId ||
      !this.constructionActivity ||
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      this.modal?.close();
      return;
    }

    // エラーリセット
    this.store.dispatch(ConstructionActivityAction.ResetErrorAction());

    // 進捗確認設定更新
    this.store.dispatch(
      ConstructionActivityAction.UpdateConstructionActivityAction({
        projectId: this.projectId,
        currentConstructionActivity: this.constructionActivity,
        getLatestContructionData: this.getLatestContructionData,
        isDelaytaskHandling: this.isDelaytaskHandling,
      }),
    );
    this.emitOnClose.emit(this.isDelaytaskHandling);
    this.modal?.close();
    return;
  }

  /**
   * キャンセル/閉じるボタン
   */
  public onClose() {
    this.modal?.close();
    return;
  }

  public override ngOnDestroy(): void {
    this.onDestroySubject$.next(void 0);
    super.ngOnDestroy();
  }
}
