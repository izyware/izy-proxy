
var modtask = {};

var commandLineKey = 'method';
modtask.init = function() {
  // We need to create a 'platform based shell that would automatically do this for windows'
  if (modtask.ldmod("kernel/plat").getOSName() == "windows") {
    modtask.ldmod('net/http').configAsync('sync');
  }
  modtask.groupidobject = { "transportmodule" : false } ;
}
modtask.cmdlineverbs = {};
modtask.help = {};
modtask.helpStr = 'Invalid command line arguments. See README for further information.';

modtask.help[modtask.helpStr] = true;
modtask.commit = false;
modtask.verbose = false;

modtask.augmentConfig = function(cfg, more) {
  var p;
  if (!more) more = {};
  for(p in more) {
    if (more[p]) {
      if (!cfg[p] ||
        (typeof(cfg[p]) != typeof(more[p])) ||
        (typeof(more[p]) != 'object')
      ) {
        if (more[p] == 'false') more[p] = false;
        if (more[p] == 'true') more[p] = true;

        cfg[p] = more[p];
      } else {
        modtask.augmentConfig(cfg[p], more[p]);
      }
    }
  }
}

modtask.expandStringEncodedConfigValues = function(config, outcome) {
  if (!outcome) outcome = {};
  var p;
  for(p in config) {
    switch(typeof(config[p])) {
      case 'string':
        var token = 'json:';
        if (config[p].indexOf(token) == 0) {
          try {
            config[p] = JSON.parse(config[p].substr(token.length, config[p].length - token.length));
          } catch(e) {
            outcome.success = false;
            outcome.reason = 'cannot parse ' + config[p] + ': ' + e.message;
            return outcome;
          }
        }
        break;
      case 'object':
        modtask.expandStringEncodedConfigValues(config[p], outcome);
        if (!outcome.success) return outcome;
        break;
    }
  }
  outcome.success = true;
  return outcome;
}

modtask.cmdlineverbs[commandLineKey] = function() {
  var izymodtask = modtask.ldmod('izymodtask/index');
  var config = izymodtask.extractConfigFromCmdLine(commandLineKey);
  var outcome = modtask.expandStringEncodedConfigValues(config);
  if (!outcome.success) {
    return console.log(outcome);
  }

  var method = config[commandLineKey];
  delete config[commandLineKey];

  var meta = {};
  if (config.meta) {
    meta = config.meta;
    delete config.meta;
  }

  switch(method) {
    case 'api':
      modtask.ldmod('rel:test/utils').simulateApiCall(config.api.path, config.api.queryObject);
      break;
    case 'socket':
      modtask.ldmod('rel:test/utils').simulateSocketIO(config.socket);
      break;
    case 'tcpserver':
      var main = izymodtask.relRequire('server');
      var runnerConfig = izymodtask.relRequire('../configs/izy-proxy/tcpserver');
      modtask.augmentConfig(runnerConfig, config);
      if (meta.action == 'checkconfig') {
        return console.log(runnerConfig);
      }
      main.run(runnerConfig);
      break;
    case 'taskrunner':
      var main = izymodtask.relRequire('taskrunner/main');
      var runnerConfig = izymodtask.relRequire('../configs/izy-proxy/taskrunner');
      modtask.augmentConfig(runnerConfig, config);
      if (meta.action == 'checkconfig') {
        return console.log(runnerConfig);
      }
      main.run(runnerConfig);
      break;
    case 'chain':
      var __chainProcessorConfig = {};
      if (!config.chain.relConfigFile) {
        config.chain.relConfigFile = '../configs/izy-proxy/taskrunner';
      }
      try {
        console.log('Loading config: ', config.chain.relConfigFile);
        __chainProcessorConfig = izymodtask.relRequire(config.chain.relConfigFile).__chainProcessorConfig;
      } catch(e) { console.log('Warning no config found', e.message); }
      izymodtask.relRequire('index').newChain({
        chainItems: [
          [config.chain.action, config.chain.queryObject]
        ],
        __chainProcessorConfig: __chainProcessorConfig
      }, function(outcome) {
        if (outcome.success) {
          delete outcome.__callstack;
          delete outcome.__callstackStr;
          console.log(outcome);
        } else {
          console.log(outcome.reason);
          console.log(outcome.__callstackStr);
        }
      });
      break;
    default:
      modtask.Log(modtask.helpStr);
      break;
  }
}
