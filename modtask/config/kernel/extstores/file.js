
var modtask = 
{
	externalPathResolver : function(modtask) 
	{
		var currentdir = 'rel:/';
		try { 
			currentdir = process.cwd() + '/';
		} catch(e) { } 

		return [
			// dirname will always be pointing to 'a' directory for *izymodtask* node module because we *always* require('izymodtask')
			// however you should not make any assumptions about the tree structure becuase the node runtime may load izymodtask from a
			// variety of locations.
			// We need this here for access to standard modules likes kernel\\path, etc.
			__dirname + '/',
			currentdir,
			currentdir + 'node_modules/',
			currentdir + 'node_modules/izymodtask/',
			// When referenced from an external app
			currentdir + 'node_modules/izy-proxy/',
			currentdir + '../',
			// For the circus plug-in,
			currentdir + '../izy-circus/',
			// For the apigateway plug-in
			currentdir + '../configs/izy-proxy/plugin/apigateway/',
			'rel:/',
			'rel:/../thirdparty/',
			'rel:/../../'
		];			
	} 
}


