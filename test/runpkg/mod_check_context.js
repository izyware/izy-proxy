var modtask = function(chain) {
	chain([
		['outcome', { success: true, data: chain.get('queryObject') }]
	]);
}

modtask.testAllConditions = function(q) {
	var map = modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap || {};
	map[modtask.__myname] = 'izy-proxy/test/runpkg';
	modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap = map;

	return modtask.doChain([
		['//inline/?method1'], ['assert.value', { data: {} }],
		['//localhost/?method1'], ['assert.value', { data: {} }],
		['//inline/'], ['assert.value', { data: {} }],
		['//localhost/'],['assert.value', { data: {} }],
		['//inline/', null], ['assert.value', { data: {} }],
		['//localhost/', null],['assert.value', { data: {} }],
		['//inline/', 1], ['assert.value', { data: 1 }],
		['//localhost/', 1],['assert.value', { data: 1 }],
		['//inline/', ''], ['assert.value', { data: '' }],
		['//localhost/', ''],['assert.value', { data: '' }]
	]);
};

modtask.method1 = function(q, cb, context) {
	cb({ success: true, data: q });
}
