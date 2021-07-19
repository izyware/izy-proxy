/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {};
  modtask.actions = {};
  modtask.actions.test = function(queryObject, cb) {
    cb({ success: true });
  };
  return modtask;
})();
