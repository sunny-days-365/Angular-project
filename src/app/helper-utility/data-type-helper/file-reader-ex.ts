export class FileReaderEx extends FileReader {
  constructor() {
    super();
  }

  override readAsArrayBuffer(blob: Blob) {
    return new Promise((res, rej) => {
      super.addEventListener('load', ({ target }) => res(target?.result));
      super.addEventListener('error', ({ target }) => rej(target?.error));
      super.readAsArrayBuffer(blob);
    });
  }

  override readAsDataURL(blob: Blob) {
    return new Promise((res, rej) => {
      super.addEventListener('load', ({ target }) => res(target?.result));
      super.addEventListener('error', ({ target }) => rej(target?.error));
      super.readAsDataURL(blob);
    });
  }

  override readAsText(blob: Blob) {
    return new Promise((res, rej) => {
      super.addEventListener('load', ({ target }) => res(target?.result));
      super.addEventListener('error', ({ target }) => rej(target?.error));
      super.readAsText(blob);
    });
  }
}

export function base64DecodeAsBlob(
  text: string,
  type = 'text/plain;charset=UTF-8',
) {
  return fetch(`data:${type};base64,` + text).then((response) =>
    response.blob(),
  );
}
