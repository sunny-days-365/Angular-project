import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { canActivateToken } from './guard/auth.guard';
import { PagesComponent } from './pages/pages.component';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./pages-login/pages-login.module').then(
        (m) => m.PagesLoginModule,
      ),
    //canActivate: environment.AUTH0_Authentication ? [AuthGuard] : [],
  },
  {
    path: 'pages',
    component: PagesComponent,
    loadChildren: () =>
      import('./pages/pages.module').then((m) => m.PagesModule),
    canActivate: [canActivateToken],
  },
  //最初はログインページに遷移させる
  {
    path: '',
    redirectTo: 'login/login-top',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login/login-top',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      //  enableTracing: true,
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
