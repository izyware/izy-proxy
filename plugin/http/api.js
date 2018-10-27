var modtask = {};
var modtask = {};
modtask.__apiInterfaceType = 'jsonio';
modtask.processQueries = function(queryObject, cb, context) {
	context = context || {};
	var session = context.session || {};
	modtask.verbose = session.verbose || modtask.verbose;

	if (modtask.actions[queryObject.action]) {
		return modtask.actions[queryObject.action](queryObject, cb, context);
	}
	return cb({
		reason: 'unknown action: ' + queryObject.action
	});
}

modtask.verbose = {
	load: false
}

modtask.actions = {};
modtask.actions.load = function(queryObject, cb, context) {
	if (!context) context = {};
	var session = context.session || {};
	modtask.doChain([
		modtask.verbose.load ? ['log', 'load'] : ['nop'],
		['frame_getnode', modtask, queryObject.customenodeparams],
		['frame_importpkgs', ['sql/jsonnode']],
		function(push) {
			modtask.ldmod('sql/jsonnode/q').select({
				map: {
					backaddress: 'handlerMod',
					address: 'domain'
				},
				from: ' from ' + 'izyware.cloudservice',
				condition: ' where servicetype = "' + 'HTTP' + '" and status = "Enabled"'
			}, cb);
		}
	], cb);
}