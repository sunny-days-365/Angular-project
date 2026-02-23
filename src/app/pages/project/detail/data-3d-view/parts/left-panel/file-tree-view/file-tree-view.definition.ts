import {
  MODEL_CATEGORY_NOTE,
  ModelKindCategory,
} from 'src/app/helper-utility/api-helper/projects-models';
import { MultiSelectDataItem } from '@nikon-trimble-sok/parts-components';

export const ModelKindFilterOptions: MultiSelectDataItem[] = [
  {
    id: ModelKindCategory.ポイント,
    label: 'ポイント',
  },
  {
    id: ModelKindCategory.測量データ,
    label: '測量データ',
  },
  {
    id: ModelKindCategory.設計データ,
    label: '設計データ',
  },
  {
    id: ModelKindCategory.施工データ,
    label: '施工データ',
  },
  {
    id: ModelKindCategory.境界線データ,
    label: '境界線データ',
  },
  {
    id: ModelKindCategory.図面,
    label: '図面',
  },
  {
    id: ModelKindCategory['3Dモデル'],
    label: '3Dモデル',
  },
  {
    id: ModelKindCategory.ヒートマップ,
    label: 'ヒートマップ',
  },
  {
    id: MODEL_CATEGORY_NOTE,
    label: '注記',
  },
];
