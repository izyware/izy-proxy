
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
node cli.js ${commandLineKey} api path pkg:api payloadstr <xxxx> payloadfile <file>

Test
----
node cli.js ${commandLineKey} test
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
      modtask.ldmod('rel:test/utils').simulateApiCall(config.api.path);
      break;
    default:
      modtask.Log(modtask.helpStr);
      break;
  }
}
