var modtask = function() {};
modtask.loadById = function(queryObject, cb) {
    var id = queryObject.id;
    if (!id) return cb({ reason: 'please specify either an object or a string to loadById' });
    try {
        if (typeof(id) == 'string') {
            id = JSON.parse(require('fs').readFileSync(id));
        }
        cb({ success: true, data: id });
    } catch(e) {
        cb({ reason: e.message });
    }
}
