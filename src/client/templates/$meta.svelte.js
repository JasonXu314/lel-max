export let __state = $state.raw({
	route: null,
	path: null,
	params: null,
	query: null,
	user: null,
	extra: null
});

export default {
	get route() {
		return __state.route;
	},
	get path() {
		return __state.path;
	},
	get params() {
		return __state.params;
	},
	get query() {
		return __state.query;
	},
	get user() {
		return __state.user;
	},
	get extra() {
		return __state.extra;
	}
};

