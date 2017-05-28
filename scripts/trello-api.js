'use strict'

var trello = require("node-trello");
var q = require('q');


// auth
var key = process.env.HUBOT_TRELLO_KEY;
var token = process.env.HUBOT_TRELLO_TOKEN;


var t = new trello(key, token);


module.exports ={ 

    /*******************************************************************/
    /*                              BOARDS                             */
    /*******************************************************************/

	getBoard: function(id, pars, callback){
        var deferred = q.defer();
        t.get("/1/board/"+id, pars, function(err, data){
			if (err) {
      		    deferred.reject(err);
	        };
            deferred.resolve(data);
	    });
        deferred.promise.nodeify(callback);
	    return deferred.promise;
	},

    /*******************************************************************/
    /*                              MEMBERS                            */
    /*******************************************************************/
	getMembers: function(id, pars, callback){
        var deferred = q.defer();
	    t.get("/1/members/"+id, function(err, data) {
	        if (err) {
      		    deferred.reject(err);
	        };
            deferred.resolve(data);
	    });
        deferred.promise.nodeify(callback);
	    return deferred.promise;
	},

    /*******************************************************************/
    /*                              LISTS                              */
    /*******************************************************************/
	getList: function(id, pars, callback){
		var deferred = q.defer();
		t.get("1/lists/"+id, pars, function(err, data){
			if (err){
				deferred.reject(err);
			};
			deferred.resolve(data);
		});
		deferred.promise.nodeify(callback);
		return deferred.promise;
	},



    /*******************************************************************/
    /*                         TESTING PURPOSES                        */
    /*******************************************************************/
	test: function(){
		var k;
		t.get("1/board/BE7seI7e",'', cb); 


		function cb(err, data){
			if (err){
				k = err;
			};
			console.log(`cb: ${data}`);
			return cb(data);	
		}
		console.log(`k - test: ${k}`);
		return k;
	}


}



