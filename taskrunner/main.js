var modtask = function() {};
modtask.run = function(config, cb) {
    if (!cb) cb = function(outcome) {
        if (outcome.success) return console.log('taskrunner exitted successfully');
        console.log('--- taskrunner layer error ----');
        console.log(outcome.reason);
        console.log(outcome.__callstackStr);
    };
    require('../index').newChain({
          chainItems: [
              // Use this to adjust the paths defined in modtask/config/kernel/extstores/file.js
              // So that all the relative and absolute paths to pkgs and modules are accessible
              // ['sysview'],
              ['chain.importProcessor', 'apps/tasks/api:taskrunner_chain', config.taskrunnerProcessor],
              ['taskrunner.listen']
          ],
          __chainProcessorConfig: config.__chainProcessorConfig
      },
      // When the taskrunner loop exits (which can be never if in the loop mode) or when an error in the taskrunner system occurs we will call this
      // Notice that the outcome of the 'onNewTask' stage will get recorder as 'taskoutcome' and will no affect this
      cb);
}

module.exports = modtask;
