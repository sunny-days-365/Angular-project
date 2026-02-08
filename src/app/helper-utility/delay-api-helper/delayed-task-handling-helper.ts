import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import {
  INJECT_DELAYED_TASK_CONTROL_HANDLER,
  DelayedTaskControlHandler,
} from '@nikon-trimble-sok/api-sdk-d3';
import { DelayedTaskAction } from 'src/app/stores/actions/delayed-task/delayed-task.action';
import { TaskRemains } from '@nikon-trimble-sok/api-sdk-d3';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Store } from '@ngrx/store';
import { SingletonTaskHandlingIdHandler } from './singleton-task-handlingId-handler';
import { ExecutiveFunctions } from 'src/app/stores/states/delayed-task/delayed-task-definitions';

export class DelayedTaskHandlingHelper {
  private readonly handlingId;

  constructor(
    private readonly store: Store<ApplicationState>,
    private readonly executiveFunctions: ExecutiveFunctions,
  ) {
    // Create an identifier task ID
    this.handlingId =
      SingletonTaskHandlingIdHandler.getInstance().generateTaskId();
  }

  // Prepare to manually handle delayed tasks
  public setup() {
    // Record that processing has started
    this.store.dispatch(
      DelayedTaskAction.RequestDelayedTaskAction({
        executiveFunctions: this.executiveFunctions,
        handlingId: this.handlingId,
      }),
    );

    // Turn off delayed handling of delayed tasks
    const c = new HttpContext();
    const h = new DelayedTaskControlHandler();
    // Set handler
    h.onStart = this.onStart.bind(this);
    h.onEnd = this.onEnd.bind(this);
    h.onError = this.onError.bind(this);

    c.set(INJECT_DELAYED_TASK_CONTROL_HANDLER, h);

    return c;
  }

  // #region Handling functions

  private onStart(t: TaskRemains) {
    this.store.dispatch(
      DelayedTaskAction.OnDelayedTaskOccurredAction({
        handlingId: this.handlingId,
        taskRemains: t,
      }),
    );
  }

  private onEnd(data: object) {
    this.store.dispatch(
      DelayedTaskAction.OnDelayedTaskCompletedAction({
        handlingId: this.handlingId,
        data: data,
      }),
    );
  }

  private onError(error: object) {
    let errorAct = error as HttpErrorResponse;
    // Possible errors include both HTTP errors and errors returned from within delayed tasks.
    // Since errors returned from delayed tasks are of the Error type,
    // it is necessary to check whether they are of the same type and convert them if needed.
    if (isError(error)) {
      errorAct = new HttpErrorResponse({
        error: error,
        statusText: 'An error occurred while executing a delayed task.',
        url: this.getExecutiveFunctionName() ?? 'unknown',
      });
    }

    this.store.dispatch(
      DelayedTaskAction.OnDelayedTaskErrorAction({
        handlingId: this.handlingId,
        error: errorAct,
      }),
    );
  }

  private getExecutiveFunctionName(): string | undefined {
    try {
      return Object.entries(ExecutiveFunctions).find(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, val]) => val === this.executiveFunctions,
      )?.[0];
    } catch {
      return 'unknown';
    }
  }

  // #endregion
}

// #region type helper functions

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// #endregion
