
var config = require('../configs/izy-proxy/config');
var handleRequest = require('./server').getHandleRequestInterface();

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
	method: 'POST',
	url: '/apigateway/:apps/accountsettings/dashboard:api'
};

function transferData() {
	console.log('Transfer Data ...');
	cbs.data(JSON.stringify({
		handler: 'updatecredentials',
		sessionToken: 'bad_session_token'
	}));
	cbs.end();
}

var res = {
	writeHead: function() {},
	write: function(x) { console.log(x); },
	end: function(x) { console.log(x); }
};

var proxy = {};
function showModuleResolutionConfig() {
	require('izymodtask').getRootModule().ldmod('s_root').cmdlineverbs.sysview();
}


showModuleResolutionConfig();
handleRequest(req, res, proxy, 'http', config);

