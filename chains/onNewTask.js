var modtask = function(chain) {
  var config = chain.get('config') || {};
  chain([
    config.verbose ? ['log', 'new task'] : ['nop'],
    ['task.progress', 1],
    ['task.reason', 'chain runner getting params'],
    ['task.getparameters'], // there is no task.setparams only thtough admin
    function(chain) {
      var path = chain.get('taskParameters');
      chain([
        config.verbose ? ['log', 'running ' + path] : ['nop'],
        ['task.reason', 'running ' + path],
        [path]
      ]);
    },
    // return the outcome to the taskrunner system to be recorded in the taskoutcome database
    ['return']
  ]);
}
