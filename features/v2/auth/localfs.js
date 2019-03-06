var modtask = function() {}
modtask.resolveAuthorization = function(authorizationToken, cb) {
  var path = '/opt/lampp/htdocs/apps/izyware/auth';
  var authorization = authorizationToken;
  authorization = (authorization + '').split(' ')[1] + '';
  var fname = 'session' + authorization + '.txt';
  fname = path + '/' + fname;

  var data = {
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
