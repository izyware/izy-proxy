var modtask = function() {};
modtask.loadById = function(queryObject, cb) {
    var id = queryObject.id;
    try {
        if (typeof(id) == 'string') {
            id = JSON.parse(require('fs').readFileSync(id));
        }
        cb({ success: true, data: id });
    } catch(e) {
        cb({ reason: e.message });
    }
}
