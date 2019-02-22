var modtask = function() {};
modtask.run = function(config, cb) {
    if (!cb) cb = function(outcome) {
        console.log('taskrunner layer outcome (each task will have its own outcome recorded in taskoutcome): ' , outcome);
    };
    require('../index').newChain([
        // Use this to adjust the paths defined in modtask/config/kernel/extstores/file.js
        // So that all the relative and absolute paths to pkgs and modules are accessible
        // ['sysview'],
        ['chain.importProcessor', 'apps/tasks/api:chain', config.taskrunnerProcessor],
        ['ROF'],
        ['taskrunner.authenticate', config.authenticate],
        ['ROF'],
        ['set', 'config', config],
        ['taskrunner.onNewTask', ['//chain/izy-proxy/chains/onNewTask']],
        ['taskrunner.setRuntimeID', config.izyware_runtime_id],
        ['taskrunner.config', config.taskrunner],
        ['taskrunner.listen'],
        ['ROF']
    ],
      // When the taskrunner loop exits (which can be never if in the loop mode) or when an error in the taskrunner system occurs we will call this
      // Notice that the outcome of the 'onNewTask' stage will get recorder as 'taskoutcome' and will no affect this
      cb,
      {
        // Configuration for each processor
        'import': config.import,
        izynode: config.izynode,
        runpkg: config.runpkg
    });
}

module.exports = modtask;
