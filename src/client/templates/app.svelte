<script>
	import { __state } from '$meta';

	let { __meta, __props, __route } = $props();

	__state.route = __meta.route;
	__state.path = __meta.path;
	__state.params = __meta.params;
	__state.query = __meta.query;
	__state.user = __meta.user;
	__state.extra = __meta.extra;

	const Route = $derived(__route);
</script>

<Route {...__props} />
