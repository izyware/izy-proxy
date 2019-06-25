var featureModulesPath = 'features/v2/';
modtask.handle = function(serverObjs, mod, chainHandlers) {
    if (serverObjs.acceptAndHandleCORS()) return;

    var req = serverObjs.req;
    var res = serverObjs.res;

    if (['POST', 'GET'].indexOf(req.method) == -1) {
        return serverObjs.sendStatus({
            status: 401,
            subsystem: modtask.__myname
        }, 'Only POST and GET is allowed');
    };

    if (req.method == 'POST') {
        var body = '';
        req.on('data', function(data) {
            body += data;
        });
        req.on('end', function() {
            modtask.processQuery(body, serverObjs, mod, chainHandlers);
        });
        return;
    };

    var url = req.url;
    var resource = url.indexOf('?') != -1 ? url.split('?')[1] : '';
    resource = decodeURIComponent(resource);

    // Handle https://xxxx/.../api?beacon.gif GET request
    // This is useful for testing access to the bridge service
    if (resource.indexOf('beacon.gif') == 0) {
        return serverObjs.apigateway.decodeBase64Content(modtask.images.beacon);
    }

    return serverObjs.sendStatus({
        status: 404,
        subsystem: modtask.__myname
    }, 'Resource not found: ' + resource);
}

modtask.processQuery = function(query, serverObjs, mod, chainHandlers) {
    var jcbEncode = function(outcome) {
        var headers = serverObjs.getCORSHeaders();
        headers['Content-Type'] = 'text/html';
        serverObjs.res.writeHead(200, headers);
        serverObjs.res.end(JSON.stringify(outcome));
    };

    var queryObject;
    try {
        queryObject = JSON.parse(query);
    } catch (e) {
        return jcbEncode({ reason: 'Malformed query. JSON.parse(query) failed' });
    }

    try {
        var context = { session: modtask.ldmod('features/v2/session/main').get() };
        modtask.ldmod(featureModulesPath + 'pkg/run').runJSONIOModuleInlineWithChainFeature(
          mod,
          null, // methodToCall
          queryObject,
          context,
          chainHandlers,
          jcbEncode);
    } catch (e) {
        return jcbEncode({ reason: 'Cannot process query: ' + e.message });
    }
}

modtask.images = {
    beacon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAUVBMVEVqwln////G6L/2+/WKz33K6cSN0IBuw12Ay3Lv+O37/vvh892FzXiEzXbt+Ov0+/Pc8dix36jU7c91x2Wd15KS04bW7tG847S34a6Z1Y6o254Fw9K1AAAEBklEQVR4nMWb62KyMAxAy3BUQJ2I4OX9H3QBFIHem9Tk976d87Fe0jQVWUzk9W9z7YrDvpWy3R+K7tr81nnUrxKh/6Dqm64V2mi7pq+SCgC8kHr4O2QRKBEgUD8N/3PlSzxreoHTfe9Hn2J/P5EK1I8Q+hQPv8/gI3DuwvFDdGcSgb6Iww9R9GiBMuLjL+NRogSqm2PWuUPe7LPSKnA+YvFDHK1DwSbQUOCHaKIESsTg20ZhHglGgYvnsucX7SVUgOzzv8P0Z9ALVFdqvhBX/WzQCuSRS589Om3CoBP426XgC7H78xM4Be17IbHXbJGqwF8yPhio30ARyBN9/yl2yjjYClRJxt8nuu1c2AokmH/ruNoFyNcfNRqbwCU9X4iLWaAkXf9N0ZZGAcL9zxaFSeALA2CKRi9w/hZfiLNOoCLJv/ziWGkEbt/jC3FTBUp0/hsSslQEkPl/aDy2Av13+UL0G4EvLQGfKNYCqaagZWCdVwKJNuGd5XDRLQXqRPw8y80G9UIgzRQY0x9zhv34CJzS8TPLNzjNAveEfFjjTQb3WSBFHrxIP00G+7dAiiG4Sn9NBvVL4JmYbzR4TgIVfSKmpP/6kdhWowD9NqAePwybfT8KkGdiGv6P/iebUYB6H/LnDzuSyCriTCSAL2QFAsRDIIQ/DAJBPATC+DAIBO1OHMiHPVlklKtAKF+0mcg5+QLwhBtBBB/wv6x8wJNNgig+4KlqMnF8wBPNwkg+4F07gfTKFmL5gD84+JfMY5hG8wFvzwflUFFyGsTzAW9dCOVU0XIYIPiAt23G8l1Rsxpg+IC3CMhPRc9igOID3vwnkMuKotEAxwe8cRDKdUXTYIDkA940DeX2nktrgOUD3rQQ/Si/WWOA5gPetBQf1csNxQDPB7xxM3IbEPABb96OXQYUfMBbZrjdgIQPeFtKZjOg4QPempQejAZEfMDb03KTARW/dR5M9AZU/PFg4shKdQYFFX88mrkOpxoDNSL54+HUeTz3MIjlj8dzd4HCaRDLnwoUHudzh0E0/1Wi8ahQWA3i+a8ilU+ZzmKA4L/KdF6FSqMBgv8uVPqVag0GGP5cqvUrVmsNUPy5WO1ZrtcYoPiLcr3nhYVigOMvLix8r2w2Bkj+4srG+8ZgZYDkry6tvIuFCwMsf3Vt539xORtg+ZuLS/+S+csAzd9c3QaUrEcDNF+5vA64uwQDPF+5vg9pYDjgmy00DQzsLRz8TSzsbTz8jUz8rVz8zWzs7Xz8DY38LZ38Ta3sbb38jc38rd38ze387f38Dxwy9iceGf8jF/5nPhn7Q6eM/6kX/2O3jP253xDMDx6HYH7yOQTzo9chmJ/9jsH78HkM5qffswTf4/c5CJ///wNpMi/PcqmqXgAAAABJRU5ErkJggg=='
}
