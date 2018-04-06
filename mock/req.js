var modtask = function(config) {
	var cbs = {};
	var onCalls  = 0;
	var req = {
		on: function(item, cb) {
			cbs[item] = cb;
			if (++onCalls == 2) {
				transferData();
			}
		},
		headers: {
			host: 'test'
		},
		method: config.method,
		url: config.url
	};

	function transferData() {
		if (config.method == 'POST') {
			cbs.data(config.payload);
		}
		cbs.end();
	}
	return req;
}
