url           = require('url');
querystring   = require('querystring');

debug = false;


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
	      res.send('json received');
	      robot.emit("github-webhook-event", eventBody);
	    } catch (e) {
		  // res.send('You supplied invalid JSON to this endpoint.');
	      error = e;
	      // robot.logger.error('Could not receive github response on github-hooks.js');	
	      robot.logger.error("github-hooks.js error: " + error.stack + " *\n");
	    }
	    return res.end("");


  });
}
