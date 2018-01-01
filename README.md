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

### Run
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

#### IZY TIP
When upgrading or deploying a node (ec2-node or a docker container), you should deep clone the directory as a backup and switch back/forth with pm2 until things work:

```
mkdir ~izyware_backup
cp -r ~/izyware/* ~/izyware_backup/
pm2 stop 1
pm2 start 2
.... update ~/izyware/ ...
```

Notice that you should put your containers behind a load balancer (i.e. AWS elb) to avoid ending up with broken connections.

## Configuration for the artifact

The server expects the configuration file to be at:

```
../configs/izy-proxy/config.js relative to app.js
```

so in the example above, the config.js would go in:

```
node_modules/configs/izy-proxy/config.js
````

It is best to keep the configurations in a seperate location and just copy them over as shown in the deployment section.

### Sample config.js file

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
		invokeAuthorization: 'access_token'
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

## Module Paths

If you wish to access izy modules from the file system, you may customize the module path resolution rulesets defined in:

```
izy-proxy/modtask/config/kernel/extstores/file.js
```

Please refer to the comments in the file to understand how to reference external modules.

## NOTE
for more details, visit https://izyware.com
