var modtask = function(chain) {
	var mod = modtask.ldmod('features/v2/pkg/run');
	chain([
		['chain.importProcessor', ':test/assert/chain'],

		['set', 'outcome', { success: true, data: mod.parseMethodOptionsFromInvokeString('///pkg:module?method&forcepackagereload=1&methodnotfoundstatus=404') }],
		['assert.value', { success: true, data: {
			invokeString: '///pkg:module',
			methodToCall: 'method',
			methodCallOptions: 'forcepackagereload=1&methodnotfoundstatus=404',
			methodCallOptionsObj: {
				forcepackagereload: '1',
				methodnotfoundstatus: '404'
			}
		}}],

		['set', 'outcome', { success: true, data: mod.parseMethodOptionsFromInvokeString('///pkg:module?method&forcepackagereload=1') }],
		['assert.value', { success: true, data: {
			invokeString: '///pkg:module',
			methodToCall: 'method',
			methodCallOptions: 'forcepackagereload=1',
			methodCallOptionsObj: {
				forcepackagereload: '1'
			}
		}}],

		['outcome', { success: true }],
	]);
}
