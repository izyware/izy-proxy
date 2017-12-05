"use strict";

module.exports = function (config, pluginName) {
  var _circus = require('izy-circus');
  var outcome = _circus.factory(config);
  return outcome;
};
