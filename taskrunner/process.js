var modtask = function() {};
modtask.listen = function(queryObject, cb, context) {
    var config = queryObject.config || {};
    var apiExecusionContext = config.apiExecusionContext || 'inline';
    apiExecusionContext = '//' + apiExecusionContext + '/';
    var apiPackageName = config.apiPackageName;
    if (!apiPackageName) return cb({ reason: 'apiPackageName must be specified in taskrunnerProcessor config.', status: 2000001 });
    apiPackageName += ':';
    var verbose = config.verbose;
    var runTimeID = config.izyware_runtime_id;
    if (!runTimeID) return cb({ reason: 'izyware_runtime_id must be specified in taskrunnerProcessor config.', status: 2000002 });

    var loopMode = config.loopMode;
    var delay = config.delay || 5000;
    var readonly = config.readonly;

    var taskToRun = {};
    modtask.doChain([
        verbose ? ['log', 'Listening as ' + runTimeID] : ['nop'],
        [apiExecusionContext + apiPackageName + 'crud?readList', {
          runTimeID: runTimeID
        }],
        function(chain) {
            var data = chain.get('outcome').data;
            if (data.length == 0) return chain(verbose ? ['log', '[taskrunner] no outstanding tasks'] : ['nop']);
            taskToRun = data[0];
            taskToRun.readonly = readonly;
            chain.newChainForModule(modtask, function(outcome) {
                chain([
                  verbose ? ['log', 'Recording outcome for task'] : ['nop'],
                  [apiExecusionContext + apiPackageName + 'crud?taskOutcome', {
                    verbose: verbose,
                    taskRunId: taskToRun.id,
                    readonly: readonly,
                    outcome: {
                      reason: outcome.reason,
                      success: outcome.success
                    }
                  }],
                  [apiExecusionContext + apiPackageName + 'run?queueForReRunIfEnabled', {
                    taskId: taskToRun.taskId,
                    readonly: readonly
                  }],
                  verbose ? ['log', outcome.success ? 'taskoutcome: success' : 'taskoutcome: ' + outcome.reason + ', callstack: ' + outcome.__callstackStr] : ['nop']
                ]);
            }, {}, [
                ['chain.importProcessor', apiPackageName + 'task_chain', taskToRun],
                [ taskToRun.parameters, taskToRun ]
            ]);
        },
        (loopMode ? [
            verbose ? ['log', '[taskrunner] wait ' + delay] : ['nop'],
            ['delay', delay]
              ] : ['continue']),
        (loopMode ? ['replay'] : ['outcome', { success: true }])     
    ]);
} 
