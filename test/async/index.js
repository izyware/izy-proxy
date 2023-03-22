module.exports = cb => {
  /* make sure this never throws -- we are not handling rejected promise from outside */
  async function performAsyncTest() {
    try {
      const run = require('../../asyncio')(module).run;
      try {
        for(var i=0; i < 3; ++i) {
          let { status } = await run('net.httprequest', {
            url: 'http://bad.url.o.r.g',
            resolveErrorAsStatusCode: 601
          });
          if (status != 601) return cb({ reason: 'status is not 601. it is: ' + status });
        }
        cb({ success: true });
      } catch(e) {
        cb(e);
      }
    } catch(e) {
      cb({ reason: e });
    }
  }
  performAsyncTest();
};
