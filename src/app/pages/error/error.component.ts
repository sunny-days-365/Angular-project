import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { PageTransitionService } from 'src/app/services/page-transition/page-transition.service';
import { ApplicationWideLoadingAction } from 'src/app/stores/actions/application-wide/loading.action';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';

export enum ErrorFeatureList {
  projectList = 'projectList',
}
export function ErrorFeatureListToString(
  feature: string | undefined | null,
): ErrorFeatureList | undefined {
  switch (feature) {
    case ErrorFeatureList.projectList:
      return ErrorFeatureList.projectList;
    default:
      return undefined;
  }
}

@Component({
  selector: 'ntc-pages-error',
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss',
})
export class PagesErrorComponent extends BaseComponent implements OnInit {
  // navBar表示可否
  public showNavMenu: boolean = false;

  // エラーステータス
  public code: number | undefined;

  // エラーを起こした原因（文字列）
  public cause: string | undefined;

  // エラーを起こした機能
  public feature: ErrorFeatureList | undefined;

  public ErrorFeatureList = ErrorFeatureList;

  constructor(
    private activatedRoute: ActivatedRoute,
    private pageTransitionService: PageTransitionService,
    private readonly store: Store<ApplicationState>,
  ) {
    super('PagesErrorComponent');
    this.activatedRoute.data.subscribe((data) => {
      if (data['code']) {
        this.code = Number(data['code']);
      }
    });
  }

  ngOnInit(): void {
    this.showNavMenu = this.pageTransitionService.showNavMenu ?? false;
    this.feature = this.pageTransitionService.feature;
    this.cause = this.pageTransitionService.cause;

    this.store.dispatch(ApplicationWideLoadingAction.StopLoadingAction());
  }
}
