process.argv[2] = 'callpretty';
process.argv[3] = 'service?start';
process.argv[4] = 'queryObject.serviceComposeId';
process.argv[5] = `${__dirname}/service-compose.json`;
process.argv[6] = 'queryObject.service';
process.argv[7] = 'portforwarding';
require('../cli');
