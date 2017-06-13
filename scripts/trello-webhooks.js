debug = false;


module.exports = function(robot) {
  robot.router.post('/hubot/trello-webhooks', function(req, res) {
	var error;
	    try {
	      if (debug) {
	        robot.logger.info("trello post received: ", req);
	      }
	      res.send(200);
	      robot.emit("trello-webhook-event", req);
	    } catch (e) {
		  // res.send('You supplied invalid JSON to this endpoint.');
	      error = e;
	      robot.logger.error("trello-hooks.js error: " + error.stack + "**" + "\n");
	    }
	    return res.end("");
  });
}
