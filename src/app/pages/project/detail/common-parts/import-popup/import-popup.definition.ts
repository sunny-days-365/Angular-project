import {
  ModelTypes,
  WMDeviceControllerFieldData,
} from '@nikon-trimble-sok/api-sdk-d3';
import { ModelKindCategory } from 'src/app/helper-utility/api-helper/projects-models';

export const NEXT_BUTTON_START_IMPORT_TEXT = 'インポート開始';
export const NEXT_BUTTON_TEXT = '次へ';
export const NEXT_BUTTON_SELECT_TEXT = '選択';
export const NEXT_BUTTON_LAST_TEXT = '閉じる';
export const BACK_BUTTON_TEXT = '戻る';
export const CANCEL_BUTTON_TEXT = 'キャンセル';
export const CANCEL_BUTTON_ABORT_IMPORT_TEXT = 'インポート中止';

/**
 * 図面対応ファイル拡張子(autoCad)
 */
export const AUTOCAD_EXTENSIONS = ['dxf', 'dwg'];

/**
 * 図面対応ファイル拡張子(cadBoundary/files)
 */
export const CAD_BOUNDARY_OR_FILES_EXTENSIONS = ['sfc', 'p21', 'svl'];

/**
 * CSV(pointCsv/pointCloudCsv)
 */
export const POINT_CSV_OR_POINT_CLOUD_CSV_EXTENSIONS = ['csv'];

/**
 * 点群データ対応ファイル拡張子
 */
export const POINT_CLOUD_EXTENSIONS = [
  'las',
  'laz',
  'rwcx',
  'tsf',
  'e57',
  'tdx',
  'tzf',
  'tos',
  'fls',
  'pts',
  'ptx',
];

/**
 * ZIP(zip)
 */
export const ZIP_EXTENSIONS = ['zip'];

/**
 * その他(files)
 */
export const CORRIDOR_EXTENSIONS = [
  'xml',
  'ttm',
  'svd',
  'apa',
  'sim',
  'skp',
  'ifc',
];

export const JOB_XML_EXTENSIONS = ['jxl'];

/**
 * インポート可能なファイル拡張子
 */
export const ACCEPT_FILE_UPLOAD_EXTENSION =
  CAD_BOUNDARY_OR_FILES_EXTENSIONS.concat(
    POINT_CSV_OR_POINT_CLOUD_CSV_EXTENSIONS,
  )
    .concat(POINT_CLOUD_EXTENSIONS)
    .concat(ZIP_EXTENSIONS)
    .concat(CORRIDOR_EXTENSIONS)
    .concat(JOB_XML_EXTENSIONS);

// ['las', 'laz', ...] => ".las, .laz, ..."
export const ACCEPT_FILE_UPLOAD_EXTENSION_STR =
  ACCEPT_FILE_UPLOAD_EXTENSION.map((item) => '.' + item).join(', ');

// ['las', 'laz', ...] => ".las, .laz, ..."
export const ACCEPT_POINT_CLOUD_FILE_UPLOAD = POINT_CLOUD_EXTENSIONS.map(
  (item) => '.' + item,
).join(', ');

export const OTHER_FILE_EXTENSIONS = [
  'xml',
  'ttm',
  'dxf',
  'dwg',
  'sfc',
  'p21',
  'skp',
  'ifc',
  'sim',
  'apa',
  'csv',
];

// ['xml', 'ttm', ...] => ".xml, .ttm, ..."
export const ACCEPT_OTHER_FILE_UPLOAD = OTHER_FILE_EXTENSIONS.map(
  (item) => '.' + item,
).join(', ');

//.xml
export const IMPORT_ASSIGNMENT_XML = [
  {
    id: ModelKindCategory.測量データ,
    display: '測量データ',
  },
  {
    id: ModelKindCategory.設計データ,
    display: '設計データ',
  },
];

//.dxf/.dwg
export const IMPORT_ASSIGNMENT_DXF = [
  {
    id: ModelKindCategory.境界線データ,
    display: '境界線データ',
  },
  {
    id: ModelKindCategory.図面,
    display: '図面',
  },
];

//.sfc/.p21/
export const IMPORT_ASSIGNMENT_SFC = [
  {
    id: ModelKindCategory.図面,
    display: '図面',
  },
];

//.sim/.apa
export const IMPORT_ASSIGNMENT_SIM = [
  {
    id: ModelKindCategory.ポイント,
    display: 'ポイント',
  },
];

//.las/.laz/.rwcx/.tsf/.e57/.e57/.tdx/.tzf/.tos/.fls/.pts/.ptx/.jxl
export const IMPORT_ASSIGNMENT_LAS = [
  {
    id: ModelKindCategory.測量データ,
    display: '測量データ',
  },
  {
    id: ModelKindCategory.施工データ,
    display: '施工データ',
  },
];

//.csv
export const IMPORT_ASSIGNMENT_CSV = [
  {
    id: ModelKindCategory.測量データ,
    display: '測量データ',
  },
  {
    id: ModelKindCategory.ポイント,
    display: 'ポイント',
  },
  {
    id: ModelKindCategory.施工データ,
    display: '施工データ',
  },
];

//.ttm
export const IMPORT_ASSIGNMENT_TTM = [
  {
    id: ModelKindCategory.測量データ,
    display: '測量データ',
  },
  {
    id: ModelKindCategory.設計データ,
    display: '設計データ',
  },
];

//.skp
export const IMPORT_ASSIGNMENT_SKP = [
  {
    id: ModelKindCategory['3Dモデル'],
    display: '3Dモデル',
  },
  {
    id: ModelKindCategory.図面,
    display: '図面',
  },
];

//.ifc
export const IMPORT_ASSIGNMENT_IFC = [
  {
    id: ModelKindCategory['3Dモデル'],
    display: '3Dモデル',
  },
];

//.zip
export const IMPORT_ASSIGNMENT_ZIP = [
  {
    id: ModelKindCategory.測量データ,
    display: '測量データ',
  },
];

export const ASSIGNMENT_MAPPING_FILE_EXTENSION = [
  {
    ext: ['zip'],
    options: IMPORT_ASSIGNMENT_ZIP,
  },
  {
    ext: ['xml'],
    options: IMPORT_ASSIGNMENT_XML,
  },
  {
    ext: ['dxf', 'dwg'],
    options: IMPORT_ASSIGNMENT_DXF,
  },
  {
    ext: ['sfc', 'p21'],
    options: IMPORT_ASSIGNMENT_SFC,
  },
  {
    ext: ['sim', 'apa'],
    options: IMPORT_ASSIGNMENT_SIM,
  },
  {
    ext: [
      'las',
      'laz',
      'rwcx',
      'tsf',
      'e57',
      'tdx',
      'tzf',
      'tos',
      'fls',
      'pts',
      'ptx',
      'jxl',
    ],
    options: IMPORT_ASSIGNMENT_LAS,
  },
  {
    ext: ['csv'],
    options: IMPORT_ASSIGNMENT_CSV,
  },
  {
    ext: ['ttm'],
    options: IMPORT_ASSIGNMENT_TTM,
  },
  {
    ext: ['skp'],
    options: IMPORT_ASSIGNMENT_SKP,
  },
  {
    ext: ['ifc'],
    options: IMPORT_ASSIGNMENT_IFC,
  },
];

export const TRANSPARENCY_DEAULT = 100;

export const DEFAULT_IMPORT_COLOR: Record<ModelTypes, string | undefined> = {
  0: undefined,
  1: 'FC0D1B',
  2: '029BE5',
  3: '7CB342',
  5: 'B85AD0',
  6: 'D0D0D7',
  8: 'D0D0D7',
  9: 'D0D0D7',
  10: '029BE5',
  11: 'F7BF25',
  12: undefined,
  13: undefined,
  14: undefined,
};

export class WMDeviceDataTree {
  parent: WMDeviceDataTree | undefined;
  id: string;
  name: string;
  data: WMDeviceControllerFieldData | undefined;
  children: WMDeviceDataTree[] = [];

  constructor(
    id: string,
    name: string,
    data: WMDeviceControllerFieldData | undefined,
  ) {
    this.id = id;
    this.name = name;
    this.data = data;
  }

  addChild(childNode: WMDeviceDataTree) {
    this.children.push(childNode);
    childNode.parent = this;
  }

  findFirstById(id: string): WMDeviceDataTree | undefined {
    if (this.id === id) return this;
    for (let i = 0; i < this.children.length; i++) {
      const found = this.children[i].findFirstById(id);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
}

// アップロードデータリスト
export type UploadDataList = Array<{
  name: string;
  size?: number | undefined;
  isFolder?: boolean;
  color?: number;
}>;

/**
 * アップロードファイルの種類からオプションをチェック
 */
export function checkOptionOfUploadData(uploadDataList: UploadDataList) {
  let enablePointCloudScaleTypes: boolean = false;
  let enableAutoCADImportSettings: boolean = false;
  let enableCsvImportSettings: boolean = false;
  for (const item of uploadDataList) {
    if (item.isFolder) {
      continue;
    }

    // 拡張子取得
    const fileType = getFileType(item.name);
    if (!fileType) {
      continue;
    }

    if (POINT_CLOUD_EXTENSIONS.includes(fileType)) {
      enablePointCloudScaleTypes = true;
    } else if (AUTOCAD_EXTENSIONS.includes(fileType)) {
      enableAutoCADImportSettings = true;
    } else if (CAD_BOUNDARY_OR_FILES_EXTENSIONS.includes(fileType)) {
      enableAutoCADImportSettings = true;
    } else if (POINT_CSV_OR_POINT_CLOUD_CSV_EXTENSIONS.includes(fileType)) {
      enableCsvImportSettings = true;
    } else if (ZIP_EXTENSIONS.includes(fileType)) {
      enablePointCloudScaleTypes = true;
      enableAutoCADImportSettings = true;
      enableCsvImportSettings = true;
    } else if (CORRIDOR_EXTENSIONS.includes(fileType)) {
      //
    }
  }
  return {
    enablePointCloudScaleTypes,
    enableAutoCADImportSettings,
    enableCsvImportSettings,
  };
}

// ファイル名から拡張子を取得
export function getFileType(fileName: string): string | undefined {
  const fileNamePartList = fileName.split('.');
  if (!fileNamePartList) {
    return undefined;
  }
  return fileNamePartList.pop()?.toLocaleLowerCase();
}
