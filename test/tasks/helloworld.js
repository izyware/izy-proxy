var modtask = function(chain) {
  var taskToRun = chain.get('queryObject');
  var progress = 1;
  chain([
    ['chain.importProcessor', 'apps/tasks/api:task_chain', taskToRun],
    ['task.progress', progress++],
    ['set', 'outcome', { success: true, reason : 'Hello World' }]
  ]);
}
