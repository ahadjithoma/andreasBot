module.exports = function(robot) {

	'use strict';
	var slackMsgs = require('./slackMsgs.js');				

	/* set Github Account */
	var GitHubApi = require("github");
	//var Trello = require(https://api.trello.com/1/client.js?key=51def9cb08cf171cd0970d8607ad8f97);

	var github = new GitHubApi({
	    /* optional */
	    // debug: true,
	    // protocol: "https",
	    // host: "api.github.com", // should be api.github.com for GitHub
	    // //thPrefix: "/api/v3", // for some GHEs; none for GitHub
	    // headers: {
	    //     "user-agent": "My-Cool-GitHub-App" // GitHub is happy with a unique user agent
	    // },
	    // Promise: require('bluebird'),
	    // followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
	    // timeout: 5000
	});


    /* oauth autentication using github personal token */
	github.authenticate({
	    "type": "oauth",
	    "token": process.env.HUBOT_GITHUB_TOKEN
	})

    /* basic autentication using github's username & password */
	// github.authenticate({
	//     type: "basic",
	//     username: '',
	//     password: ''
	// });




	robot.on('github-webhook-event', function(data){
		// console.log(data);
		var room, adapter, payload;
		room = "random";

		adapter = robot.adapterName;

		payload = data.payload;
		console.log(data.payload.deployment_status.url);
		switch(data.eventType){
			case 'push': 
				if (adapter == 'slack'){
					let msg = slackMsgs.githubEvent();
					msg.attachments[0].pretext = `<http://www.google.com|[andreasBot:master]> 1 new commit by andreash92:`;
					msg.attachments[0].title = '';
					msg.attachments[0].text = `5070196 update gh - andreash92`;
					robot.messageRoom(room, msg);	
				} else {
					robot.messageRoom(room, "push event");	
				}
				break;
			
			case '~deployment': 
				if (adapter == 'slack'){
					let msg = slackMsgs.githubEvent();
					let url = data.payload.deployment_status.url;
					msg.attachments[0].title = `Deployment ${data.payload.deployment_status.url}`;
					msg.attachments[0].pretext = '';
					msg.attachments[0].text = `<${url}|[andreasBot:master]> 1 new commit by andreash92:`;
					robot.messageRoom(room, msg);	
				} else {
					robot.messageRoom(room, "deployment event");	
				}				
				break;
			
			case 'deployment_status': 
				if (adapter == 'slack'){
					let msg = slackMsgs.githubEvent();
					let url = payload.deployment_status.url;;
					msg.attachments[0].title = `Deployment ${payload.deployment_status}`;
					msg.attachments[0].pretext = '';
					msg.attachments[0].text = `<${url}|[andreasBot:master]> 1 new commit by andreash92:`;
					robot.messageRoom(room, msg);	
				} else {
					robot.messageRoom(room, "deployment_status event");	
				}
				break;
			case '':
				break;
			case '':
				break;
			case '':
				break;
			case '':
				break;
			case '':
				break;
			
			default: 
				robot.messageRoom(room, `event: ${data.eventType}`);	
				break;
		}
	})


	robot.respond(/gh hook/i, function(res_r) {

		github.repos.createHook({
			"owner":"andreash92",
			"repo":"andreasBot",
			"name":"andreasBot-hook",
			"config": {
			    "url": "https://andreasbot.herokuapp.com/hubot/github-hooks",
			    "content_type": "json"
  			}}, 
  			function(err, res){
  				if (err){
  					robot.logger.error(err);
  					return 0;
  				}
  				robot.logger.info(res);
		});

	})


	robot.respond(/gh followers (.*)/i, function(res_r) {
		var username = res_r.match[1];	
		github.users.getFollowersForUser({ 
			"username": username}, 
			function(err, res){
				if (err){
					res_r.send('Error: ' + JSON.parse(err).message);
					return false;
				}
				var jsonsize = Object.keys(res.data).length;

				let menu = slackMsgs.menu();
				let login;
				for (var i = 0; i < jsonsize; i++) {
					login = res.data[i].login;
					menu.attachments[0].actions[0]['options'].push({"text":login,"value":login});

      				//TODO: maybe sort them before display
      			}
				menu.attachments[0].text = "Followers of "+ "*" + username + "*";      			
      			menu.attachments[0].fallback = '';
      			menu.attachments[0].callback_id = 'followers_cb_id';
      			menu.attachments[0].actions[0].name=' ';
				menu.attachments[0].actions[0].text=' ';

				res_r.reply(menu);
			});	
	})

}
