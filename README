## izy-proxy
IZY Proxy server is part of the Izyware framework for building applications and services using the interactive tools.

It enables developers to focus on creating reusable user experiences instead of spending time building and maintaining code and infrastructure.

## Deployment Setup

### Requirements

You need npm > 3.10.6. The npm install behavior is different in earlier versions. The tool requires that all the node dependencies be installed in flat node_modules subdirectory.
If you happen to use an older version of npm, the work around is shown below:


### Build
To build an artifact for cloud deployment (i.e. docker container), in any clean subdirectory use:

```
mkdir ~/izyware (or any location you would like have izyware tools deployed to)
cd ~/izyware
npm init -f; npm install --save izy-proxy; mkdir -p node_modules/configs;
cp -r /myconfigs/repository/config_sample1/* node_modules/configs
```

If you are using npm < 3.10.6, you must also do:

```
cp -r node_modules/izy-proxy/node_modules/* node_modules/; cp -r node_modules/izy-circus/node_modules/* node_modules/;
```


### Update

```
cd ~/izyware;npm update
```

## Running

### HTTP Server Mode
```
cd node_modules/izy-proxy
node app.js (or if you are using pm2, do pm2 start app.js)
```

Make sure the the *cwd* for the server process is set to the location for the izy-proxy/app.js installation. This is important because the *cwd* is used in locating plugin, thirdparty modules and the configuration.

After the server is running, the following should work:
```
GET /izyproxystatus

status: 200
```

### TaskRunner Mode
You may also run the tool in the task runner configuration. Please make sure that the configuration file is setup properly.

```
cd node_modules/izy-proxy
node taskrunner.js (or if you are using pm2, do pm2 start taskrunner.js)
```

### IZY TIP
When upgrading or deploying a node (ec2-node or a docker container), you should deep clone the directory as a backup and switch back/forth with pm2 until things work:

```
mkdir ~/izyware_backup; cp -r ~/izyware/* ~/izyware_backup/
pm2 stop 1
pm2 start 2
.... update ~/izyware/ ...
```

Notice that you should put your containers behind a load balancer (i.e. AWS elb) to avoid ending up with broken connections.

### Container Deployment Configuration Verification For Enterprise Customers

Use the commandline interface to simulate calling the forgot-password POST api call from your enterprise container:

```
 node cli.js method verifyconfig api.email <youremail>
````

If everything is successful, you should be able to replicate the online behavior locally.

## Testing The Functionality
Since the izy-proxy contains a heterogeneous set of component, full testing will entail running each test piece seperately.

```
# Test the chaining engine functionality
node test/all.js
# Test the API plug-in
node cli.js method api api.path :test/api
```

## Configuration for the artifact

The HTTP server expects the configuration file to be at:

```
../configs/izy-proxy/config.js relative to app.js
```

so in the example above, the config.js would go in:

```
node_modules/configs/izy-proxy/config.js
````

It is best to keep the configurations in a seperate location and just copy them over as shown in the deployment section.


The Taskrunner expects the configuration file to be at:

```
../configs/izy-proxy/taskrunner.js relative to app.js
```

### Sample TaskRunner Server taskrunner.js config file

```
module.exports = {
    authenticate: {
        izyware_taskrunner_key_id: 'your_access_key',
        izyware_taskrunner_secret_access_key: 'your_secret_key'
    },
    izyware_runtime_id: 'your_izyware_runtime_id'
};
```

### Sample HTTP Server config.js file

```
module.exports = {
  port: {
    http: 80,
    https: 443
  },
  proxy: {
    timeoutInMs: 60000
  },
	// Array of plug-in definitions 
	plugins: [
	{
		// Only do this while developing plug-ins
		// This will reload the node modules for plug-in per request 
		reloadPerRequest: false, 
		name: 'apigateway',

		// invoke pkg prefix. If set it will allow server side extensibility
		// If you set this, it is STRONGLY recommended that you also enforce HTTP authentication (see Authorization below).
		// Only enable this if you fully under the security risks involved.
		invokePrefix: 'cryptokey',
		// the Authotization header to be used in a typical HTTP authentication scheme.
		// If you have Izy Identity Management system setup, set this to 'idm'
		invokeAuthorization: 'access_token',

		// *Optional* enable chain handler for APIs
		,chainHandlerMod: 'configs/izy-proxy/context'
	},
	{
		// case sensitive
		testUrl: '/izycircustest',

		// case in-sensitive
		acceptedPaths: [
			'/path1',
			'/',
			'/path2'
		],
		aliases: ['.domain_to_alias_to_izyware.com'],
		// Only do this while developing plug-ins
		// This will reload the node modules for plug-in per request 
		reloadPerRequest: false, 
		name: 'circus',
		bootstrapUrl: 'https://izyware.com/chrome_extension.js',
		cache: {
			folder: '/tmp/izy-circus'
		}
	}
	]
};
```


### Context Module For Chain Processing
Chain processing is optional and should be used when heterogeneous development across multiple platforms is needed.

To support chain processing in the izy-proxy container execution context, simply drop the chain handler module in the local file system and reference it from the api gateway config by the chainHandlerMod (see above).

The chain handler should be configued based on the following criteria:
* Security Context
* Network Configuration
* Performance Considerations

#### IZY TIP
When hosting on AWS, keep the chainhandler config options in the parameter store and sync it as part of deployment, i.e.:

```
scp -i ../servers/amazon/template/identity.pem ../configs/izy-proxy/context.js ec2-user@domain.com:/home/ec2-user/configs/izy-proxy/context.js
```

## Plugins

The tool has an extensive and powerful plugin system that allows you to very easily break your application up into isolated pieces of business logic, and reusable pieces.

### Creating a plugin

Create a plugin by cloning the `default` subfolder under the `plugin` directory. You must also register the plugin in the config file.

To automatically test the plug-ins below, send a GET request and expect 200 status code.

#### circus

To test this plug-in, try:

```
/testcircus
```

#### apigateway

To test this plug-in, try:

```
/apigateway/apigatewaytest%3Aviewer/top
```

#### default

 ```
 /favicon.ico
 ```

## Handling CORS

The serverObjs variable allows the plug-in modules to handle CORS. Note that to handle CORS a plug-in must:
* Handle the OPTIONS request from the browser. A sample response is provided in the OPTIONS
* Provide the Access-Control-Allow-XXX headers in each request

You should customize the Access-Control-Allow-XXX headers for your own business needs.

## Logging

There is an *optional* plug-in called logging. If you would like to remotely view the internal server logs (or view the entries from your your dashboard), you must enable it in the config:

```
{
	name: 'logging',
	reloadPerRequest: false,
	ipwhitelist: ['1.2.3.4']
}
```

Due to security requirements, you must whitelist the IP address in order to access the logging feature.


## sessionObjects
The plug-ins may use the sessionObjects to share states and parsed information across the canHandle and handle stages. This will allow for writing high performance plug-ins.

## Module Paths

If you wish to access izy modules from the file system, you may customize the module path resolution rulesets defined in:

```
izy-proxy/modtask/config/kernel/extstores/file.js
```

Please refer to the comments in the file to understand how to reference external modules.


## Simplified JSONIO apis
You can leverage this feature to create standard apis that send/recieve JSON objects. The advantages are:
* No need to manage the HTTP metadata and headers
* JSONIO api security context can be 'transported' and simulated by the IDE, thus making implementation very very easy.
* The end-points can be directly consumed from chains anywhere in the cloud.

By default, `doChain` is enabled inside the api module. A typical implementatin would look like:

```
var modtask = function() {}
modtask.__apiInterfaceType = 'jsonio';
modtask.processQueries = function(queryObject, cb) {
    modtask.doChain([
        ['nop'],
        ['frame_getnode', modtask],
        ['frame_importpkgs', ['sql/jsonnode']],
        ['frame_importpkgs', ['ui/node']],
        ['frame_importpkgs', ['encodedecode']],
        function(_push) {
        	...
        }
```

This can be consumed from anywhere in the cloud via chaining, i.e:

```
	['//cloud_cluster_addr/path/to/packge:module/handler', payload, modtask],
	function(_push) {
		console.log(modtask.outcome);
	}
```



## Bridging and consuming resources across different networks
Bridging and consuming resources across different networks can be difficult.  A common scenario is to integrate DBMS, files, etc. that are only accessable to the intranet or just the local computing resources (for example localhost) inside thirdparty web apps or SASS services. Izyware Proxy Component (izy-proxy) simplifies this process by exposing the heterogeneous resources via standard api gateway.

### Benefits Of Using the API Gateway
The major benefit is that by exposing the functionality as an api access point, it can then be pulled in any thirdparty app while controlling permissions and session management tasks automatically via the Izyware Framework.

### Recommended Configuration

The following solution is recommended:
* A running instance of izy-proxy INSIDE the intranet with access to the resources.
* A DNS entry that would resolve to the INTRANET IP ADDRESS of izy-proxy resource. e.g.

    	localhost.izyware.com		  127.0.0.1
    	intranetservice1.izyware.com  10.0.0.231
    	....

* SSL certificates corresponding to the DNS resources above: In most cases is not needed for the public facing izy-server instances where the HTTPS connections are handled by a load balancer. But in this scenarios, the izy-proxy instance should handle the HTTPS connection directly (see server.js):

     	../configs/izy-proxy/certificates/privatekey.pem

### Packaging
It is recommended that the functionality be organized and packaged as an izyware app. This approach will have the following benefits:

* A boilerplate app can be created (by cloning an existing one) which would immediately provide dashboard, toolbar, etc. features that can be accessed in the UI
* The app can be immediately used and integrated inside existing business workflows either via the api access points or via the frames/slides UI automation framework.

To make cloning and reusability easier, it is further recommended that the bridge functionality be implemented as a subpackage using the following scheme:


    app_name/bridge/api

For example, the sample app included with izy-proxy uses:

    apps/sample/bridge/api.js

This would result in the route:

    https://dnsentry.com/apigateway/%3Aapps/sample/bridge%3Aapi

## Using the Commandline Interface For Testing And Developing Chain-based APIs
While enterprise gold customers have access to Izyware Studio, the standard users can still use the command line to implement their chain based apis:

```
node cli.js method api api.path <path/to/api/module> api.queryObject.key1 value1 ...
```

the system will deserialize the api.queryObject.* into a JSON queryObject that gets passed into the JSONIO api handlers.

## Using the package to extend existing node apps

Setup the environment by:

```
npm install izy-proxy
mkdir -p modtask/config/kernel/extstores
cp ./node_modules/izy-proxy/modtask/config/kernel/extstores/file.js modtask/config/kernel/extstores/
```

You should then edit the modtask/config/kernel/extstores/file.js and add the hard coded and relative paths for the location of your repositories.

Finally you can do:

```
require('izy-proxy').doChain([
	['log', 'hello world'],
	['frame_importpkgs', 'izy.machinelearning.moduleSim'],
	....
]);
```

## Enabling your apps via the Izy-Chaining scripting environment
Your application functionality may be consumed via the universal scripting environment.

It is recommended that you expose the functionality via an importable chain module. As of version 2.0 the chaining library will support importing and registering new chain handlers.

## NOTE
for more details, visit https://izyware.com
