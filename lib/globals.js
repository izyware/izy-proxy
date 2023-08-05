/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {};
  modtask.setupGlobals = function(q, cb) {
    let store = typeof(window) == 'object' ? window : global;
    const objs = {
      '__connectionId': 1,
      '__applicationState': {},
      '__sockets': {},
      '__connections': {},
      '__pipes': {},
      '__audioDevices': {},
      '__callbacks': {},
      '__dataFrames': {},
      '__websockets': {},
      '__userGUI': {}
    };
    for(var p in objs) if (!store[p]) store[p] = objs[p];
    if (cb) cb({ success: true });
  };

  modtask.delete = function(id, val) {
    let store = typeof(window) == 'object' ? window : global;
    id = '__' + id;
    delete store[id];
  }

  modtask.set = function(id, val) {
    let store = typeof(window) == 'object' ? window : global;
    id = '__' + id;
    store[id] = val;
  }

  modtask.get = function(id) {
    let store = typeof(window) == 'object' ? window : global;
    id = '__' + id;
    return store[id];
  }

  modtask.increment = function(id) {
    let store = typeof(window) == 'object' ? window : global;
    id = '__' + id;
    return store[id]++;
  }

  return modtask;
})();
