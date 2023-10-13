module.exports = function(moduleToAttach) {
  const seriesAsync = require('./index')(moduleToAttach).seriesAsync;
  return {
    run: async (action, queryObject) => seriesAsync([action, queryObject])
  };
};
