var modtask = function() {}
modtask.setup = function(doTransition) {
  modtask.doTransition = function (transition, callback) {
    return doTransition(transition, callback);
  }
  modtask.moderr = modtask.ldmod('rel:err/bare');
  var ctrl = modtask.ldmod('rel:transition').sp('modcontroller', {
    doTransition: modtask.doTransition,
    moddyn: modtask.ldmod('rel:dyn'),
    moderr: modtask.moderr
  });
  var doChain = function (_chain, callback) {
    var part = {};
    if (!callback) callback = function () {};
    ctrl.doChain(_chain,
      part,
      part["__modui"],
      callback,
      null // chain params
    );
  }
  return doChain;
}