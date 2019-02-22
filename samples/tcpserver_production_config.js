var __chainProcessorConfig = {
	'import': {
		pkgloadermodname: 'pkgloader',
		pkgloadermodconfig: {},
		verbose: false
	},
	izynode: {
		accesstoken: '_PASTE_FROM_DASHBOARD_',
		dataservice: '_PASTE_FROM_DASHBOARD_',
		// Other options for restricted sandboxes are:
		// - qry/transport/scrsrc
		// - qry/transport/toolbar (message queue based)
		transportmodule: 'qry/transport/http',
		verbose: false
	}
};


module.exports = {
	// Just expose this here so that the tests can access this :-)
	__chainProcessorConfig: __chainProcessorConfig,
  port: {
    http: 80,
    https: 443
  },
  proxy: {
    timeoutInMs: 60000
  },

	{
		name: 'http',
		verbose: {
			cloudServices: false
		},
		// in seconds
		reloadInterval: 60,
		__chainProcessorConfig: __chainProcessorConfig
	},

	{
		name: 'socket',
		verbose: {
			writes: true,
			ondata: true,
			connect: true,
			terminate: true,
			error: true,
			close: true,
			end: true,
			datacopy: true,
			detectStandardOK: true,
			authenticate: true
		},
		customRequestHandler: true,
		items: [
			{ port: 20110, handlerPath: 'pkg:mod' },
			{ port: 20025, handlerPath: 'pkg:mod' }
		],
		__chainProcessorConfig: __chainProcessorConfig
	},
	// Array of plug-in definitions 
	plugins: [
	{
		// Only do this while developing plug-ins
		// This will reload the node modules for plug-in per request 
		reloadPerRequest: false, 
		name: 'apigateway',

		// invoke pkg prefix. If set it will allow server side extensibility
		// If you set this, it is STRONGLY recommended that you also enforce HTTP authentication (see Authorization below).
		// Only enable this if you fully under the security risks involved.
		invokePrefix: 'cryptokey',
		// the Authotization header to be used in a typical HTTP authentication scheme.
		// If you have Izy Identity Management system setup, set this to 'idm'
		invokeAuthorization: 'access_token',

	    __chainProcessorConfig: __chainProcessorConfig,
	},
	{
		// case sensitive
		testUrl: '/izycircustest',

		// case in-sensitive
		acceptedPaths: [
			'/path1',
			'/',
			'/path2'
		],
		aliases: ['.domain_to_alias_to_izyware.com'],
		// Only do this while developing plug-ins
		// This will reload the node modules for plug-in per request 
		reloadPerRequest: false, 
		name: 'circus',
		bootstrapUrl: 'https://izyware.com/chrome_extension.js',
		cache: {
			folder: '/tmp/izy-circus'
		}
	}
	]
};
