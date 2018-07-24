var config = require('../configs/izy-proxy/taskrunner');

var seqs = {};
seqs.onNewTask = [
    ['task.progress', 50],
    ['task.reason', 'chain runner getting params'],
    ['task.getparameters'], // there is no task.setparams only thtough admin
    function(chain) {
        var path = chain.get('taskParameters');
        chain([
            ['task.reason', 'running ' + path],
            ['///' + path]
          ]);
    },
    function(chain) {
        chain(['task.outcome', chain.get('outcome')]);
    }
];

require('./index').newChain([
    // Use this to adjust the paths defined in modtask/config/kernel/extstores/file.js
    // So that all the relative and absolute paths to pkgs and modules are accessible
    // ['sysview'],
    ['chain.importProcessor', 'configs/izy-proxy/context'],
    ['returnOnFail'],
    ['chain.importProcessor', 'apps/tasks/api:chain'],
    ['returnOnFail'],
    ['taskrunner.authenticate', config.authenticate],
    ['returnOnFail'],
    ['taskrunner.onNewTask', seqs.onNewTask],
    ['taskrunner.setRuntimeID', config.izyware_runtime_id],
    // these may be moved into the config also 
    ['taskrunner.config', {
        loopMode: true,
        readOnlyMode: false,
        delay: 5000
    }],
    ['taskrunner.listen'],
    ['returnOnFail']
], console.log);

