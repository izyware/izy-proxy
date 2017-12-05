## izy-proxy
IZY Proxy server.


## Sample Config

Use the following as a guideline:

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

## NOTE
for more details, visit https://izyware.com
