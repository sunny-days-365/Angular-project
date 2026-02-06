import { ResponseError } from '@nikon-trimble-sok/api-sdk-d3';

// ResponseError型かを判定する型ガード関数
export function isResponseError(value: unknown): value is ResponseError {
  // 値がオブジェクトであるかの判定
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { errorCode, errorMessage } = value as Record<
    keyof ResponseError,
    unknown
  >;
  if (typeof errorCode !== 'number') {
    return false;
  }
  if (typeof errorMessage !== 'string') {
    return false;
  }
  return true;
}
