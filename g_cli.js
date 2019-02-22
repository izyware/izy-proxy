
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
  var config = izymodtask.extractConfigFromCmdLine(commandLineKey);
  var method = config[commandLineKey];
  delete config[commandLineKey];
  switch(method) {
    case 'verifyconfig':
      modtask.ldmod('rel:test/utils').simulateApiCall('ui/w/shell/credsrecovey:api/forgotpassword', {
        email: config.userdata.email
      });
      break;
    case 'api':
      modtask.ldmod('rel:test/utils').simulateApiCall(config.api.path, config.api.queryObject);
      break;
    case 'socket':
      modtask.ldmod('rel:test/utils').simulateSocketIO(config.socket);
      break;
    case 'taskrunner':
      var main = izymodtask.relRequire('taskrunner/main');
      var runnerConfig = izymodtask.relRequire('../configs/izy-proxy/taskrunner');
      modtask.augmentConfig(runnerConfig, config);
      main.run(runnerConfig);
      break;
    case 'chain':
      izymodtask.relRequire('index').newChain([
        [config.chain.action, config.chain.p1, config.chain.p2],
        function(chain) {
          console.log(chain.get('outcome'));
        }
      ], function(outcome) {
        if (!outcome.success) console.log('Error running chain: ' + outcome.reason);
      }, {});
      break;
    default:
      modtask.Log(modtask.helpStr);
      break;
  }
}
