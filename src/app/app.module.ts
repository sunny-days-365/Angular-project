import { ErrorHandler, LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { AngularSplitModule } from 'angular-split';
import { NTCloudEnvironment } from 'src/environments/environment-interface';
import { environment } from 'src/environments/environment';
import * as _ from 'lodash';

// API関係
import * as APIService_NtCloud from '@nikon-trimble-sok/api-sdk-d3';
import * as APIService_LicenseManagement from '@nikon-trimble-sok/api-sok-license-management';

import { CommonModule, registerLocaleData } from '@angular/common';
import localeJa from '@angular/common/locales/ja';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NTCloudAuthHttpInterceptor } from './guard/NTCloud-auth-http-interceptor';
registerLocaleData(localeJa);

import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { TrimbleApiServicesModule } from './services/trimble-api-services.module';

import { ApplicationinsightsAngularpluginErrorService } from '@microsoft/applicationinsights-angularplugin-js';
import { SOK_RegisteringMessageMasterInformation } from '@nikon-trimble-sok/common';
import { MESSAGE } from './helper-utility/message-helper/message-list';
import {
  API_SOK_3D_DELAY_TASK_CONFIG,
  DelayTaskInterceptor,
} from '@nikon-trimble-sok/api-sdk-d3';
import { TooManyRequestsErrorInterceptor } from './interceptor/too-many-requests-error.interceptor';
import { Data3DViewHelperService } from './pages/project/detail/data-3d-view/data-3d-view.service';
import { NTCloudStoreModule } from './stores/nt-cloud-store.module';
import { BaseLayoutModule } from './parts-components/base-layout/base-layout.module';

// メッセージのマスタ情報情報を設定する
SOK_RegisteringMessageMasterInformation(MESSAGE);

/** APIのエンドポイントパスを生成する */
class ApiConfigurationGenerator {
  /** パスを生成する */
  public static generate(env: NTCloudEnvironment) {
    const r = [
      // ロケール設定
      {
        provide: LOCALE_ID,
        useValue: 'ja-JP',
      },
      //認証ヘッダの添付
      {
        provide: HTTP_INTERCEPTORS,
        useClass: NTCloudAuthHttpInterceptor,
        multi: true,
      },
      // 遅延タスクが発生した時のハンドリングを行う
      {
        provide: HTTP_INTERCEPTORS,
        useClass: DelayTaskInterceptor,
        multi: true,
      },
      //HTTPでレートリミットに引っかかったときのグローバルエラーハンドリングを行う
      {
        provide: HTTP_INTERCEPTORS,
        useClass: TooManyRequestsErrorInterceptor,
        multi: true,
      },
      // APIのURLを設定
      {
        provide: APIService_NtCloud.BASE_PATH,
        useValue: environment.NTCloudAPI_URL,
        // memo : アプリ独自で定義したモジュール識別子
        identifier: 'APIService_NtCloud',
      },
      {
        provide: APIService_LicenseManagement.BASE_PATH,
        useValue: environment.NTCloudAPI_URL,
        // memo : アプリ独自で定義したモジュール識別子
        identifier: 'APIService_LicenseManagement',
      },
    ];

    //[ToDo 暫定]
    // モックAPIに接続しておく
    if (true === env.API_Local_Mock) {
      const t = _.chain(r)
        .filter(
          (x) =>
            x.identifier === 'APIService_NtCloud' ||
            x.identifier === 'APIService_LicenseManagement',
        )
        .first()
        .value();
      if (false === _.isNil(t)) {
        t.useValue = environment.NTCloudAPI_URL + '/' + 'prism_ntcloudapi';
      }
    }

    return r;
  }
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    //    StoreModule.forRoot({ appState: reducerFunc }, {}),
    // EffectsModule.forRoot([
    //   ProjectEffects,
    //   ProjectListEffects,
    //   ProgressHeatMapEffects,
    //   AreaDisplayControlEffects,
    //   DashboardEffects,
    //   FileTreeViewEffects,
    //   TodoListEffects,
    //   CrossSectionEffects,
    //   NtCommandEffects,
    // ]),
    //NTCloudStoreModule,

    StoreModule.forRoot({}),
    StoreDevtoolsModule.instrument({}),
    EffectsModule.forRoot([]),

    // ngx-leafletモジュール読み込み
    LeafletModule,
    AngularSplitModule,

    // API関係
    APIService_NtCloud.ApiModule,
    APIService_LicenseManagement.ApiModule,

    // [memo]
    // singletionの動作があるので
    // このモジュールはルート画面でのみロードするようにする
    TrimbleApiServicesModule,
    APIService_NtCloud.DelayApiServiceModule,

    CommonModule,
    NTCloudStoreModule,
    BaseLayoutModule,
  ],
  providers: [
    ...ApiConfigurationGenerator.generate(environment),
    {
      provide: ErrorHandler,
      useClass: ApplicationinsightsAngularpluginErrorService,
    },
    {
      provide: API_SOK_3D_DELAY_TASK_CONFIG,
      useValue: {
        // 遅延タスクでapiの種別毎に独自のタイムアウトを指定する場合、
        // ここで設定する
        // [設定例]
        // specialPollingDelayTime: {
        //   pointCloudCrossSection: {
        //     delayTime: 3000,
        //     // 5分てタイムアウトにする
        //     maxNumberOfRetries: 100,
        //   },
        // },
      },
    },
    {
      provide: Data3DViewHelperService,
    },
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
