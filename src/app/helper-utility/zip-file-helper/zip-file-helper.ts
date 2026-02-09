import JSZip from 'jszip';
import { DataTransferStructure } from '@nikon-trimble-sok/parts-components';

export const zipFile = (
  data: DataTransferStructure,
  outputFileName: string,
) => {
  const zip = new JSZip();

  const executeZip = (item: DataTransferStructure, parentPath?: string) => {
    for (const [name, value] of Object.entries(item)) {
      const isFile = value instanceof File;
      const isFolder = !isFile;
      const isEmptyFolder = isFolder && Object.keys(value).length === 0;

      const path = parentPath ? `${parentPath}/${name}` : name;

      if (isFile) {
        zip.file(path, value);
      }

      if (isFolder) {
        if (isEmptyFolder) {
          zip.folder(path);
        } else {
          executeZip(value, path);
        }
      }
    }
  };

  executeZip(data);

  return new Promise<File>((res, rej) => {
    zip
      .generateAsync({ type: 'blob' })
      .then((content) => {
        const files = new File([content], outputFileName);
        res(files);
      })
      .catch(rej);
  });
};
