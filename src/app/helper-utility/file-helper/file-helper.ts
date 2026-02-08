import { NtcFolderEntry } from 'src/app/stores/states/project/detail/file-view/file-view.state';
import { SystemFolderNames } from './file-helper.definiton';

export async function fileToBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

export const DEFAULT_FILE_SIZE = 5 * 1024 * 1024 * 1024; //5GB
export const isValidFileSize = (files: File[], size = DEFAULT_FILE_SIZE) => {
  return Array.from(files).every((file) => file.size <= size);
};

export const isValidFileExtensionAllowed = (
  files: File[] | NtcFolderEntry[],
  allowedFormats: string[],
): boolean => {
  return Array.prototype.slice.call(files).every((file) => {
    const fileExtension = file?.name?.split('.')?.pop()?.toLowerCase();

    return (
      !!fileExtension &&
      allowedFormats.map((item) => item.toLowerCase()).includes(fileExtension)
    );
  });
};

export const handleDownloadByUrl = (url: string) => {
  if (!url) return;

  const anchor = document.createElement('a');
  anchor.setAttribute('download', '');
  anchor.setAttribute('href', url);
  anchor.click();

  setTimeout(() => {
    anchor.remove();
  }, 100);
};

export const getFileExtensionByName = (fileName: string) => {
  const subStrs = fileName.split('.');
  if (subStrs.length <= 1) return '';
  return subStrs.pop();
};

export const getFileExtensionById = (folder: NtcFolderEntry) => {
  if (folder.type === 'FOLDER') return '';

  const subStrs = folder.name.split('.');
  if (subStrs.length <= 1) return '';
  return subStrs.pop();
};

export const getBaseNameById = (folder: NtcFolderEntry) => {
  if (folder.type === 'FOLDER') return folder.name;

  const subStrs = folder.name.split('.');
  if (subStrs.length <= 1) return folder.name;
  subStrs.pop();
  return subStrs.join('.');
};

/**
 * ファイル/フォルダがSOKで表示可能かどうか
 */
export const isFileOrFolderVisible = (folder: NtcFolderEntry) => {
  return !folder.hidden && !isSokProjectSystemFolder(folder);
};

/**
 * フォルダがSOKで表示可能かどうか
 * isFileOrFolderVisible の type!=='FOLDER' は除去版
 */
export const isFolderVisible = (folder: NtcFolderEntry) => {
  return (
    !folder.hidden &&
    folder.type === 'FOLDER' &&
    !isSokProjectSystemFolder(folder)
  );
};

export const isSokProjectSystemFolder = (folder: NtcFolderEntry): boolean => {
  if (folder.type === 'FILE') return false;
  if (folder.path?.length !== 1) return false;

  const folderName = folder.name.toLowerCase();
  return SystemFolderNames.some((fname) => fname.toLowerCase() === folderName);
};
