
var modtask = 
{
	externalPathResolver : function(modtask) 
	{
		var currentdir = 'rel:/';
		try { 
			currentdir = process.cwd() + '/';
		} catch(e) { } 

		return [
			// dirname would be node_module/node_modules/izymodtask
			__dirname + '/../../',
			currentdir,
			currentdir + 'node_modules/',
			currentdir + 'node_modules/izymodtask/',
			currentdir + '../',
			currentdir + 'node_modules/izy-circus/',
			currentdir + '../configs/izy-proxy/plugin/apigateway/',
			'rel:/',
			'rel:/../thirdparty/',
			'rel:/../../'
		];			
	} 
}


