export type Parameterized<T, Params extends Record<string, any>> = T | ((params: Params) => T);
