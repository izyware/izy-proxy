
var config = require('../configs/izy-proxy/config');
var handleRequest = require('./server').getHandleRequestInterface();

var cbs = {};
var req = {
	on: function(item, cb) {
		cbs[item] = cb;
	},
	headers: {
		host: 'test'
	},
	method: 'POST',
	url: '/apigateway/:apps/accountsettings/dashboard:api'
};

var res = {
	writeHead: function() {},
	write: function(x) { console.log(x); },
	end: function(x) { console.log(x); }
};

var proxy = {};
handleRequest(req, res, proxy, 'http', config);
cbs.data(JSON.stringify({
	handler: 'updatecredentials',
	sessionToken: 'bad_session_token'
}));
cbs.end();

require('izymodtask').getRootModule().ldmod('s_root').cmdlineverbs.sysview();