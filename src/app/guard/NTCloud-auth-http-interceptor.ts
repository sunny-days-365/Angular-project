import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, combineLatest, concatMap, from, take } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { ClassLogHelper } from '../helper-utility/logger-helper/class-log-helper';
import { GetAcquiredTokens } from '../helper-utility/trimble-identity-helper/acquired-token';
import { Store } from '@ngrx/store';
import { ApplicationState } from '../stores/states/application-wide/app.state';
import { ProjectListSelector } from '../stores/selectors/project-list/ProjectListState.selector';
import { Actions } from '@ngrx/effects';

/// NT-Cloud api のHTTP通信にapiトークンをつける
//
// [参考]
// AngularにおけるInterceptorの使い方
// https://okiyasi.hatenablog.com/entry/2020/06/28/182220
@Injectable()
export class NTCloudAuthHttpInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {}
  intercept(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: HttpRequest<any>,
    next: HttpHandler,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Observable<HttpEvent<any>> {
    // このInterceptorはNT-Cloud APIが処理対象となっている。
    // それ以外のAPIが呼び出された場合、チェック対象から外して、何もしない

    if (request.url.includes(environment.credentialsParams.serviceUri)) {
      return next.handle(request);
    }

    return combineLatest([
      this.store.select(ProjectListSelector.selectorServerSelected),
      this.store.select(ProjectListSelector.selectorListServer),
    ]).pipe(
      take(1),
      concatMap((act) => {
        let requestApi = request;

        // Memo: For some API of NTCloudAPI_URL (such as delete model, create 3d map...) if not set Content-Type: application/json in headers API will return error 415
        // Adding Content-Type: application/json to fix this issue
        if (
          request.url.includes(environment.NTCloudAPI_URL) &&
          request.method !== 'GET'
        ) {
          requestApi = this.setContentType(request);
        }

        const serverSelected = act[0];
        const listServer = act[1];

        if (serverSelected) {
          const tcApi = serverSelected.origin;
          const isRequestWithoutToken =
            !request.url.includes(environment.NTCloudAPI_URL) &&
            !request.url.includes(tcApi) &&
            !listServer.some((item) => request.url.includes(item.origin));

          // Add token for API call to TC and NTCloudAPI
          if (isRequestWithoutToken) {
            return next.handle(requestApi);
          }
          return this.requestWithToken(requestApi, next);
        }

        return next.handle(requestApi);
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requestWithToken(request: HttpRequest<any>, next: HttpHandler) {
    return from(this.setToken(request)).pipe(
      concatMap((r) => {
        if (r) {
          return next.handle(r);
        } else {
          // エラーとして処理を返す
          const error = new HttpErrorResponse({
            status: 401,
            error: 'Unauthorized',
            headers: request.headers,
            url: request.url,
          });
          throw error;
        }
      }),
    );
  }

  // トークンを設定する
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async setToken(request: HttpRequest<any>) {
    try {
      const t = await GetAcquiredTokens(this.store, this.actions$);
      if (t?.access_token) {
        const r = request.clone({
          setHeaders: {
            Authorization: `Bearer ${t?.access_token}`,
          },
        });
        return r;
      }
    } catch (exp) {
      new ClassLogHelper('NTCloud-auth-http-interceptor').error(exp);
    }

    return undefined;
  }

  private setContentType(request: HttpRequest<unknown>) {
    const r = request.clone({
      setHeaders: {
        'Content-Type':
          request.headers.get('Content-Type') ?? 'application/json',
      },
    });

    return r;
  }
}
