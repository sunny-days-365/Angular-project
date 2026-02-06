import Logger from 'js-logger';
import { environment } from '../../environments/environment';

/** ログ設定管理機構 */
export class LogConfigurationHelper {
  public static setup() {
    if (false === environment?.production) {
      // ロガーを有効化
      Logger.useDefaults({
        defaultLevel: Logger.WARN,
        formatter: function (messages) {
          messages.unshift('👷‍♂️NTC👷‍♂️ ');
        },
      });

      // モードを切り替え
      Logger.setLevel(Logger.DEBUG);

      Logger.debug('Start Loginng!');
    }
  }
}
