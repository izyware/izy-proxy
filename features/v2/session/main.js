/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {}

  modtask.data = {
    // Used by //http/ runpkg calls
    authorizationToken: null,

    // Used by //inline/ runpkg calls
    ownerType: null,
    ownerId: null
  };

  modtask.set = function(data) {
    modtask.ldmod('kernel/mod').ldonce(modtask.__myname).data = data;
  }

  modtask.get = function(data) {
    return modtask.ldmod('kernel/mod').ldonce(modtask.__myname).data;
  }
  return modtask;
})();
