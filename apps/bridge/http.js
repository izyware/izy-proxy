var modtask = {};
var defaultConfig = {
    verbose: {
        config: false,
        transportAgent: false,
        prerequestmodules: false,
        postrequestmodules: false,
        preLandingAdjustments: false,
        postLandingAdjustments: false,
        datastream: false,
        changeList: false
    },
    transportAgent: null,
    tldBack: '0000-0000-0000-0000-1111-1111-1111-1111',
    tldFront: '0000-0000-0000-0000-1111-1111-1111-1111',
    proxyTargetStr: 'http://localhost:8080',
    response: {
        headers: {
            // if the server is trying to set a cookie domain to to tldBack, either convert B2F or remove
            'set-cookie': {
                action: 'B2F' /* |remove */
            }
        }
    },
    request: {
        headers: {
            host: {
                action: 'F2B'
            },
            referer: {
                action: 'F2B' /* | remove */
            },
            // Do not allow keep-alive connections
            connection: {
                action: 'overwrite',
                value: 'close'
            },
            // Do not allow compression of http data (zip, etc.) 
            'accept-encoding': {
                action: 'delete'
            }
        }
    }
};

modtask.handle = (serverObjs, context) => {
    const changeList = [];

    var outcome = modtask.processConfig(context);
    if (!outcome.success) {
        serverObjs.sendStatus({
            status: 500,
            subsystem: modtask.__myname
        }, outcome.reason);
        return;
    }    
    modtask.sessionConfig = outcome.data;
    let datastreamMonitor = { log: x => {} };
    const monitoringConfig = {}, fillinValues = {};
    if (modtask.sessionConfig.verbose) {
        datastreamMonitor = modtask.ldmod('lib/monitoring').createForMethodCallLogging(monitoringConfig, fillinValues);
        datastreamMonitor.log({ level: 2, msg: {
            action: 'handle'
        }});
    };

    if (modtask.preflightAdjustments(serverObjs, changeList)) return;
    const makeRequest = (a,b,c) => require('http-proxy').createProxyServer()
      .on('error', function(err) {
        serverObjs.sendStatus({
            status: 500,
            subsystem: modtask.__myname
        }, err.toString());          
      })
      .on('proxyRes', (d, q, s) => startResponseStream(d, q, s, serverObjs, changeList)).web(a,b,c);

    const { url, method, headers } = serverObjs.req;
    let requestBody = null;
    let chain = [];
    var prerequestmodules = modtask.sessionConfig.prerequestmodules;
    datastreamMonitor.log({ msg: {
        action: 'preLandingAdjustments',
        modules: prerequestmodules.length,
        url
    }});
    prerequestmodules.forEach(item => {
        var callStr = `//inline/${item}`;
        chain.push(modtask.sessionConfig.verbose.prerequestmodules ? ['log', `prerequestmodule [${item}]: ${url}`] : ['nop']);
        chain.push(chain => chain([callStr + '?should', { url, method, headers }]));
        chain.push(chain => {
            if (chain.get('outcome').should) return chain([
              ['nop'],
              _chain => {
                if (method.toUpperCase() == 'POST' || method.toUpperCase() == 'PUT') {
                    requestBody = '';
                    serverObjs.req.on('data', data => requestBody += data);
                    serverObjs.req.on('end', () => _chain(['continue']));
                } else {
                    _chain(['continue']);
                };
              },
              [callStr + '?perform', { url, method, headers, body: requestBody }],
              chain => {
                const outcome = chain.get('outcome');
                if (outcome.proxyTarget) {
                    var handlerConfig = {
                        target: outcome.proxyTarget,
                        selfHandleResponse: true
                    };
                    if (outcome.transportAgent) {
                        datastreamMonitor.log({ msg: {
                            action: 'transportAgent',
                            agent: outcome.transportAgent
                        }});
                        handlerConfig.agent = new require('proxy-agent')(outcome.transportAgent);
                    };
                    makeRequest(serverObjs.req, serverObjs.res, handlerConfig);
                } else {
                    const { response } = chain.get('outcome');
                    serverObjs.res.writeHead(response.statusCode, response.headers);
                    return serverObjs.res.end(new Buffer(response.bodyBase64, 'base64'));
                }
              }
            ]);
            chain(['continue']);
        });
    });

    var handlerConfig = {
        target: modtask.sessionConfig.defaultProxyTarget,
        selfHandleResponse : true
    };

    if (modtask.sessionConfig.transportAgent) {
        if (modtask.sessionConfig.verbose.transportAgent) console.log('[transportAgent] using ' + modtask.sessionConfig.transportAgent);
        handlerConfig.agent = new require('proxy-agent')(modtask.sessionConfig.transportAgent);
    };

    chain.push(chain => makeRequest(serverObjs.req, serverObjs.res, handlerConfig));

    modtask.doChain(chain, outcome => {
        if (!outcome.success) {
            serverObjs.sendStatus({
                status: 500,
                subsystem: modtask.__myname
            }, outcome.reason + outcome.__callstackStr.split('\n').join('<br/>').replace(/\s/g, '-'));
        }
    });
}

function startResponseStream(httpResponseObject, req, res, serverObjs, changeList) {
    var body = new Buffer('');
    if (modtask.sessionConfig.verbose.datastream) console.log('[startResponseStream] ' + req.url);
    httpResponseObject.on('data', function(data) {
        body = Buffer.concat([body, data]);
        if (modtask.sessionConfig.verbose.datastream) console.log('[startResponseStream?onData] length = ' + body.length + ', ' + req.url);
    });
    httpResponseObject.on('end', function() {
        if (modtask.sessionConfig.verbose.datastream) console.log('[startResponseStream?end], ' + req.url);
        postLandingAdjustments(serverObjs, req, res, {
            statusCode: httpResponseObject.statusCode,
            headers: httpResponseObject.headers,
            body
        }, changeList)
    });
};

modtask.guessCharacterSet = response => {
    const { headers } = response;
    let charset = 'utf-8';
    let contentType = headers['content-type'] || '';
    contentType = contentType.split('charset=');
    if (contentType.length) charset = contentType[1];
    return charset;
}

const postLandingAdjustments = (serverObjs, req, res, response, changeList) => {
    var charset = modtask.guessCharacterSet(response); 
    var postrequestmodules = modtask.sessionConfig.postrequestmodules;
    if (modtask.sessionConfig.verbose.postLandingAdjustments) console.log('[postLandingAdjustments] (' + charset + '), modules: ' + postrequestmodules.length + ' ' + req.url);
    const { body } = response;
    var inputPayload = {
        url: req.url,
        charset,
        headers: response.headers,
        bodyBase64: body.toString('base64'),
        tldBack: `${modtask.sessionConfig.tldBack}.com`,
        tldFront: `${modtask.sessionConfig.tldFront}.com`
    };
    let chain = [];
    postrequestmodules.forEach(item => {
        var callStr = `//inline/${item}`;
        chain.push(modtask.sessionConfig.verbose.postrequestmodules ? ['log', `postrequestmodules [${item}]: ${req.url}`] : ['nop']);
        chain.push([callStr + '?should', inputPayload]);
        chain.push(chain => {
            if (chain.get('outcome').should) return chain([
                [callStr + '?perform', inputPayload],
                chain => {
                    let { bodyBase64, headers, statusCode } = chain.get('outcome').response;
                    if (!statusCode) statusCode = response.statusCode;
                    if (!headers) headers = response.headers;
                    res.writeHead(statusCode, headers);
                    return res.end(new Buffer(bodyBase64, 'base64'));
                }
            ]);
            chain(['continue']);
        });
    });
    chain.push(function() {
        if (modtask.sessionConfig.verbose.changeList) {
            console.log('[changeList] ' + req.url);
            console.log(changeList);
        }
        res.writeHead(response.statusCode, response.headers);
        return res.end(body);
    });

    modtask.doChain(chain, outcome => {
        if (!outcome.success) {
            serverObjs.sendStatus({
                status: 500,
                subsystem: modtask.__myname
            }, outcome.reason + outcome.__callstackStr.split('\n').join('<br/>').replace(/\s/g, '-'));
        }
    });
}

modtask.preflightAdjustments = function(serverObjs, changeList) {
    serverObjs.req.headers.connection = 'close';
    delete serverObjs.req.headers['accept-encoding'];
    var clientReqHeaders = ['host', 'referer'];
    for(var i = 0; i < clientReqHeaders.length; ++i) {
        var prop = clientReqHeaders[i];
        if (serverObjs.req.headers[prop]) {
            changeList.push('req.headers.' + prop);
            changeList.push(serverObjs.req.headers[prop]);
            serverObjs.req.headers[prop] = serverObjs.req.headers[prop].replace(
              modtask.sessionConfig.tldFront,
              modtask.sessionConfig.tldBack
            );
            changeList.push(serverObjs.req.headers[prop]);
        }
    };
    return false;
}

modtask.processModules = function(config, names, legacy) {
    if (!config[names]) config[names] = [];
    var prefix = legacy + '/';
    legacy = 'service' + legacy.charAt(0).toUpperCase() + legacy.slice(1) + 's';
    if (config[legacy]) {
        for(var i=0; i < config[legacy].length; ++i) {
            config[names].push(prefix + config[legacy][i]);
        }
    }
}

modtask.postProcessConfig = function(config) {
    var proxyTargetStr = config.proxyTargetStr;
    proxyTargetStr = proxyTargetStr.split('/')[2].split(':');
    config.defaultProxyTarget = { 
        host: proxyTargetStr[0],
        port: proxyTargetStr[1]
    };
    modtask.processModules(config, 'prerequestmodules', 'interceptor');
    modtask.processModules(config, 'postrequestmodules', 'transformer');
};

modtask.processConfig = function(context) {
    var applyConfig = function(key) {
        if (typeof(key) != 'string') {
            for(var i=0; i < key.length;++i) {
                applyConfig(key[i]);
            }
            return;
        }
        if (finalConfig[key]) return;
        if (domainConfig[key]) {
            finalConfig[key] = domainConfig[key];
            return;
        }
        if (defaultConfig[key]) {
            finalConfig[key] = defaultConfig[key];
            return;
        }
    };
    var sessionObjs = context.sessionObjs || {};
    var cloudService  = sessionObjs.cloudService || {};
    var domainConfig = cloudService.config || {};
    var userConfigKey = domainConfig.userConfigKey || '__proxyConfig';
    var finalConfig = global[userConfigKey];
    if (!finalConfig || typeof(finalConfig) != 'object') return { reason: 'Bridge has not been configured. See izy-proxy README. userConfigKey = ' + userConfigKey };    
    if (!finalConfig.processed) {
        if (finalConfig.defaultProxyTarget) {
            finalConfig.proxyTargetStr = 'http://' + finalConfig.defaultProxyTarget.host + ':' + finalConfig.defaultProxyTarget.port;
        }
        applyConfig(['verbose', 'transportAgent', 'proxyTargetStr']);
        modtask.postProcessConfig(finalConfig);
        finalConfig.processed = true;
    }
    if (!finalConfig.verbose) finalConfig.verbose = {};
    if (finalConfig.verbose.config) console.log('[config] ', finalConfig);
    return { success: true, data: finalConfig };
};
