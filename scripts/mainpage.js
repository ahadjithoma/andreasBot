module.exports = { html: function (){
    
var k = `<html><body><h2>Hello Human! My name is Hubot</h2><p>Feel free to look around</p><img src="https://camo.githubusercontent.com/ed121c7a3cfcf27c2661490af67ea4aee6305d56/687474703a2f2f692e696d6775722e636f6d2f4e685471655a322e706e67" alt="github logo"><br><br><br>
<button onClick=window.close()>Close</button><br>

<p id="demo"></p>
<script>
document.getElementById("demo").innerHTML = 
"The full URL of this page is:<br>" + window.location.href;
</script>
<a href="https://trello.com/1/authorize?expiration=30days&name=Hubot&scope=read,write,account&key=51def9cb08cf171cd0970d8607ad8f97&response_type=token&callback_method=postMessage&return_url=https://andreasbot.herokuapp.com/hubot/trello-token" target="popup">Auth here!</a> 
<a href="../html-link.htm" target="popup" onclick="window.open('https://trello.com/1/authorize?expiration=30days&name=Hubot&scope=read,write,account&key=51def9cb08cf171cd0970d8607ad8f97&response_type=token&callback_method=postMessage&return_url=https://andreasbot.herokuapp.com/hubot/trello-token','name','width=600,height=400')">auth popup</a>
</body></html>`
return k;
}
}