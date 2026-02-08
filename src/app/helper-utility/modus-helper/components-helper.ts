export class ModusDataTableHelper {
  ///modus-data-tableコンポーネントにおいて、rowDoubleClicの引数を抽出する
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static extractRowActionClick<T>(data: any): T | null {
    const xxxs = data.target?.data;
    return <T>xxxs;
  }
}
