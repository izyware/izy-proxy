var modtask = function(chain) {
  chain([
    ['log', 'new task'],
    ['task.progress', 1],
    ['task.reason', 'chain runner getting params'],
    ['task.getparameters'], // there is no task.setparams only thtough admin
    function(chain) {
      var path = chain.get('taskParameters');
      chain([
        ['log', 'running ' + path],
        ['task.reason', 'running ' + path],
        [path]
      ]);
    },
    // return the outcome
    ['return']
  ]);
}
