var modtask = {};
// also present in:
// plugin/apigateway/handle.js
// izy-circus/index.js
modtask.parseClientRequest = function(req, config) {
  config = config || {};
  var outcome = {};
  var domain = req.headers.host.split(':')[0];
  var path = req.url.split('?')[0].split('#')[0];
  if (path.indexOf('/') != 0) {
    path = '/' + path;
  }
  var url = `http://${domain}${path}`;
  config.aliases = config.aliases || [];
  config.aliases.forEach( alias => {
    url = url.replace(alias, '.izyware.com');
  });
  outcome.url = url;
  outcome.path = path;
  outcome.domain = domain;

  return outcome;
}
