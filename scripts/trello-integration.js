module.exports = function(robot) {
    'use strict'

    var trello = require("node-trello");
    var slackmsg = require("./slackMsgs.js");

    // auth
    var key = process.env.HUBOT_TRELLO_KEY;
    var token = process.env.HUBOT_TRELLO_TOKEN;
    var t = new trello(key, token);

    robot.respond(/trello account name/i, function(res_r) {
        t.get("/1/members/me", function(err, data) {
            if (err) {
                //console.log(err);
                //throw err;
                res_r.send('Error: ' + err['responseBody']);
                return false;
            };
            //res_r.send(res);
            res_r.send(data['fullName']);
        });
    })


    /*******************************************************************/
    /*                            BOARDS                               */
    /*******************************************************************/

    // Associate a board with a specific Channel 
    robot.hear(/trello board (.*)/i, function(res_r) {
        let board = res_r.match[1];

        // TODO!

    })

    //GET /1/boards/[board_id]
    robot.hear(/trello board/i, function(res_r) {

        // TODO: fetch the board id from other source (env, redis or mongodb)
        let boardId = 'BE7seI7e';
        
        t.get("/1/board/"+boardId, {lists:"all"}, function(err, data){
            if (err){
                res_r.send('Error Encountered: '+ err['responseBody']);
                return false;
            } 

            // customize slack's interactive message 
            let msg = slackmsg.buttons();
            msg.text = `Board Name: *${data.name}*`;
            msg.attachments[0].text = `Board's Lists`;
            msg.attachments[0].callback_id = `trello_board`;

            // attach the board lists to buttons
            let listsNum = Object.keys(data.lists).length;
            for (var i=0; i<listsNum; i++){
                let list = data.lists[i].name;
                let item = {"name": list, "text": list,"type":"button", "value": list};
                msg.attachments[0].actions.push(item);
            }
            
            res_r.send(msg);
        })
    })

    /*******************************************************************/
    /*                             LISTS                               */
    /*******************************************************************/

    
    //GET /1/lists/[idList]
    robot.hear(/trello lists/i, function(res_r) {
        t.post("/1/lists/", function(err, data){
            if (err){
                res_r.send('Error Encountered: '+ err['responseBody']);
                return false;
            } 
            else {
                res_r.send(data.lists);
            }
        })
    })

    
    // robot.respond(/trello /i, function(res_r) {
    //     t.post("/1/", function(err, data){
    //         if (err){
    //             res_r.send('Error Encountered: '+ err['responseBody']);
    //         }
    //     })
    // })

    // robot.respond(/trello /i, function(res_r) {
    //     t.post("/1/", function(err, data){
    //         if (err){
    //             res_r.send('Error Encountered: '+ err['responseBody']);
    //         }
    //     })
    // })    

    // robot.respond(/trello /i, function(res_r) {
    //     t.post("/1/", function(err, data){
    //         if (err){
    //             res_r.send('Error Encountered: '+ err['responseBody']);
    //         }
    //     })
    // })




    /*/
    /// TODO: add more functionality 
    /*/
}