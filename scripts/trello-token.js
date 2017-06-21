var slackMsgs = require('./slackMsgs.js');
var url = require('url');
var key = process.env.HUBOT_TRELLO_KEY;

module.exports = function (robot) {

	robot.respond(/trello get token/i, function (res_r) {


		let scope = 'read,write,account';
		let name = 'Hubot';
		let expr = '30days';
		let cb_method = 'postMessage';
		let return_url = 'https://andreasbot.herokuapp.com/hubot/trello-token';
		let url = `https://trello.com/1/authorize?expiration=${expr}&name=${name}&scope=${scope}&key=${key}&response_type=token&callback_method=${cb_method}&return_url=${return_url}`;
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
		// TODO: do something with the token 
		// robot.logger.info(res.fragment);	// undefined
		// var type = window.location.hash.substr(1);
		// robot.logger.info(type);


		res.send(`<h2>Token succesfuly received. You can now close the window.</h2>\n
		<form>
<input type="button" value="Click to Close" onclick="window.close()'" />
</form>`);
	});

	robot.respond(/trello add token (.*)/i, function (res_r) {
		var token = res_r.match[1];
		//***IMPORTANT*** 
		// the .env assignment doesnt work with HEROKU!
		// must set up a heroku client and communicate through their api 
		process.env['HUBOT_TRELLO_TOKEN'] = token;
	})



	var html = `
<button onclick=window.open(${url})>open</button>
<button onclick=window.close()>close</button>  
`;
	robot.router.get('/hubot/html', function (req, res) {
        res.send(html);
    })
}