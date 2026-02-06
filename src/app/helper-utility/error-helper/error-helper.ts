import { HttpErrorResponse } from '@angular/common/http';
import * as _ from 'lodash';
import { isResponseError } from 'src/app/helper-utility/api-helper/type-guard';
import { extractAppMessage } from '@nikon-trimble-sok/common';

// Effect用の補助関数セット

// 可能な限りエラーメッセージを抽出する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractErrorMessage(err: any): string {
  if (err instanceof HttpErrorResponse) {
    if (500 == err.status) {
      //500番だったら、サーバーの内部エラーの情報を持っているか判定する
      if (err?.error) {
        // システムの独自情報を持っていたら、対象のデータを取り出す
        if (isResponseError(err.error)) {
          return err.error.errorMessage ?? 'Unknown';
        }
      }
    }

    // よく分からない場合、ステータス文字列を取り出す
    return err.error?.message || extractAppMessage('SOK1003');
  }

  //メッセージがあるか取り出してみる
  let msg = extractAppMessage('SOK1003');
  if (false === _.isNil(err?.message)) {
    msg = err?.message;
  }
  return msg;
}
