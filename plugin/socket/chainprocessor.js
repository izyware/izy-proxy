
var modtask = function(chainItem, cb, $chain) {
  if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
  var session = modtask.__chainProcessorConfig.session || {};

  // Do this only once
  if (!modtask.sockets) {
    modtask.sockets = {};
    var rawSockets =  modtask.__chainProcessorConfig.sockets || {};
    for (var p in rawSockets) {
      modtask.sockets[p] = modtask.socketWrapper(rawSockets[p], {name: p});
    }
  }

  if (!modtask.dt) modtask.dt = modtask.ldmod('core/datetime');

  modtask.verbose = session.verbose || modtask.verbose;

  var i = 0;
  var params = {};
  params.action = chainItem[i++];
  modtask.sessionLog = function(msg, action, socketName) {
    var dt = modtask.dt;
    var totalWidth = 40;
    if (!msg) msg = '';
    if (!action) action = '';
    if (!socketName) socketName = '';
    msg += '';
    action += '';

    var sanitizeStr = function(str) {
      return str.replace('\r\n', '\\r\\n');
    }

    msg = sanitizeStr(msg);
    action = sanitizeStr(action);
    var i;
    action += ' ';
    var now = dt.getDateTime();
    var delta = dt.dateInMilisecs(now) - dt.dateInMilisecs(session.startTime);

    var fields = {
      sessionId: 10,
      sessionLength: 10,
      socketName: 15,
      action: 20
    };
    var data = {
      sessionId: session.sessionId,
      sessionLength: delta,
      socketName: socketName,
      action: action
    };

    var formatData = function() {
      var str = '', str1 = '';
      var p;
      for(p in data) {
        var base = data[p] + '';
        str1 = base;
        for(var i=0; i < fields[p]-base.length; ++i)
          str1 += '-';
        str += ' ' + str1;
      }
      return str;
    }
    session.systemLog(`[${formatData()}] ${msg}`, 'INFO', session.handler.plugin);
  }

  switch (params.action) {
    case 'sessionlog':
      modtask.sessionLog(chainItem[i++], chainItem[i++], chainItem[i++]);
      cb();
      return true;
    case 'socket.resetState':
      modtask.resetState(chainItem[i++], function(outcome) {
        if (!outcome.success) $chain.chainReturnCB(outcome);
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
      break;
    case 'socket.write':
      modtask.socketWrite(chainItem[i++], function(outcome) {
        if (!outcome.success) $chain.chainReturnCB(outcome);
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
      break;
    case 'socket.terminate':
      var socketId = chainItem[i++];
      if (!socketId || !modtask.sockets[socketId])
        return $chain.chainReturnCB({ reason: 'socketId parameter should be a valid socketId' });
      var socketWrapper = modtask.sockets[socketId];
      var socket = socketWrapper.socket;
      if (modtask.verbose.terminate) modtask.sessionLog('', 'socket.terminate', socketWrapper.name);
      try {
        if (socket.close) socket.close();
        // this is hard disconnnect: no 'end' events will be fired and data trasnfer will immediately shutdown
        if (socket.destroy) socket.destroy();
        // of you can do socket.end which will flush the data, emit the 'end' event and then disconnect
        $chain.set('outcome', { success: true });
        cb();
      } catch(e) {
        if (modtask.verbose.error) modtask.sessionLog(e.message, 'terminate.error', socketWrapper.name);
        $chain.chainReturnCB({ reason: e.message });
      }
      return true;
      break;
    case 'socket.while':
      modtask.socketWhile(chainItem[i++], function(outcome) {
        if (!outcome.success) $chain.chainReturnCB(outcome);
        $chain.set('outcome', outcome);
        cb();
      }, $chain);
      return true;
      break;
    case 'socket.pipe':
      var cfg = chainItem[i++];
      modtask.socketPipe(modtask.sockets[cfg.s1].socket, modtask.sockets[cfg.s2].socket, cfg.verbose, function(outcome) {
        if (!outcome.success) $chain.chainReturnCB(outcome);
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
    case 'socket.mock':
      var config = chainItem[i++] || { verbose: false, responses: [] };
      var mockSocket = modtask.ldmod('rel:../../mock/socket')(config);
      var socketId = 'mock' + '_' + (new Date()).getTime();
      modtask.sockets[socketId] = modtask.socketWrapper(mockSocket, { name: socketId });
      $chain.set('outcome', {
        success: true,
        socketId: socketId
      });
      cb();
      return true;
    case 'socket.connect':
      var config = chainItem[i++] || { ip: '', port: 0, tls: false, name: 'newSocket' };
      if (modtask.verbose.connect) modtask.sessionLog('', 'verbose.connect', config.name);
      modtask.createSocketConnection(config, function(outcome) {
        if (!outcome.success) $chain.chainReturnCB(outcome);
        var socketId = config.ip + '_' + config.port + '_' + (new Date()).getTime();
        modtask.sockets[socketId] = outcome.data;
        $chain.set('outcome', {
          success: true,
          socketId: socketId
        });
        cb();
      });
      return true;
  }
  return false;
}

modtask.socketPipe = function(s1, s2, verbose, cb) {
  var pipe = function(evtName, fnName) {
    console.log('pipe', evtName, '->', fnName);
    s1.on(evtName, function(p1, p2, p3) {
      if (verbose.ondata && evtName == 'data') console.log('recieved from remote socket', JSON.stringify(p1.toString()));
      s2[fnName](p1, p2, p3);
    });
    s2.on(evtName, function(p1, p2, p3) {
      if (verbose.writes && fnName == 'write') console.log('sending to remote socket', JSON.stringify(p1.toString()));
      s1[fnName](p1, p2, p3);
    });
  }

  pipe('data', 'write');
  pipe('close', 'close');
  pipe('error', 'close');
  pipe('end', 'destroy');
  cb({ success: true });
}

modtask.socketWrite = function(config, cb) {
  config = config || {
    socket: null,
    encoding: 'ascii',
    data: ''
  };

  if (!config.socketId || !modtask.sockets[config.socketId])
    return cb({ reason: 'socketId parameter should be a valid socketId' });
  var socketWrapper = modtask.sockets[config.socketId];
  try {
    var data = config.data;
    if (config.encoding) {
      // Node < v6, for node 6+ var buf = Buffer.from(xxx, 'base64');
      data = new Buffer(data, config.encoding);
    }
    if (modtask.verbose.writes) modtask.sessionLog(JSON.stringify(data.toString()), 'verbose.writes', socketWrapper.name);
    if (config.clientError && modtask.verbose.error) {
      modtask.sessionLog(config.clientError, 'verbose.error', socketWrapper.name);
    };
    socketWrapper.socket.write(data);
    cb( { success: true });
  } catch(e) {
    cb( { reason: e.message });
  }
}

modtask.socketWhile = function(config, cb, $chain) {
  config =  config || {};
  if (!config.timeOut) config.timeOut = 5000;
  if (!config.state) config.state = {};
  var timeOutStep = 1000;
  var totalTimeWaited = 0;
  if (!config.socketId || !modtask.sockets[config.socketId])
    return cb({ reason: 'socketId parameter should be a valid socketId' });
  var socketWrapper = modtask.sockets[config.socketId];
  var check = function(handlerIndex) {
    if (!handlerIndex) handlerIndex = 0;
    if (handlerIndex >= config.handlers.length) handlerIndex = 0;
    var currentHandlerName = config.handlers[handlerIndex];

    if (modtask.verbose.socketwhile) modtask.sessionLog('Scanning handler "' + currentHandlerName + '", totalTimeWaited=' + totalTimeWaited, 'socket.while', socketWrapper.name);
    try {
      var outcome = {};
      if (totalTimeWaited >= config.timeOut) {
        outcome = { reason: 'socketWhile timeout, totalTimeWaited: ' +  totalTimeWaited };
        if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while', socketWrapper.name);
        return cb(outcome);
      };

      var bufferedData = socketWrapper.state.bufferedData;
      if (config.encoding) {
        bufferedData = bufferedData.toString(config.encoding);
      }

      if (modtask.verbose.socketwhile) modtask.sessionLog(JSON.stringify(bufferedData), 'socket.while', socketWrapper.name);
      var scanNextHandler = function () {
        if (modtask.verbose.socketwhile) modtask.sessionLog('scanNextHandler', 'socket.while', socketWrapper.name);
        if (socketWrapper.changed) {
          totalTimeWaited = 0;
          socketWrapper.changed = false;
        }
        var timeOutValue = 10;
        if (handlerIndex == 0) {
          timeOutValue = timeOutStep;
        }
        totalTimeWaited += timeOutValue;
        setTimeout(function () {
          check(handlerIndex + 1);
        }, timeOutValue);
      }
    } catch(e) {
      outcome.reason = e.message;
      if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while', socketWrapper.name);
      return cb(outcome);
    }

    $chain.newChainForModule(modtask, cb, {}, [
      ['//inline/' + currentHandlerName, {
        str: bufferedData,
        state: config.state,
        socketId: config.socketId
      }],
      function(chain) {
        config.state = chain.get('outcome').state;
        chain(['//inline/' + config.test, {
          state: config.state
        }]);
      },
      function(chain) {
        if (chain.get('outcome').stillWaiting) {
          return scanNextHandler();
        }
        chain(['set', 'outcome', { success: true, state: config.state }]);
      }
    ]);
  }
  check(0);
}

modtask.resetState = function(socketId, cb) {
  if (!socketId || !modtask.sockets[socketId])
    return cb({ reason: 'socketId parameter should be a valid socketId' });
  var socketWrapper = modtask.sockets[socketId];
  socketWrapper.reset();
  cb({ success: true });
}

modtask.socketWrapper = function(socket, config) {
  if (!config) config = {};
  var state = {};
  var resetState = function() {
    // Buffer.alloc is not supported in the earlier versions of node
    // state.bufferedData = Buffer.alloc(0);
    state.bufferedData = new Buffer([]);
  }
  resetState();

  // This will get launched by socket.emit('error', ...)
  socket.on('error', function () {
    if (modtask.verbose.error) modtask.sessionLog('socket error', 'socket.error', ret.name);
    ret.changed = true;
    if (ret.onError) {
      return ret.onError();
    };
  });

  socket.on('close', function () {
    if (modtask.verbose.close) modtask.sessionLog('socket connection was closed', 'socket.close', ret.name);
    ret.changed = true;
    if (ret.onClose) {
      return ret.onClose();
    };
  });

  socket.on('end', function () {
    if (modtask.verbose.end) modtask.sessionLog('the other-end signalled that they are planning on closing the connection', 'socket.end', ret.name);
    ret.changed = true;
    if (ret.onEnd) {
      return ret.onEnd();
    };
  });

  socket.on('data', function(data) {
    if (modtask.verbose.ondata) modtask.sessionLog(JSON.stringify(data.toString()), 'verbose.ondata', ret.name);
    ret.changed = true;
    if (ret.onData) {
      return ret.onData(data);
    };
    state.bufferedData = Buffer.concat([state.bufferedData, data]);
  });

  var ret = {
    changed: false,
    name: config.name,
    state: state,
    reset: resetState,
    socket: socket
  };
  return ret;
}

modtask.createSocketConnection = function(config, cb) {
  try {
    if (config.tls) {
      const tls = require('tls');
      var stream = tls.connect(config.port, config.ip);
      stream.once('secureConnect', function () {
        cb({success: true, data: modtask.socketWrapper(stream, config)});
      });
      stream.on('error', function (err) {
        cb({ reason: err.toString() });
      });
    } else {
      var net = require('net');
      var stream = new net.Socket();
      stream.connect(config.port, config.ip);
      stream.once('connect', function () {
        cb({success: true, data: modtask.socketWrapper(stream, config)});
      });
      stream.on('error', function (err) {
        cb({ reason: err.toString() });
      });
    }
  } catch(e) {
    cb({ reason: e.message });
  }
}

modtask.verbose = {
  socketwhile: false,
  writes: false,
  ondata: false,
  connect: false,
  terminate: true,
  error: true,
  close: false,
  end: false
};