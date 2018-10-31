
var modtask = function(chainItem, cb, $chain) {
  var session = modtask.session || {};
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
    case 'socket.write':
      modtask.socketWrite(chainItem[i++], function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
      break;
    case 'socket.wrapraw':
      var rawSocket = chainItem[i++];
      var config = chainItem[i++];
      $chain.set('outcome', { success: true, data: modtask.socketWrapper (rawSocket, config) });
      cb();
      return true;
      break;
    case 'socket.terminate':
      var socketWrapper = chainItem[i++];
      var socket = socketWrapper.socket;
      if (modtask.verbose.terminate) modtask.sessionLog('', 'socket.terminate', socketWrapper.name);
      try {
        if (socket.close) socket.close();
        // this is hard disconnnect: no 'end' events will be fired and data trasnfer will immediately shutdown
        if (socket.destroy) socket.destroy();
        // of you can do socket.end which will flush the data, emit the 'end' event and then disconnect

        $chain.set('outcome', { success: true });
      } catch(e) {
        if (modtask.verbose.error) modtask.sessionLog(e.message, 'terminate.error', socketWrapper.name);
        $chain.set('outcome', { reason: e.message });
      }
      cb();
      return true;
      break;
    case 'socket.while':
      modtask.socketWhile(chainItem[i++], function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
      break;
    case 'socket.connect':
      var config = chainItem[i++] || { ip: '', port: 0, tls: false, name: 'newSocket' };
      if (modtask.verbose.connect) modtask.sessionLog('', 'verbose.connect', config.name);
      modtask.createSocketConnection(config, function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
  }
  return false;
}

modtask.socketWrite = function(config, cb) {
  config = config || {
    socket: null,
    encoding: 'ascii',
    data: ''
  };
  var socketWrapper = config.socket;
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

modtask.socketWhile = function(config, cb) {
  config =  config || {};
  if (!config.timeOut) config.timeOut = 5000;
  if (!config.state) config.state = {};

  var timeOutStep = 1000;
  var totalTimeWaited = 0;
  var socketWrapper = config.socketWrapper;
  var check = function(handlerIndex) {
    if (!handlerIndex) handlerIndex = 0;
    if (handlerIndex >= config.handlers.length) handlerIndex = 0;
    var handlerCollection = config.handlerCollection || {};
    var currentHandlerName = config.handlers[handlerIndex];
    var currentHandler = handlerCollection[currentHandlerName];

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

      if (typeof(currentHandler) != 'function') {
        outcome = {reason: '"' + currentHandlerName + '" handler needs to be a function'}
        if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while', socketWrapper.name);
        return cb(outcome);
      }
    } catch(e) {
      outcome.reason = e.message;
      if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while', socketWrapper.name);
      return cb(outcome);
    }

    try {
      currentHandler(bufferedData, config, function(outcome) {
        if (outcome.success) {
          if (modtask.verbose.socketwhile) modtask.sessionLog('Condition met for handler "' + currentHandlerName + '"', 'socket.while', socketWrapper.name);
          if (modtask.verbose.socketwhile) modtask.sessionLog('should break?', 'socket.while', socketWrapper.name);
          try {
            config.test(function (outcome) {
              if (outcome.success) {
                if (modtask.verbose.socketwhile) modtask.sessionLog('yeah break', 'socket.while', socketWrapper.name);
                return cb(outcome);
              } else {
                if (outcome.stillWaiting) {
                  scanNextHandler();
                } else {
                  if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while error in test', socketWrapper.name);
                  return cb(outcome);
                }
              }
            }, config);
          } catch(e) {
            outcome.reason = e.message;
            if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while [TEST]', socketWrapper.name);
            return cb(outcome);
          }
        } else {
          if (outcome.stillWaiting) {
            scanNextHandler();
          } else {
            if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while error in handler "' + currentHandlerName + '"', socketWrapper.name);
            return cb(outcome);
          }
        }
      });
    } catch(e) {
      outcome.reason = e.message;
      if (modtask.verbose.socketwhile) modtask.sessionLog(outcome.reason, 'socket.while error, handler=' + currentHandlerName, socketWrapper.name);
      return cb(outcome);
    };
  }
  check(0);
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