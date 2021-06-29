var modtask = function() {};
modtask.SHIP = function() {
	var entrypoint = 'izymodtask/entrypoint';
	modtask.ldmod('g_packer').pakfuscatedisabled(true);
	var js = modtask.ldmod('codegen/gen').sp('verbose', true).genCustomePayload(
		entrypoint, // TOKEN_ROOTMODULE -- see modtask/minicore
		'host/nodejs/base', // TOKEN_HOSTINGMODULE -- see modtask/minicore
		'onSystemStart();return Kernel;})();', // callbackcode
		// extramodulestoinclude
		[
			// This is needed by Kernel (minicore) when processing ldmod('rel:...')
			['modtask', 'kernel/path'],
			// needed by izy-proxy/features/v2/chain/processors/runpkg
			['modtask', 'kernel/mod'],
			// baseline
			['modtask', 'core/datetime'],
			['modtask', 'core/string'],
			['modtask', 'ui/node/auth'],

		],
		false // Config
	);

	js = 'module.exports = (function() { ' + js;

	modtask.file = modtask.ldmod('file');

	var payloaddir = modtask.ldmod('deploy/paths').getTempBuildDir(entrypoint);
	var payloadfile = modtask.file.pathCombine(payloaddir, 'ljs.js');
	modtask.file.forceWriteFile(payloadfile, js);
	console.log('payloadfile', payloadfile);
};

