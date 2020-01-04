var modtask = function() {}
modtask.resolveAuthorization = function(bearerToken, cb) {
  var path = '/opt/lampp/htdocs/apps/izyware/auth';
  var authorizationToken = (bearerToken + '').split(' ')[1] + '';
  var fname = 'session' + authorizationToken + '.txt';
  fname = path + '/' + fname;

  var data = {
    // Used by //http/ runpkg calls
    authorizationToken: authorizationToken,
    // Used by //inline/ runpkg calls
    ownerType: 1, // user
    ownerId: null // user.id
  };

  try {
    var fs = require('fs');
    var content = fs.readFileSync(fname, 'ascii');
    data.ownerId = parseInt(content.split('__SESSION_FILE__')[1]);
  } catch(e) {}

  return cb({
    success: true,
    data: data
  });
};
