var modtask = function() {}
modtask.universalHTTP = function() {
  function requestByXmlHttp(cb, url, method, headers, body, req) {
    req.open(method, url, true);
    var p;
    for (p in headers) {
      req.setRequestHeader(p, headers[p]);
    }
    req.onreadystatechange = function() {
      if (req.readyState != 4) return;
      cb({
        success: true,
        responseText: req.responseText,
        status: req.status
      });
    }
    if (req.readyState == 4) return cb({
      success: true,
      responseText: req.responseText,
      status: req.status
    });
    req.send(body);
  }

  function sendRequest(_options, cb) {
    var url = _options.url;
    var method = _options.method;
    var body = _options.body;
    var headers = _options.headers || {};
    var metaOptions = {
      resolveErrorAsStatusCode: _options.resolveErrorAsStatusCode
    };
    if (!method) {
      method = (body) ? 'POST' : 'GET';
    }

    if (method == 'POST' || method == 'PUT') {
      if (typeof(body) != 'string') {
        return cb({ reason: 'please specify a body string for request method: ' + method });
      }
    }

    var req = createXMLHTTPObject();
    if (req) return requestByXmlHttp(cb, url, method, headers, body, req);
    requestByNode(cb, url, method, headers, body, metaOptions);
  };

  function requestByNode(cb, url, method, headers, body, metaOptions) {
    try {
      method = method.toUpperCase();
      var modurl = require('url');
      parts = modurl.parse(url, true);
      var options = {
        host: parts.hostname,
        path: parts.path,
        method: method,
        headers: headers
      };

      if (parts.port) {
        options.port = parts.port;
      }

      if (method == 'POST' || method == 'PUT') {
        options.headers['Content-length'] = body.length;
      };

      var nodeHttp = require((parts.protocol == 'https:' ? 'https' : 'http'));

      var ret = '';
      var req = nodeHttp.request(options,
        function(response) {
          var str = ''
          response.on('data', function (chunk) {
            str += chunk;
          });
          response.on('end', function () {
            cb({
              success: true,
              responseText: str,
              status: response.statusCode,
              headers: response.headers
            });
          });
        }
      );

      req.on('error', function(err) {
        var str = 'http request error: ' + err + ', host: ' + parts.host;
        if (metaOptions.resolveErrorAsStatusCode) {
          cb({
            success: true,
            responseText: str,
            status: metaOptions.resolveErrorAsStatusCode,
            headers: {}
          });
        } else {
          cb({ reason: str });
        }
      });

      if (method == 'POST' || method == 'PUT') {
        req.write(body);
      } else {
        // Nothing more to do for GET
      }
      req.end();
    } catch(e) {
      return cb({ reason: 'Error: ' + e.message + ', host: ' + parts.host });
    }
  }

  function createXMLHTTPObject() {
    var XMLHttpFactories = [
      function() {
        return new XMLHttpRequest()
      },
      function() {
        return new ActiveXObject('Msxml2.XMLHTTP')
      },
      function() {
        return new ActiveXObject('Msxml3.XMLHTTP')
      },
      function() {
        return new ActiveXObject('Microsoft.XMLHTTP')
      }
    ];
    var xmlhttp = false;
    for (var i = 0; i < XMLHttpFactories.length; i++) {
      try {
        xmlhttp = XMLHttpFactories[i]();
      } catch (e) {
        continue;
      }
      break;
    }
    return xmlhttp;
  };

  return {
    sendRequest: sendRequest
  };
}

