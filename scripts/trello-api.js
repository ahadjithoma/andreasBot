'use strict'

var trello = require("node-trello");
var q = require('q');


// auth
var key = process.env.HUBOT_TRELLO_KEY;
var token = process.env.HUBOT_TRELLO_TOKEN;


var t = new trello(key, token);


module.exports ={ 

	/* MEMBERS */

	members_me: function(n, cb){
        var deferred = q.defer();
	    t.get("/1/members/me", function(err, data) {
	        if (err) {
      		    deferred.reject(err);
	        };
            deferred.resolve(data);
	    });
        deferred.promise.nodeify(cb);
	    return deferred.promise;
	},

	/* LISTS */


}



