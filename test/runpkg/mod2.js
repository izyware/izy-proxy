var modtask = function(chain) {
	modtask.doChain([
		['outcome', { success: true, data: chain.get('queryObject') }]
	]);
}
