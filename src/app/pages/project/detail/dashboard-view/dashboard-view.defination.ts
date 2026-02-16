import {
  ConstructionActivity,
  ConstructionActivitySubTypes,
} from '@nikon-trimble-sok/api-sdk-d3';
import { format } from 'date-fns';
import { cloneDeep } from 'lodash';
import {
  ConstructionProgressForView,
  ConstructionProgressViewData,
} from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';

export const PLACEHOLDER_ACTIVITY = '進捗確認設定を選択';

// 進捗確認設定 - 工種タイプ
export enum ConstructionActivitySubType {
  cutfill = ConstructionActivitySubTypes.NUMBER_0,
  cut = ConstructionActivitySubTypes.NUMBER_1,
  fill = ConstructionActivitySubTypes.NUMBER_2,
}

const FORMAT_ISO = 'yyyy/MM/dd';

// 非稼働日
const NON_WORKING_DAYS = ['Saturday', 'Sunday'];

export type DateRange = { from: Date; to: Date };

// *** デバッグ用設定 ***
// 画面上に表示される「今日」の日付を上書きする。
// 以下パラメータに入力した日付を「今日」として扱い、計算を行う。
let debugTestToday: Date | undefined = undefined;
// *** デバッグ用設定 ***

// 引数間の日付リストを作成
export const dateArray = (start: Date, end: Date) => {
  const dateArray: Date[] = [];
  const startDay: Date = cloneDeep(start);

  while (startDay <= end) {
    dateArray.push(new Date(startDay));
    startDay.setDate(startDay.getDate() + 1);
  }
  return dateArray;
};

export const nonWorkingDays = (today: Date) => {
  // 非稼働日は、曜日による指定のほか個別指定を想定
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const itemDays = days[today.getDay()];

  // 個別指定をする際は、以下にelse if で条件を追加
  if (NON_WORKING_DAYS.includes(itemDays)) {
    return true;
  }
  return false;
};

// 引数の日付～目標終了日までの非稼働日が何日か計算する
export const remainingNonWorkingDays = (today: Date, endDate: Date) => {
  let remainingNonWorkingDays = 0;
  const remainingDateList = dateArray(today, endDate);
  for (const item of remainingDateList) {
    if (nonWorkingDays(item)) {
      remainingNonWorkingDays++;
    }
  }
  return remainingNonWorkingDays;
};

// 稼働日数 ＝ 目標終了日 ー 目標開始日 ー 非稼働日 ＋１(dateArrayで計算済み)
export const remainingWorkingDays = (today: Date, endDate: Date) => {
  if (today === endDate) {
    return 0;
  }
  const NonWorkingDays = remainingNonWorkingDays(today, endDate);
  const dateNum = dateArray(today, endDate).length;
  return dateNum - NonWorkingDays;
};

export const toViewData = (
  dataList: ConstructionProgressForView[],
  constructionActivity: ConstructionActivity | undefined,
  is1Day = false,
  startTime: Date | undefined = undefined,
  endTime: Date | undefined = undefined,
  testToday: Date | undefined = undefined,
): ConstructionProgressViewData => {
  const dateTimeArray: string[] = [];
  const goalArray: number[] = [];
  const cutVolumeArray: number[] = [];
  const fillVolumeArray: number[] = [];
  const remainedCutArray: number[] = [];
  const remainedFillArray: number[] = [];
  let targetProgressRateArray: number[] = [];

  let newDataList: Date[] = [];

  let today = new Date();

  // *** デバッグ用設定 ***
  // 画面上に表示される「今日」の日付を上書きする。
  // 以下パラメータに入力した日付を「今日」として扱い、計算を行う。
  if (testToday) {
    today = testToday;
    debugTestToday = testToday;
  } else if (debugTestToday) {
    today = debugTestToday;
  }
  // *** デバッグ用設定 ***

  if (
    constructionActivity &&
    constructionActivity.startTime &&
    constructionActivity.endTime
  ) {
    let startDate = new Date();
    let goalEndDate = new Date();

    if (startTime !== undefined) {
      startDate = startTime;
    } else {
      startDate = new Date(constructionActivity.startTime);
    }
    // 開始年月日が指定されていない場合の回避策
    if (startDate.getFullYear() === 1) {
      startDate = new Date();
    }

    if (endTime !== undefined) {
      goalEndDate = endTime;
    } else {
      goalEndDate = new Date(constructionActivity.endTime);
    }
    // 終了年月日が指定されていない場合は開始年月日を設定
    if (goalEndDate.getFullYear() === 1) {
      goalEndDate = new Date(startDate);
    }

    newDataList = dateArray(startDate, goalEndDate);
    // 稼働日数
    const workingDays = remainingWorkingDays(startDate, goalEndDate);
    // データ数
    const dataListCount = newDataList.length;

    for (const item of newDataList) {
      // 要約ウィジェットの日当たり施工数量日算出のため、年月日表記を使用
      const dateTime = item ? format(new Date(item), FORMAT_ISO) : undefined;

      dateTime && dateTimeArray.push(dateTime);

      const designCutVolume = dataList[0]?.design?.cutVolume ?? 0;
      const designFillVolume = dataList[0]?.design?.fillVolume ?? 0;

      const totalDesignVolume = designCutVolume + designFillVolume;

      if (is1Day) {
        // 当初目標日当たり施工数量 ＝ 合計土量 ÷ 稼働日数
        const targetProgressRateDaily = totalDesignVolume / workingDays;

        const completedTotalDaily = totalDesignVolume / dataListCount;

        // 開始日～本日までor非稼働日の目標日当たり施工数量は0となる
        if (item.getTime() <= today.getTime() || nonWorkingDays(item)) {
          goalArray.push(0);
        } else {
          goalArray.push(completedTotalDaily);
        }

        cutVolumeArray.push(0);
        fillVolumeArray.push(0);
        targetProgressRateArray.push(targetProgressRateDaily);
      } else if (!is1Day) {
        const dateNum = newDataList.indexOf(item) + 1;

        // 目標進捗率：0～100％で算出
        const targetProgressRateDaily =
          (100 / (dataListCount - 1)) * (dateNum - 1);

        const completedTotalDaily =
          (totalDesignVolume / dataListCount) * dateNum;

        // 開始日～本日までor非稼働日の目標日当たり施工数量は0となる
        if (item.getTime() <= today.getTime() || nonWorkingDays(item)) {
          goalArray.push(0);
        } else {
          goalArray.push(completedTotalDaily);
        }

        cutVolumeArray.push(0);
        fillVolumeArray.push(0);

        targetProgressRateArray.push(targetProgressRateDaily);
      } else {
        goalArray.push(0);
        cutVolumeArray.push(0);
        fillVolumeArray.push(0);

        targetProgressRateArray = [];
      }
    }
  }

  // 実績データに置き換える
  const resultsDataList = dataList;
  const targetList: string[] = [];
  let totalDesignVolume: number = 0;
  let totalRemainedVolume: number = 0;

  for (let i = 0; i < newDataList?.length; i++) {
    targetList[i] = newDataList[i].toDateString();
  }

  for (const item of resultsDataList) {
    if (
      !item.dateTimeForView ||
      item.dateTimeForView.getTime() > today.getTime()
    )
      continue;

    const dateTimeFront = item.dateTimeForView.toDateString();
    const findData = targetList.indexOf(dateTimeFront);

    if (findData === -1) continue;

    const { design, remained, difference } = item;

    const designCutVolume = design?.cutVolume ?? 0;
    const designFillVolume = design?.fillVolume ?? 0;

    const remainedCutVolume = remained?.cutVolume ?? 0;
    const remainedFillVolume = remained?.fillVolume ?? 0;

    remainedCutArray.push(remainedCutVolume);
    remainedFillArray.push(remainedFillVolume);

    const differenceCutVolume = difference?.cutVolume ?? 0;
    const differenceFillVolume = difference?.fillVolume ?? 0;

    totalDesignVolume = designCutVolume + designFillVolume;
    totalRemainedVolume = remainedCutVolume + remainedFillVolume;

    // 実績がある日は目標日当たり施工数量0
    goalArray.splice(findData, 1, 0);

    if (is1Day) {
      cutVolumeArray.splice(findData, 1, differenceCutVolume);
      fillVolumeArray.splice(findData, 1, differenceFillVolume);
    } else if (!is1Day) {
      // 推定量-残量の日々の累積グラフにする
      const totalCutVolume = designCutVolume - remainedCutVolume;
      const totalFillVolume = designFillVolume - remainedFillVolume;
      cutVolumeArray.splice(findData, 1, totalCutVolume);
      fillVolumeArray.splice(findData, 1, totalFillVolume);
    } else {
      cutVolumeArray.splice(findData, 1, remainedCutVolume);
      fillVolumeArray.splice(findData, 1, remainedFillVolume);
    }
  }

  // 目標日当たり施工数量の算出
  const targetremainingWorkingDays = remainingWorkingDays(
    today,
    newDataList.slice(-1)[0],
  );
  let untilNowTargetRateZeroDays = 0;

  for (const item of newDataList) {
    const dateNum = newDataList.indexOf(item) + 1;
    if (is1Day) {
      // 日当たり施工数量（目標）＝ 残りの土量÷残日数（今日を含む稼働日数ベース）
      if (item.getTime() > today.getTime() && !nonWorkingDays(item)) {
        const completedTotalDaily =
          totalRemainedVolume / targetremainingWorkingDays;
        goalArray.splice(dateNum - 1, 1, completedTotalDaily);
        cutVolumeArray.splice(dateNum - 1, 1, 0);
        fillVolumeArray.splice(dateNum - 1, 1, 0);
      } else if (nonWorkingDays(item)) {
        untilNowTargetRateZeroDays++;
        cutVolumeArray.splice(dateNum - 1, 1, 0);
        fillVolumeArray.splice(dateNum - 1, 1, 0);
      } else {
        untilNowTargetRateZeroDays++;
      }
    } else if (!is1Day) {
      if (item.getTime() > today.getTime() && !nonWorkingDays(item)) {
        const completedTotalDaily =
          totalDesignVolume -
          totalRemainedVolume +
          (totalRemainedVolume / targetremainingWorkingDays) *
            (dateNum - untilNowTargetRateZeroDays);
        goalArray.splice(dateNum - 1, 1, completedTotalDaily);
        cutVolumeArray.splice(dateNum - 1, 1, 0);
        fillVolumeArray.splice(dateNum - 1, 1, 0);
      } else if (nonWorkingDays(item)) {
        untilNowTargetRateZeroDays++;
        // 2025/10/03 #7478 非稼働日でも０クリアしないようにする
        // cutVolumeArray.splice(dateNum - 1, 1, 0);
        // fillVolumeArray.splice(dateNum - 1, 1, 0);
      } else {
        untilNowTargetRateZeroDays++;
      }
    }
  }

  return {
    startDate: constructionActivity?.startTime ?? new Date(),
    goalEndDate: constructionActivity?.endTime ?? new Date(),
    dateTimeArray,
    goalArray,
    cutVolumeArray,
    fillVolumeArray,
    remainedCutArray,
    remainedFillArray,
    targetProgressRateArray,
  };
};
