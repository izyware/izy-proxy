var config = require('../configs/izy-proxy/taskrunner');
require('./index').newChain([
    // Use this to adjust the paths defined in modtask/config/kernel/extstores/file.js
    // So that all the relative and absolute paths to pkgs and modules are accessible
    // ['sysview'],
    ['chain.importProcessor', 'configs/izy-proxy/context'],
    ['ROF'],
    ['chain.importProcessor', 'apps/tasks/api:chain'],
    ['ROF'],
    ['taskrunner.authenticate', config.authenticate],
    ['ROF'],
    ['set', 'config', config],
    ['taskrunner.onNewTask', ['//chain/izy-proxy/chains/onNewTask']],
    ['taskrunner.setRuntimeID', config.izyware_runtime_id],
    ['taskrunner.config', config.runner],
    ['taskrunner.listen'],
    ['ROF']
], console.log);
