//-- 補助的なデータ構造定義 --

//要素2 Tuple
export class Tuple<T1, T2> {
  constructor(
    public item1: T1,
    public item2: T2,
  ) {}
}

//要素3 Tuple
export class Tuple3<T1, T2, T3> {
  constructor(
    public item1: T1,
    public item2: T2,
    public item3: T3,
  ) {}
}

