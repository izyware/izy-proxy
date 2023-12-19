/* izy-loadobject nodejs-require */
module.exports = (function() {
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
        resolveErrorAsStatusCode: _options.resolveErrorAsStatusCode,
        rejectUnauthorized: true,
        responseType: _options.responseType || 'text',
        verbose: _options.verbose || {}
      };

      if (typeof(_options.rejectUnauthorized) == 'boolean' && !_options.rejectUnauthorized) {
        metaOptions.rejectUnauthorized = false;
      };

      if (typeof(url) != 'string') return cb({ reason: 'missing the the "url" string. please provide one to continue.' });
      if (!method) {
        method = (body) ? 'POST' : 'GET';
      }

      if (method == 'POST' || method == 'PUT') {
        if (typeof(body) != 'string') {
          return cb({ reason: 'please specify a body string for request method: ' + method });
        }
      }

      if (_options.connectionId) return requestOverExistingConnection(cb, _options, metaOptions);
      var req = createXMLHTTPObject();
      if (req) return requestByXmlHttp(cb, url, method, headers, body, req);
      requestByNode(cb, url, method, headers, body, metaOptions);
    };

    function requestOverExistingConnection(cb, _options, metaOptions) {
      const { method, url, body, connectionId } = _options;
      const connection = global.__connections[connectionId];
      const socket = connection.socket;
      const crlf = '\r\n';
      const data = method + ' ' + url + ' http/1.1' + crlf + 'content-length: ' + body.length + crlf + crlf + body;
      let response = '';
      socket.on('data', data => {
        response += data.toString();
        if (response.indexOf(crlf + crlf) == -1) return;
        try {
          const headerbody = response.split(crlf + crlf);
          const contentLength = parseInt(headerbody[0].toLowerCase().split('content-length: ')[1].split(crlf)[0]);
          const responseText = headerbody[1];
          if (contentLength < responseText.length) return;

          const finalResponse = {
            responseType: metaOptions.responseType,
            responseText,
            response: Buffer.from([])
          };
          finalResponse.status = 200;
          finalResponse.headers = {};
          return finalResponseResolve(cb, finalResponse);
        } catch(e) {
          return cb({ reason: e.message });
        }
      });
      socket.write(data);
    }

    function requestByNode(cb, url, method, headers, body, metaOptions) {
      try {
        var verbose = metaOptions.verbose || {};
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

        if (verbose.logEvents) console.log('[req] ', url);
        var nodeHttp = require((parts.protocol == 'https:' ? 'https' : 'http'));
        if (!metaOptions.rejectUnauthorized) {
          options.agent = new nodeHttp.Agent({
            rejectUnauthorized: false
          });
        }

        var endCalled = false;
        var req = nodeHttp.request(options,
          function(response) {
            const finalResponse = {
              responseType: metaOptions.responseType,
              responseText: '',
              response: Buffer.from([])
            };
            response.on('data', function (chunk) {
              if (verbose.logEvents) console.log('[data] ', url);
              switch(metaOptions.responseType) {
                case 'arraybuffer':
                  finalResponse.response = Buffer.concat([finalResponse.response, chunk]);
                  break;
                default:
                  finalResponse.responseText += chunk;
                  break;
              };
            });
            response.on('close', function() {
              if (verbose.logEvents) console.log('[close] ', url);
              if (!endCalled && metaOptions.resolveErrorAsStatusCode) {
                console.log('Warning, experimental feature');
                cb({
                  success: true,
                  responseText: 'The server closed the connection before sending data.',
                  status: metaOptions.resolveErrorAsStatusCode,
                  headers: {}
                });
              }
            });

            response.on('end', function () {
              if (verbose.logEvents) console.log('[end] ', url);
              endCalled = true;
              finalResponse.status = response.statusCode;
              finalResponse.headers = response.headers;
              finalResponseResolve(cb, finalResponse);
            });
          }
        );
        req.on('error', function(err) {
          if (verbose.logEvents) console.log('[error] ', url);
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
        if (verbose.logEvents) console.log('[exception] ', url);
        return cb({ reason: 'Error: ' + e.message + ', host: ' + parts.host });
      }
    }

    function finalResponseResolve(cb, finalResponse) {
      switch(finalResponse.responseType) {
        case 'arraybuffer':
          finalResponse.response = finalResponse.response.buffer;
          break;
        case 'json':
          finalResponse.response = null;
          try {
            finalResponse.response = JSON.parse(finalResponse.responseText);
          } catch(e) {}
          break;
        default:
          finalResponse.response = null;
          break;
      };
      return cb({
        success: true,
        responseText: finalResponse.responseText,
        response: finalResponse.response,
        status: finalResponse.status,
        headers: finalResponse.headers
      });
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
  return modtask;
})();