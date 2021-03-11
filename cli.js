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
      case 'call':
        var action = cmdConfig.call;
        if (action.indexOf('//') != 0) {
          action = '//inline/' + action;
        }
        g_cli.runWithMethod('chain', {
          chain: {
            dontUseDefaultRelConfigFile: true,
            action: action,
            queryObject: cmdConfig.queryObject || {}
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