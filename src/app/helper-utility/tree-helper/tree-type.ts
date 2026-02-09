export interface TreeMetaData<T> {
  // Children node
  children: T[] | undefined;

  // Node id
  id: string;

  // Flag check has children
  hasChildren?: boolean;
}
