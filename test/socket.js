var modtask = {};
modtask.__apiInterfaceType = 'socketsession';
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

// todo: this needs to be per sesssion
var standardExpectTimeout = 5000;

var sendCmd = function(cmd, socketName) {
	if (!socketName) socketName = 'backSocket';
	return function(chain) {
		chain([['socket.write', {
			socket: sockets[socketName],
			encoding: 'ascii',
			data: cmd
		}], ['ROF']]);
	}
}

var CRLF = '\r\n';

var sockets = {
	backSocket: null,
	frontSocket: null
}

modtask.handlers = {};

modtask.handlers.pass = function (str, config, cb) {
	var state = config.state;
	var socketWrapper =  config.socketWrapper;
	var socketName = socketWrapper.name;
	if (str.toLowerCase().indexOf('pass') == 0 && str.indexOf(CRLF) > 0) {
		socketWrapper.reset();
		state.pass = str;
		return cb( { success: true });
	} else {
		return cb({ reason: 'expectation not met' });
	}
};

modtask.handlers.user = function (str, config, cb) {
	var state = config.state;
	var socketWrapper =  config.socketWrapper;
	var socketName = socketWrapper.name;
	if (str.toLowerCase().indexOf('user') == 0 && str.indexOf(CRLF) > 0) {
		socketWrapper.reset();
		state.user = str;
		return modtask.doChain([
			['nop'],
			sendCmd('+OK' + CRLF, socketName),
			['set', 'outcome', { success: true }],
			['return']
		], cb);
	} else {
		return cb({ reason: 'expectation not met' });
	}
};

modtask.handlers.capa = function (str, config, cb) {
	var state = config.state;
	var socketWrapper =  config.socketWrapper;
	var socketName = socketWrapper.name;

	if (str.toLowerCase().indexOf('capa') == 0 && str.indexOf(CRLF) > 0) {
		state.capa = true;
		socketWrapper.reset();
		return modtask.doChain([
			['nop'],
			sendCmd('+OK Capability list follows' + CRLF + 'USER' + CRLF + 'IZY-S' + CRLF + '.' + CRLF, socketName),
			['set', 'outcome', { success: true }],
			['return']
		], cb);
	} else {
		return cb({ reason: 'expectation not met' });
	}
};

modtask.handlers.ok = function (str, config, cb) {
	var state = config.state;
	var socketWrapper =  config.socketWrapper;
	var socketName = socketWrapper.name;
	if (str.toLowerCase().indexOf('+ok') == 0 && str.indexOf(CRLF) > 0) {
		socketWrapper.reset();
		cb({ success: true });
	} else {
		return cb({ reason: 'expectation not met' });
	}
};

var detectStandardOK = function(socketName) {
	if (!socketName) socketName = 'backSocket';
	return function(chain) {
		chain([
			modtask.verbose.detectStandardOK ? ['sessionlog', '', 'detectStandardOK', sockets[socketName].name] : ['nop'],
			['socket.while', {
				socketWrapper: sockets[socketName],
				timeOut: standardExpectTimeout,
				encoding: 'ascii',
				handlers: [modtask.handlers.ok],
				test: function(cb) {
					return cb({
						success: true
					});
				}
			}],
			['ROF']
		]);
	}
};


modtask.actions = {};
modtask.actions.newIncoming = function(queryObject, cb, context) {
	if (!context) context = {};
	var session = context.session || {};

	var rawSocket = queryObject.socket;
 	modtask.doChain([
		['sessionlog', '', 'newIncoming'],
		['socket.wrapraw', rawSocket, { name: 'frontSocket' }],
		['ROF'],
		function(chain) {
			sockets.frontSocket = chain.get('outcome').data;
			chain(['nop']);
		},
		sendCmd('+OK POP3 Server ready' + CRLF, 'frontSocket'),
		['ROF'],
		function(chain) {
			chain(['socket.while', {
				socketWrapper: sockets['frontSocket'],
				timeOut: standardExpectTimeout,
				encoding: 'ascii',
				state: { user: null, pass: null },
				handlers: [modtask.handlers.capa, modtask.handlers.user, modtask.handlers.pass],
				test: function(cb, config) {
					var state = config.state || {};
					if (state.user && state.pass) return cb({
						success: true,
						data: state
					});
					cb({ reason: 'waiting for user' });
				}
			}]);
		},
		['ROF'],
		function(chain) {
			var frontInfo = chain.get('outcome').data;
			modtask.actions.authenticate({
				user: frontInfo.user,
				pass: frontInfo.pass
			}, function(outcome) {
				if (!outcome.success) {
					return chain([
						['socket.write', {
							socket: sockets['frontSocket'],
							encoding: 'ascii',
							data: 'ERROR: ' + outcome.reason + CRLF
						}],
						['socket.terminate', sockets['frontSocket']],
						['set', 'outcome', { success: true }],
						['return']
					]);
				};
				chain(['set', 'outcome', outcome]);
			});
		},
	  ['sessionlog', 'setup backend'],
		function(chain) {
			var backendCfg = chain.get('outcome').data;
			modtask.actions.setupBackend({
				backendCfg: backendCfg
			}, function(outcome) {
				if (!outcome.success) {
					return chain([
						['sessionlog', outcome.reason, 'error', 'connect'],
						['socket.terminate', sockets['frontSocket']],
						['socket.terminate', sockets['backSocket']],
						['return']
					]);
				};

				sockets['frontSocket'].onData = function(data) {
					if (modtask.verbose.datacopy) chain(['sessionlog', data.length, 'datacopy', sockets['frontSocket'].name]);
					sockets['backSocket'].socket.write(data);
				};

				sockets['backSocket'].onData = function(data) {
					if (modtask.verbose.datacopy) chain(['sessionlog', data.length, 'datacopy', sockets['backSocket'].name]);
					sockets['frontSocket'].socket.write(data);
				};

				var terminateSocket = function(socketName) {
					chain(['socket.terminate', sockets[socketName]]);
				}
				sockets['backSocket'].onClose = function() {
					terminateSocket('frontSocket');
				}
				
				chain(['socket.write', {
					socket: sockets['frontSocket'],
					encoding: 'ascii',
					data: '+OK' + CRLF
				}]);
			});
		}
	], cb);
}

modtask.actions.authenticate = function(queryObject, cb, context) {
	if (!context) context = {};
	var session = context.session || {};

	queryObject.user = queryObject.user.split(' ')[1].split(CRLF)[0];
	queryObject.password = queryObject.pass.split(' ')[1].split(CRLF)[0];

	modtask.doChain([
		modtask.verbose.authenticate ? ['sessionlog', queryObject.user, 'authenticate', 'izywareAuth'] : ['nop'],
		['frame_getnode', modtask, queryObject.customenodeparams],
		['frame_importpkgs', ['sql/jsonnode']],
		function(push) {
			modtask.ldmod('sql/jsonnode/q').select({
				// placeholder
				map: {
					backaddress: 'ip',
					backport: 'port',
					backusername: 'username',
					backpassword: 'password'
				},
				from: ' from ' + 'izyware.cloudservice',
				condition: ' where username = "' + queryObject.user + '" and password = "' + queryObject.password + '" and status = "Enabled"'
			}, function(outcome) {
				if (!outcome.success) return cb(outcome);
				var data = outcome.data;
				if (data.length < 1) {
					return cb({
						success: false,
						reason: 'Authentication Failure for user ' + queryObject.user
					});
				}
				data[0].tls = true;
				return cb({
					success: true,
					data: data[0]
				});
			});
		}
	], cb);
}

modtask.actions.setupBackend = function(queryObject, cb, context) {
	if (!context) context = {};
	var session = context.session || {};

	var backendCfg = queryObject.backendCfg || {};
	backendCfg.name = backendCfg.ip;
	modtask.doChain([
		['socket.connect', backendCfg],
		['ROF'],
		function(chain) {
			sockets.backSocket = chain.get('outcome').data;
			chain(['nop']);
		},
		detectStandardOK(),
		['sessionlog', 'Authenticating'],
		sendCmd('USER ' + backendCfg.username + CRLF),
		detectStandardOK(),
		sendCmd('PASS ' + backendCfg.password + CRLF),
		detectStandardOK(),
		function(chain) {
			cb({ success: true });
		}
	], cb);
}

modtask.verbose = {
	datacopy: false,
	detectStandardOK: false,
	authenticate: true
};