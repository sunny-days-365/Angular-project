import { Store, select } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Title } from '@angular/platform-browser';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { Component } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DashboardSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/dashboard-selector';
import { TodoListState } from 'src/app/stores/states/project/detail/dashboard-view/todo-list.state';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';

@Component({
  selector: 'ntc-project-project-dashboard-view-todo-list-component',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss'],
  providers: [Title],
})
export class TodoListComponent extends BaseComponent {
  public readonly todoList$: Observable<TodoListState | undefined>;
  // 読み込み中の判定
  public readonly isLoading$: Observable<boolean>;

  public isSidebarExpanded: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('TodoListComponent');
    this.todoList$ = this.store.pipe(
      select(DashboardSelector.TodoListSelector.selectorTodoList),
    );

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );

    this.isLoading$ = this.store.pipe(
      select(DashboardSelector.TodoListSelector.selectorTodoList),
      map((x) => {
        if (!x) {
          return true;
        } else if (true == x?.inProcess) {
          return true;
        }
        return false;
      }),
    );
  }
}
