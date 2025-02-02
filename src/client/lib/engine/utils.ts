export type Parameterized<T, Params extends Record<string, any>, This> = T | ((this: This, params: Params) => T);

