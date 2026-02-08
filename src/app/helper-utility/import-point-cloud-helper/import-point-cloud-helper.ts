import { DataTransferStructure } from '@nikon-trimble-sok/parts-components';

export const convertDataStructureToDropedDataList = (
  dataStructure: DataTransferStructure,
) => {
  const dropedDataList = Object.entries(dataStructure).map(([name, value]) => {
    const isFile = value instanceof File;
    const isFolder = !isFile;

    const nameSplit = name.split('.');

    const [realName, extension] = isFile
      ? [nameSplit[0], nameSplit[nameSplit.length - 1].toLocaleLowerCase()]
      : [name, ''];

    return {
      name,
      size: value.size ?? undefined,
      isFile,
      isJxlFile: extension === 'jxl',
      isFolder,
      realName,
      extension,
    };
  });

  return dropedDataList;
};

export const convertFilesToDataStructure = (files: FileList) => {
  const dataStructure: DataTransferStructure = {};
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    dataStructure[file.name] = file;
  }
  return dataStructure;
};
