var modtask = function() {}

modtask.parseStr = function(uristr) {
    var uri = {
        "scheme": "",
        "authority": "",
        "path": "",
        "query": "",
        "fragment": "",
        "fullpath": ""
    };
    uristr += "";
    uristr = uristr.replace(/^\s*/i, '');
    uri.scheme = uristr.match(/^(http|https|ftp):\/\//i);
    if (uri.scheme != null) {
        uri.scheme = uri.scheme[0].toLowerCase();
        uri.scheme = uri.scheme.substr(0, uri.scheme.length - 3);
    } else {
        uri.scheme = "";
    }
    uri.authority = uristr.replace(new RegExp('^(http:|https:|ftp:)?(\/\/)' + modtask.authority(3) + '(\/)?(.*)', 'i'), '$3');
    if (uri.authority == uristr) uri.authority = "";
    if (uri.scheme + "://" + uri.authority == uristr) {
        uri["path"] = "/";
        uri["fullpath"] = "/";
    } else {
        uri["fullpath"] = uristr.replace(new RegExp('^(http:|https:|ftp:)?(\/\/)' + modtask.authority(3) + '(\/)?' + modtask.path(5) + '?(.*)', 'i'), '$4$5$6');
        //  preg_replace('/^(http:|https:|ftp:)?(\/\/)' . $this->authority(3) . '?(\/)' . $this->path(5) . '?(.*)/i', '\4\5\6', $uristr); 
        uri["path"] = uristr.replace(new RegExp('^(http:|https:|ftp:)?(\/\/)' + modtask.authority(3) + '(/)?' + modtask.path(5) + '?(.*)', 'i'), '$4$5');
        uri["path"] = uri["path"].replace(/#.*/i, "");
        //  preg_replace('/^(http:|https:|ftp:)?(\/\/)' . $this->authority(3) . '?(\/)' . $this->path(5) . '?(.*)/i', '\4\5', $uristr); 
        uri["query"] = uristr.replace(new RegExp('^(http:|https:|ftp:)?(\/\/)' + modtask.authority(3) + '(/)?' + modtask.path(5) + '?(.*)', 'i'), '$6');
        //  preg_replace('/^(http:|https:|ftp:)?(\/\/)' . $this->authority(3) . '?(\/)' . $this->path(5) . '?(.*)?/i', '\6', $uristr); 
        if (uri["query"] == uristr) uri["query"] = "";
        uri["query"] = uri["query"].replace(/^\?/i, "");
        if (uri["query"] == "") {
            uri["fragment"] = uristr.replace(new RegExp('^(http:|https:|ftp:)?(\/\/)' + modtask.authority(3) + '(/)?' + modtask.path(5) + '#(.*)', 'i'), '$6');
            if (uri["fragment"] == uristr)
                uri["fragment"] = "";
        } else {
            if (uri["query"].indexOf("#") >= 0) {
                uri["fragment"] = uri["query"].replace(/.*#/i, "");
                uri["query"] = uri["query"].replace(/#.*/i, "");
            }
        }
    }
    return uri;
};

modtask.authority = function(helper) {
    return '([A-Za-z0-9-\.:\u00BF-\u1FFF\u2C00-\uD7FF\]*)';
};

modtask.path = function(helper) {
    return '([/A-Za-z0-9.`()"\'=&#!*;:@+$,[\\]~:%_<>^\\\\{}|-]*)'; 
};
