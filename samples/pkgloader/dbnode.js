
var modtask = function() {};
modtask.getCloudMod = function(remote_pkgname) {
  var node = modtask.ldmod('ui/node/direct').sp(modtask.__izyNodeConfig).sp('verbose', modtask.__izyNodeConfig.verbose);
  var state = {
    packagename :  remote_pkgname,
    url : 'dbnode',
    mode : 'dbnode',
    idtoken : '1234567890abcde',
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
    return {
      incrementalLoadPkg: function(loadpush, okpush, failpush) {
        return failpush({ reason: e.message });
      }
    };
  }
}

// Configs
modtask.izyNodeConfig = {};
