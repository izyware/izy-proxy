module.exports = function(moduleToAttach) {
  const series = require('./index')(moduleToAttach).series;
  return {
    run: async function(action, queryObject) {
      return new Promise((resolve, reject) => {
        series([
          [action, queryObject],
          chain => resolve(chain.get('outcome'))
        ], outcomeFail => reject({ reason: outcomeFail.reason }));
      });
    }
  };
};
