/// <reference types="svelte" />
/// <reference types="vite/client" />

type Writable<T> = import('svelte/store').Writable<T>;

interface User {
	id: number;
	name: string;
}

type NicePrimitive = number | string | boolean | null | undefined | Date | NiceObject;
type NiceObject = { [k: string]: NicePrimitive | NicePrimitive[] };

interface BasePageProps<T extends NiceObject = any> {
	user?: User | null;
	__meta?: T;
}

type PageProps<T extends NiceObject = any, M extends NiceObject = any> = T & BasePageProps<M>;

declare module '*.svelte' {
	const component: ATypedSvelteComponent;
	export default component;
}

declare module '$meta' {
	type State = {
		route: string;
		path: string;
		params: Record<string, any>;
		query: Record<string, any>;
		user: User;
		extra: any;
	};

	export const __state: State;
	const state: State;
	export default state;
}

