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
		switch(data.eventType){
			case 'push': 
				let repo_name 	= payload.repository.full_name;
				let branch 		= payload.repository.default_branch;
				let repo_url	= payload.repository.url + 	'/tree/' + branch;

				let commits 	= Object.keys(payload.commits).length;		 // get the total number of commits done
		
				if (adapter == 'slack'){
					let msg = slackMsgs.githubEvent();
					let attachment = slackMsgs.githubEvent().attachments[0];
					let i;
					
					attachment.pretext = `<${repo_url}|[${repo_name}:${branch}]> 1 new commit(s) by ${user_login}:`;
					attachment.title = '';		
					for (i=0; i<commits; i++){
						let user_name	= payload.commits[i].author.name;
						let user_login	= payload.commits[i].author.username;
						let commit_id 	= payload.commits[i].id.substr(0,7);		 // get the first 7 chars of the commit id
						let commit_msg	= payload.commits[i].messagek.split('\n',1); // get only the commit msg, not the description
						let commit_url  = payload.commits[id].url;			
						attachment.text = `<${commit_url}|`+'`'+`${commit_id}`+'`'+`>`+`${commit_msg} - <www.github.com/${user_login}|${user_name}>`;
						attachment.text = attachment.text + '\nnew msg here';
					}	
					msg.attachments.push(attachment);
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
					let msg 	= slackMsgs.githubEvent();
					let url 	= payload.deployment_status.target_url;
					let state   = payload.deployment_status.state;
					let creator	= payload.deployment_status.repository.owner.login;
					let repo 	= payload.deployment_status.repository.full_name; 
					msg.attachments[0].pretext = `[andreash92/andreasBot] created by ${creator}`;
					msg.attachments[0].title = `Deployment ${state}`;
					msg.attachments[0].text = ``;
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
