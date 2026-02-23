import { ModelTypes } from '@nikon-trimble-sok/api-sdk-d3';

export enum TREE_ITEM_ACTION_KEYS {
  POINT_LIST = 'POINT_LIST',
  FIT_VIEW = 'FIT_VIEW',
  PROPERTIES = 'PROPERTIES',
  OPEN_DELETE_MODEL = 'OPEN_DELETE_MODEL',
  EDIT = 'EDIT',
  EXPORT = 'EXPORT',
  TOPOGRAPHY = 'TOPOGRAPHY',
  HEIGHT_CHANGE = 'HEIGHT_CHANGE',
  MOVE_TO_TRASH = 'MOVE_TO_TRASH',
  RESTORE_FROM_TRASH = 'RESTORE_FROM_TRASH',
  MOVE_TO_TRASH_MULTI = 'MOVE_TO_TRASH_MULTI',
  RESTORE_FROM_TRASH_MULTI = 'RESTORE_FROM_TRASH_MULTI',
  OPEN_DELETE_MODEL_MULTI = 'OPEN_DELETE_MODEL_MULTI',
}

export interface ModelActionItem {
  key: TREE_ITEM_ACTION_KEYS;
  label: string;
  divider?: boolean;
}

export const TREE_ITEM_ACTIONS: ModelActionItem[] = [
  {
    key: TREE_ITEM_ACTION_KEYS.FIT_VIEW,
    label: 'ズーム',
  },
  {
    key: TREE_ITEM_ACTION_KEYS.PROPERTIES,
    label: 'プロパティ',
    divider: true,
  },
  {
    key: TREE_ITEM_ACTION_KEYS.HEIGHT_CHANGE,
    label: '高さ変更',
    divider: true,
  },
  {
    key: TREE_ITEM_ACTION_KEYS.MOVE_TO_TRASH,
    label: 'ゴミ箱へ移動',
    divider: true,
  },
  {
    key: TREE_ITEM_ACTION_KEYS.EXPORT,
    label: 'エクスポート',
  },
];

export const POINT_LIST_ACTION: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.POINT_LIST,
  label: 'ポイントリスト',
  divider: true,
};

export const OPEN_DELETE_MODEL: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.OPEN_DELETE_MODEL,
  label: '削除',
  divider: true,
};

export const RESTORE_FROM_TRASH: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.RESTORE_FROM_TRASH,
  label: 'ゴミ箱から元に戻す',
  divider: true,
};

export const MOVE_TO_TRASH_MULTI: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.MOVE_TO_TRASH_MULTI,
  label: 'ゴミ箱へ移動',
  divider: true,
};

export const RESTORE_FROM_TRASH_MULTI: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.RESTORE_FROM_TRASH_MULTI,
  label: 'ゴミ箱から元に戻す',
};

export const OPEN_DELETE_MODEL_MULTI: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.OPEN_DELETE_MODEL_MULTI,
  label: '削除',
  divider: true,
};

export const EXPORT_ACTION: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.EXPORT,
  label: 'エクスポート',
};
export const TOPOGRAPHY_ACTION: ModelActionItem = {
  key: TREE_ITEM_ACTION_KEYS.TOPOGRAPHY,
  label: '任意時点の施工地形を取得',
  divider: true,
};

export const ModelIcons: { [key in ModelTypes]: string } = {
  0: 'blank',
  1: 'point_marker_tool',
  2: 'polygon_line_tool',
  3: 'map',
  5: 'cloud',
  6: 'map_2d',
  8: 'cube',
  9: 'blank',
  10: 'polygon_line_tool',
  11: 'polygon',
  12: '',
  13: 'arrow_expand_diagonal_right',
  14: '',
};

export interface ModelCheckedType {
  isProgrammatic: boolean;
  shiftKeySelected: boolean;
}

// 3D背景地図のモデル名
export const BACKGROUND_MAP_MODEL_NAME = '3D背景地図';
