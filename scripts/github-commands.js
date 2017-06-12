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



	function pushEvent(payload){
		var	room = "random";
		var adapter = robot.adapterName;
		let repo_name 	= payload.repository.full_name;
		let branch 		= payload.repository.default_branch;
		let repo_url	= payload.repository.url + 	'/tree/' + branch;
		let compare_url	= payload.compare;
		let commits 	= Object.keys(payload.commits).length;		 // get the total number of commits done

		if (adapter == 'slack'){
			let msg = slackMsgs.githubEvent();
			let i;
			
			for (i=0; i<commits; i++){
				var user_login	= payload.commits[i].author.username;
				var user_name	= payload.commits[i].author.name;
				let commit_id 	= payload.commits[i].id.substr(0,7);		 // get the first 7 chars of the commit id
				let commit_msg	= payload.commits[i].message.split('\n',1); // get only the commit msg, not the description
				let commit_url  = payload.commits[i].url;		
				commit_id = "`" + commit_id + "`"; // add slack's msg format 	
				msg.attachments[0].text = msg.attachments[0].text + `\n<${commit_url}|${commit_id}> ${commit_msg}`;
			}	
			msg.attachments[0].pretext = `<${repo_url}|[${repo_name}:${branch}]> <${compare_url}|${commits} new commit(s)> by <www.github.com/${user_login}|${user_name}>:`;
			msg.attachments[0].color = '#0000ff'; // set color = blue
			robot.messageRoom(room, msg);

		} else {
			//TODO: send a msg in plain text for other chat platforms or add any other specific formats than slack's
			robot.messageRoom(room, "push event");	
		}	
	}

	function developmentStatusEvent(payload){
		var	room = "random";
		var adapter = robot.adapterName;
		if (adapter == 'slack'){
			let msg 		= slackMsgs.githubEvent();
			let target_url 	= payload.deployment_status.target_url;
			let repo_url	= payload.deployment_status.repository_url;
			let state  		= payload.deployment_status.state;
			let creator		= payload.deployment_status.creator.login;
			let repo 		= payload.repository.full_name; 
			let environment = payload.deployment.environment;
			msg.attachments[0].pretext = `<${repo_url}|[${repo}]> created by ${creator}`;
			msg.attachments[0].title = `Deployment ${state}`;
			msg.attachments[0].text = `<${target_url}|${environment}>`;
			if (state == 'pending'){
				msg.attachments[0].color = '#ff8533' // set color = orange
			} else if (state == 'success'){
				msg.attachments[0].color = '#00ff00' // set color = green 
			} else if (state == 'fail'){
				msg.attachments[0].color = '#0000ff' // set color = blue 
			} else {
				msg.attachments[0].color = '#ff0000' // set color = red 
			}
			robot.messageRoom(room, msg);	
		} else {
			robot.messageRoom(room, "deployment_status event");	
		}
	}

	function developmentEvent(payload){ 
		//TODO 
	};	

	function issuesEvent(payload){
		//under construction
		var	room 		= "random";
		var adapter 	= robot.adapterName;
		let repo 		= payload.repository.full_name;
		let repo_url 	= payload.repository.html_url;
		let action 		= payload.action;
		let issue_url   = payload.issue.url;
		let issue_num	= payload.issue.number;
		let issue_title = payload.issue.title;
		let issue_body	= payload.issue.body;
		let user 		= payload.issue.user.login;
		let labels 		= Object.keys(payload.issue.labels).length;

		if (adapter == 'slack'){
			let msg = slackMsgs.githubEvent();
			if (action == 'opened'){
				msg.attachments[0].pretext = `[${repo}] Issue ${action} by <www.github.com/${user}|${user}>`;
				msg.attachments[0].title = `<${issue_url}|#${issue_num} ${issue_title}>`;
				msg.attachments[0].text = `${issue_body}`;
			} else {
				msg.attachments[0].text = `<${repo_url}|[${repo}]> Issue <${issue_url}|#${issue_num} ${issue_title}> ${action} by <www.github.com/${user}|${user}>`;
			}

			// assign attachement color
			if (action.includes('open')){
				msg.attachments[0].color = '#00ff00'; // set color = green
			} else if (action.includes('close')){
				msg.attachments[0].color = '#ff0000'; // set color = red
			} else {
				msg.attachments[0].color = '#ff8533'; // set color = orange
			}			
			robot.messageRoom(room, msg);		
		
		} else {
			//todo: plain text
		} 
	};

	function issueCommentEvent(payload){
		//TODO
	};


	robot.on('github-webhook-event', function(data){

		switch(data.eventType){
			case 'push': 
				pushEvent(data.payload);
				break;
			
			case 'deployment': 
				developmentEvent(data.payload);	
				break;
			
			case 'deployment_status': 
				developmentStatusEvent(data.payload);
				break;
			case 'issues':
				issuesEvent(data.payload);
				break;
			case 'issue_comment':
				issueCommentEvent(data.payload);
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
