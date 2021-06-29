/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {};
  modtask.getCloudMod = function(remote_pkgname) {
    var node = modtask.ldmod('features/v2/node/generic').getNode(modtask.__izyNodeConfig);
    var state = {
      packagename :  remote_pkgname,
      url : 'dbnode',
      mode : 'dbnode',
      idtoken : '0000000000000000',
      apptoken : remote_pkgname
    };

    try {
      return modtask.ldmod('components/pkgman/dbnode').sp({
        node: node,
        state: state,
        loadDeps: false,
        // we don't want stuff in release blobs
        releaseEnabled: false
      });
    } catch(e) {
      console.log('**** WARNING ****: getCloudModule for dbnode: (' + e.message + ')');
      return {
        incrementalLoadPkg: function(loadpush, okpush, failpush) {
          return failpush({ reason: e.message });
        }
      };
    }
  }

  // Configs
  modtask.izyNodeConfig = {};
  return modtask;
})();
