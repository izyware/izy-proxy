var modtask = function() {};
modtask.serialize = function(queryObject, cb) {
  var format = queryObject.format;
  var data  = queryObject.data;
  if (!data.length) format = 'json';
  switch(format) {
    case 'json':
      data = JSON.stringify(data, null, 2);
      break;
    case 'ssv':
      var lines = [];
      var props = {};
      var propNames = {};
      for(var p in data[0]) {
        propNames[p] = p;
        props[p] = p.length;
      }
      for (var i=0; i < data.length; ++i) {
        item = data[i];
        for(var p in item) {
          props[p] = Math.max(props[p], item[p].length);
        }
      };
      var pad = function(str, n) { 
        if (typeof(str) == 'object') {
          var ret = '';
          for(var p in str) {
            ret += pad(str[p], n[p]);
          }
          return ret;
        }
        while(str.length <= n) str += ' ';
        return str;
      }
      var ret = pad(propNames, props) + '\n';
      for(var i=0; i < data.length; ++i) {
        ret += '\n' + pad(data[i], props);
      }
      data = ret;
      break;  
    case 'tsv':
      var lines = [];
      var props = [];
      for(var p in data[0]) props.push(p);
      lines.push(props.join('\t'));
      for (var i=0; i < data.length; ++i) {
        item = data[i];
        var line = [];
        for(var p in item) line.push(item[p]);
        lines.push(line.join('\t'));
      };
      data = lines.join('\n');
      break;
    default:
      return cb({ reason: 'invalid serialization format: ' + format });
  }
  return cb({
    success: true,
    data: data
  });
}

