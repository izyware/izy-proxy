
// TODO: should be launch-able from the cli (i.e. node test.js config.1.2, ... )
// repeatable pattern and use the the izy-test framework. similar to izy-pop3
var modtask = function (config) {
	modtask.verbose = config.verbose || 0;
	modtask.Log('Test');
	console.log('Config:', config);
	modtask.ldmod(`rel:test/${config.testtype}`)(config, cb);
};
