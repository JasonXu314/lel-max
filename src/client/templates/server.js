import App from '__app.svelte';
import Route from '__route.svelte';
import { render } from 'svelte/server';

export default {
	render: (__props, __meta) => render(App, { props: { __props, __meta, __route: Route } })
};

