"use strict";

var uncaughtException = function(err) {
  var message = err.message;
  message = '[uncaughtException -- server system should have caught this] ' + (message || '');
	console.log(message);
};
process.on('uncaughtException', uncaughtException);

require('./server').run();
