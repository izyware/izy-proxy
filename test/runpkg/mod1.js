var modtask = function(chain) {
	chain([
		['outcome', { success: true, data: chain.get('queryObject') }]
	]);
}

modtask.method1 = function(queryObject, cb, context) {
	return cb({ success: true, data: queryObject });
}
