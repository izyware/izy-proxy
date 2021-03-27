function start() {
  var izymodtask = require('./izymodtask/index');
  var g_cli = izymodtask.getRootModule(__dirname).ldmod('g_cli');

  if (process.argv[2] == 'method') {
    g_cli.cmdlineverbs.method();
  } else {
    var outcome = izymodtask.extractConfigFromCmdLine(process.argv);
    if (!outcome.success) {
      return console.log(outcome);
    }
    var cmdConfig = outcome.data;
    var action = process.argv[2];
    switch (action) {
      case 'callpretty':
      case 'call':
        var pretty = false;
        if (action == 'callpretty') {
          pretty  = true;
        }
        var action = cmdConfig[action];
        if (action.indexOf('//') != 0) {
          action = '//inline/' + action;
        }
        g_cli.runWithMethod('chain', {
          chain: {
            dontUseDefaultRelConfigFile: true,
            action: action,
            queryObject: cmdConfig.queryObject || {},
            pretty: pretty
          }
        });
        break;
    }
  }
}

try {
  start();
} catch(e) {
  console.log({ reason: e.message });
}