/* izy-loadobject nodejs-require */
module.exports = function() {
  // Add header metadata to the incoming targets 
  const modtask = {};
  modtask.should = async queryObject => queryObject.url.match('/load-balaner');
  modtask.perform = async queryObject => {
    const { headers, bodyBase64 } = queryObject;
    headers['X-Forwarded-Port'] = '80';
    return { success: true, response: { headers, bodyBase64 }};
  }
};
module.exports.forcemodulereload = true;