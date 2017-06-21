module.exports = function(robot) {

  	robot.respond(/trello get token/i, function(res_r) {
	
		var slackMsgs = require('./slackMsgs.js');				

		var key = process.env.HUBOT_TRELLO_KEY;

		let scope = 'read,write,account';
		let name = 'Hubot';
		let expr = '30days';
		let cb_method = '';
		let return_url = '';
		let url = `https://trello.com/1/authorize?expiration=${expr}&name=${name}&scope=${scope}&key=${key}&response_type=token`;
//https://trello.com/1/authorize?expiration=never&name=SinglePurposeToken&key=51def9cb08cf171cd0970d8607ad8f97&callback_method=fragment&return_url=https://andreasbot.herokuapp.com/hubot/trello-token
		var msg = slackMsgs.basicMessage();

		msg.attachments[0].pretext = "Please get a token to authorize your Trello account";
		msg.attachments[0].title = "Trello Token"; 
		msg.attachments[0].title_link = url; 
		msg.attachments[0].text = "Copy the token from the link above and run\n *trello add token <YOUR TOKEN>*";
		msg.attachments[0].footer = "Trello";
		msg.attachments[0].footer_icon = "https://d2k1ftgv7pobq7.cloudfront.net/meta/u/res/images/b428584f224c42e98d158dad366351b0/trello-mark-blue.png";
		res_r.send(msg);
	})

    robot.router.get('/hubot/trello-token', function (req, res) {
        let headers = JSON.stringify(req.headers);  
        robot.logger.info(`trello-webhook POST. Status Code: ${res.statusCode}\nHeaders: ${headers}`);
        robot.logger.info(res);
		robot.emit("trello-webhook-event", req, res);
        res.send(200);
    });

  	robot.respond(/trello add token (.*)/i, function(res_r) {
  		var token = res_r.match[1];
  		//***IMPORTANT*** 
  		// the .env assignment doesnt work with HEROKU!
		// must set up a heroku client and communicate through their api 
  		process.env['HUBOT_TRELLO_TOKEN'] = token;
  	})
}