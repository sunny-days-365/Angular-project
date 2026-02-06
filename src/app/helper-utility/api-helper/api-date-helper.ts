import * as _ from 'lodash';
import { parseISO } from 'date-fns';

import { ConstructionProgress } from '@nikon-trimble-sok/api-sdk-d3';
import { ConstructionProgressForView } from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';

// APIの内部に持つ時間形式をアプリケーション側で処理できる形式に変換する補助関数
// APIから来た日付データはこの関数で変換して内部で保持する
export function apiDateToAppDate(
  apiDate: string | null | undefined,
): Date | undefined {
  if (apiDate) {
    const r = parseISO(apiDate);
    return r;
  }
  return undefined;
}

export function toConstructionProgressForView(
  data: ConstructionProgress[],
): ConstructionProgressForView[] {
  return _.chain(data)
    .map((x) => {
      return {
        ...x,
        //内部で処理がしやすい形式に変換する
        dateTimeForView: apiDateToAppDate(x.dateTime),
      };
    })
    .value();
}
