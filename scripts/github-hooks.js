url           = require('url');
querystring   = require('querystring');

debug = true;


module.exports = function(robot)  {
  robot.router.post('/hubot/github-hooks', function(req, res) {
	var error, eventBody, data;

	    try {
	      if (debug) {
	        robot.logger.info("Github post received: ", req);
	      }
	      eventBody = {
	        eventType: req.headers["x-github-event"],
	        signature: req.headers["X-Hub-Signature"],
	        deliveryId: req.headers["X-Github-Delivery"],
	        payload: req.body,
	        query: querystring.parse(url.parse(req.url).query)
	      };
	      robot.emit("github-repo-event", eventBody);
	    } catch (e) {
    	  res.send('You supplied invalid JSON to this endpoint.');
	      error = e;
	      robot.logger.error("Github repo webhook listener error: " + error.stack + ". Request: " + req.body);
	    }
	    return res.end("");


  });
}
