
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
modtask.helpStr = `
Please specifiy arguments. 

Deployment Config Verification
------------------------------
node cli.js ${commandLineKey} verifyconfig api.email my_email_address

Api Launch
----------
node cli.js method api api.path pkg:api api.queryObject.key1 val1 ...

Test
----
The component does not have test enabled from the command line. See README for instructions on how to test it.

`;

modtask.help[modtask.helpStr] = true;
modtask.commit = false;
modtask.verbose = false;

modtask.cmdlineverbs[commandLineKey] = function() {
  var config = modtask.ldmod('izymodtask/index').extractConfigFromCmdLine(commandLineKey);
  var method = config[commandLineKey];
  delete config[commandLineKey];
  switch(method) {
    case 'verifyconfig':
      modtask.ldmod('rel:test/utils').simulateApiCall('ui/w/shell/credsrecovey:api/forgotpassword', {
        email: config.api.email
      });
      break;
    case 'api':
      modtask.ldmod('rel:test/utils').simulateApiCall(config.api.path, config.api.queryObject);
      break;
    case 'socket':
      modtask.ldmod('rel:test/utils').simulateSocketIO(config.socket);
      break;
    default:
      modtask.Log(modtask.helpStr);
      break;
  }
}
