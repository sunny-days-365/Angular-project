import { Observable } from 'rxjs';

export type PaginationOptions = {
  page: number;
  perPage: number;
  total: number;
};

export type PaginationActions = {
  loadMore: () => void;
  reload: () => void;
  run: () => void;
};

export type PaginationControl<T> = {
  data: T[];
  actions: PaginationActions;
};

export type PaginationInfoReturn<T> = {
  data$: Observable<T[]>;
  actions: PaginationActions;
};
