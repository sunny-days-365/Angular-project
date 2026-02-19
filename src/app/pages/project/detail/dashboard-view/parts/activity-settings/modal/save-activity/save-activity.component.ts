import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
// import { Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
// import { fromEvent, Subject, takeUntil } from 'rxjs';
import { ConstructionActivity } from '@nikon-trimble-sok/api-sdk-d3';
import { NtcModusTextInputComponent } from '@nikon-trimble-sok/modus-wrapper';
import {
  isError,
  nameValidator,
} from 'src/app/helper-utility/form-helper/form-helper';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import { ConstructionActivityAction } from 'src/app/stores/actions/project/construction-activity.action';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';

@Component({
  selector: 'ntc-activity-settings-save-activity-modal',
  templateUrl: './save-activity.component.html',
  styleUrl: './save-activity.component.scss',
})
// TODO 20240903 エンターでの制御（保留）
export class ActivitySettingsSaveActivityModalComponent {
  @ViewChild('modal') modal: BasicModalComponent | undefined;

  @ViewChild('input')
  input: NtcModusTextInputComponent | undefined;

  @Output() emitOnClose = new EventEmitter();

  public title: string = '';

  public placeHolder: string = '';

  private projectId: string | undefined;

  private constructionActivity: ConstructionActivity | undefined;

  form = new FormGroup({
    activityName: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
      nameValidator(),
    ]),
  });

  // private onDestroySubject$ = new Subject();

  constructor(private store: Store<ApplicationState>) {
    /*
    fromEvent(document, 'keyup')
      .pipe(takeUntil(this.onDestroySubject$))
      .subscribe((e: Event)=>{
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.code === 'Enter') {
          const nameControl = this.form.get('activityName');
          nameControl?.markAsTouched();
          if (this.getErroractivityName() === '') {
            this.onOk();
          }
        }
      });
    */
  }

  /*
  ngOnDestroy(): void {
    this.onDestroySubject$.next(void 0);
  }
  */

  public open(
    title: string,
    placeHolder: string,
    projectId: string,
    constructionActivity: ConstructionActivity,
  ) {
    this.title = title;
    this.placeHolder = placeHolder;
    this.projectId = projectId;
    // shallow copy
    this.constructionActivity = { ...constructionActivity };
    this.form.reset();
    if (this.constructionActivity.id) {
      this.form.patchValue({
        activityName: this.constructionActivity.name,
      });
    } else {
      this.form.patchValue({
        activityName: '',
      });
      this.form.controls['activityName'].markAsUntouched();
    }
    this.modal?.open();
    this.input?.targetInput?.focusInput();
    return;
  }

  /**
   * OKボタン
   */
  public onOk() {
    if (!this.projectId || !this.constructionActivity) {
      this.onClose();
      return;
    }
    this.constructionActivity.name = this.form.value.activityName;

    // エラーリセット
    this.store.dispatch(ConstructionActivityAction.ResetErrorAction());

    if (this.constructionActivity.id) {
      // 進捗確認設定更新
      this.store.dispatch(
        ConstructionActivityAction.PatchConstructionActivityAction({
          projectId: this.projectId,
          activityId: this.constructionActivity.id,
          constructionActivity: this.constructionActivity,
        }),
      );
    } else {
      // 進捗確認設定登録
      this.store.dispatch(
        ConstructionActivityAction.PostConstructionActivityAction({
          projectId: this.projectId,
          constructionActivity: this.constructionActivity,
        }),
      );
    }
    this.onClose();
    return;
  }

  // handle show message error
  public getErrorActivityName(): string {
    const nameControl = this.form.get('activityName');

    if (isError('required', nameControl)) {
      return this.extractAppMessage('SOK1001', '名前');
    } else if (isError('forbiddenChars', nameControl)) {
      return this.extractAppMessage('SOK1011');
    } else if (isError('maxlength', nameControl)) {
      return this.extractAppMessage('SOK1002', ['名前', '255']);
    } else {
      return '';
    }
  }

  /**
   * キャンセル/閉じるボタン
   */
  public onClose() {
    this.emitOnClose.emit();
    this.modal?.close();
    return;
  }

  // Function base extract message from messageId
  private extractAppMessage(
    messageId: string,
    params?: string | string[],
  ): string {
    return extractAppMessage(messageId, params);
  }
}
