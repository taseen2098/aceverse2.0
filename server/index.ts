// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerActionReturnType<T = any , U = any> = Promise<{
  data: T;
  error: U;
}>;

