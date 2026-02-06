import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  CanActivateFn,
} from '@angular/router';
import { from } from 'rxjs';
import { ClassLogHelper } from '../helper-utility/logger-helper/class-log-helper';
import { GetAcquiredTokens } from '../helper-utility/trimble-identity-helper/acquired-token';
import { DomSanitizer } from '@angular/platform-browser';
import { inject, SecurityContext } from '@angular/core';

// サービスから該当の値を取得してチェックする
async function check(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  sanitizer: DomSanitizer,
) {
  try {
    const t = await GetAcquiredTokens();
    if (t) {
      return true;
    }
  } catch (exp) {
    new ClassLogHelper('auth.guard').error(exp);
  }

  // ログイン状態が正しくなかったら、rootページに遷移させる
  try {
    const pathList = state.url.split('/');
    let id: string | null = null;
    pathList.splice(0, 2); // 最初の２つの要素は'/', 'pages'
    if (pathList.length == 2 && pathList[0] === 'project') {
      id = sanitizer.sanitize(SecurityContext.URL, pathList[1]);
    }
    if (id) {
      location.href = '/?project-id=' + id;
    } else {
      location.href = '/';
    }
  } catch (exp) {
    new ClassLogHelper('auth.guard').error(exp);
  }

  return false;
}

// トークンの有効判定を行う
export const canActivateToken: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  return from(check(route, state, inject(DomSanitizer)));
};
