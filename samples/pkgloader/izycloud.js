/* izy-loadobject nodejs-require */
module.exports = function() {
  var modtask = function() {};
  modtask.getCloudMod = function(pkgname, options) {
    return {
        incrementalLoadPkg: function(loadpush, okpush, failpush) {
          return modtask.incrementalLoadPkg(pkgname, options, loadpush, okpush, failpush);
        }
    };
  }

  modtask.incrementalLoadPkg = function(pkgName, options, loadpush, okpush, failpush) {
    if (!options) options = {};

    if (!modtask.auth) {
      return failpush({ reason: 'pkgloader auth token is not specified. You must configure the pkgloader.' });
    }
    return modtask.ldmod('rel:../../features/v2/http').universalHTTP().sendRequest({
      url: 'https://izyware.com/apigateway/:ui/ide:cloudstorage/api',
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: JSON.stringify({
        action: 'incrementalLoadPkg',
        pkgName: pkgName,
        // todo, this needs to be passed as HTTP header (cookie, auth header, etc.)
        auth: modtask.auth,
        ide: options.ide,
        loadDeps: options.loadDeps,
        releaseEnabled: options.releaseEnabled
      })
    }, function(_outcome) {
        if (!_outcome.success) return failpush(_outcome);
        // Becuase we use JSON/IO it will always be 200 (no 201, etc.)
        if (_outcome.status != 200) {
          var outcome = {
            success: false,
            reason: _outcome.responseText || _outcome.reason,
            status: _outcome.status
          };
          if (outcome.status == 0 || outcome.reason == '') {
            outcome.reason = 'Can not establish a network connection to ' + url;
          }
          return
          return failpush(outcome);
        }


        var serializedJSONResponse = _outcome.responseText;
        try {
          var response = JSON.parse(serializedJSONResponse);
          if (!response.success) return failpush(response);
          if (!response.data) return failpush({reason: 'invalid response from incrementalLoadPkg'});
          if (response.data.length == 0) return failpush({reason: 'package not found: "' + pkgName + '"'});
          var increments = response.data;
          for (var i = 0; i < increments.length; ++i) {
            var j = 0;
            loadpush(increments[i][j++], increments[i][j++], increments[i][j++]);
          }
          return okpush();
        } catch (e) {
          failpush({reason: e.message});
        }
        ;
      }
    );
  }

  modtask.auth = null;

  modtask.__$d = ['rel:../../features/v2/http'];
  return modtask;
};

module.exports.forcemodulereload = true;