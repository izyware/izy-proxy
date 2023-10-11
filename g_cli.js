
/* izy-loadobject nodejs-require */

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

modtask.cmdlineverbs[commandLineKey] = function() {
  var izymodtask = modtask.ldmod('izymodtask/index');
  var outcome = izymodtask.extractConfigFromCmdLine(process.argv);
  if (!outcome.success) {
    return console.log(outcome);
  }
  var config = outcome.data;
  var method = config[commandLineKey];
  delete config[commandLineKey];
  modtask.runWithMethod(method, config);
}

modtask.runWithMethod = function(method, config) {
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
      var main = require('./server');
      var runnerConfig = require('../configs/izy-proxy/tcpserver');
      modtask.augmentConfig(runnerConfig, config);
      if (meta.action == 'checkconfig') {
        return console.log(runnerConfig);
      }
      main.run(runnerConfig);
      break;
    case 'taskrunner':
      var main = require('./taskrunner/main');
      var runnerConfig = require('../configs/izy-proxy/taskrunner');
      modtask.augmentConfig(runnerConfig, config);
      if (meta.action == 'checkconfig') {
        return console.log(runnerConfig);
      }
      main.run(runnerConfig);
      break;
    case 'chain':
      var currentdir = 'rel:/';
      try {
        currentdir = process.cwd() + '/';
      } catch(e) { }
      var __chainProcessorConfig = {
        __moduleSearchPaths: [
          currentdir,
          __dirname + '/',
          // needed, otherwise FAIL, loadObject2, Does not exist: kernel/mod. The module for the chain handler is: node_modules/izy-proxy/features/v2/chain/processors/runpkg
          // turns out the failure is coming from modtask.ldmod('kernel\\selectors').objectExist line in runpkg
          currentdir + '/node_modules/izymodtask/'
        ]
      };
      if (process.__izyProxyCliModuleSearchPaths) {
        __chainProcessorConfig.__moduleSearchPaths = __chainProcessorConfig.__moduleSearchPaths.concat(process.__izyProxyCliModuleSearchPaths);
      }
      if (!config.chain.relConfigFile) {
        if (!config.chain.dontUseDefaultRelConfigFile)
          config.chain.relConfigFile = '../configs/izy-proxy/taskrunner';
      }
      if (config.chain.relConfigFile) {
        try {
          console.log('Loading config: ', config.chain.relConfigFile);
          __chainProcessorConfig = require(config.chain.relConfigFile).__chainProcessorConfig;
        } catch (e) { console.log('Warning no config found', e.message); }
      }
      require('./index').newChain({
        chainItems: [
          [config.chain.action, config.chain.queryObject]
        ],
        __chainProcessorConfig: __chainProcessorConfig
      }, function(outcome) {
        if (outcome.success) {
          delete outcome.__callstack;
          delete outcome.__callstackStr;
          if (config.chain.pretty)
            console.log(outcome.data);
          else
            console.log(outcome);
        } else {
          console.log(outcome.reason);
          if (!config.chain.pretty)
            console.log(outcome.__callstackStr);
        }
      });
      break;
    default:
      modtask.Log(modtask.helpStr);
      break;
  }
}

module.exports = modtask;
