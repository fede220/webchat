// Require dependencies
var connect = require('connect');
 

// creating the server ( localhost:8000 )

var fs = require('fs');
//var io = require('socket.io').listen(server);
 
// on server started we can load our client.html page
function handler(req, res) {
  fs.readFile(__dirname + '/client.html', function(err, data) {
    if(err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading client.html');
    }
    res.writeHead(200);
    res.end(data);
  });
  console.log('Done handler');
}
 
function startServer() {
	var app = connect.createServer();
	app.use(connect.static(__dirname + "/static"));
	app.use(handler);
	var http = require('http').createServer(app);
	var sockJs = require('sockjs').createServer();

	sockJs.on('connection', onConnection);
	sockJs.installHandlers(http, {
		sockjs_url: 'http://localhost:8000/res/sockjs-0.3.2.min.js',
		prefix: '/sockjs',
		jsessionid: false,
		log: sockJsLog,
	});
	http.listen(8000);
}

var broadcast = {};
var nicknames = {};

function doBroadcast(msg) {
	for(var id in broadcast) {
		broadcast[id].write(msg);
	}
}
function onConnection(conn) {
	// maintain our broadcast list
	broadcast[conn.id] = conn;
	// echo back
	conn.on('data', function(message) {
		console.log('Raw Message:' + message);
		var msg = JSON.parse(message);
		switch(msg.msg_type) {
			case 'set_nickname':
				var nickname = msg.content;
				nicknames[conn.id] = nickname;
				var connected_msg = '<b>' + nickname + ' is now connected.</b>';
				doBroadcast(connected_msg);
				break;
			case 'chat':
				var chatMsg = '<b>' + nicknames[conn.id] + '</b>:' + msg.content;
				doBroadcast(chatMsg);
				break;
			default:
				console.warn("Unknown message type received: " + msg.msg_type);
		}
	});
	// do nothing
	conn.on('close', function() {
		console.log('    [-] broadcast close connection:' + conn);
		var disconnectMsg = '<span class="dc">***' + nicknames[conn.id] + ' DISCONNECTED***</span>';
		delete broadcast[conn.id];
		delete nicknames[conn.id];
		doBroadcast(disconnectMsg);
	});
}

function sockJsLog(sev, msg) {
	if (sev != 'debug' && sev != 'info') {
		console.error(msg);
//	else if (config.DEBUG)
	} else {
		console.log(msg);
	}
}

// creating a new websocket to keep the content updated without any AJAX request
/*
io.sockets.on('connection', function(socket) {
 
  socket.on('set nickname', function(nickname) {
    // Save a variable 'nickname'
    socket.set('nickname', nickname, function() {
      console.log('Connect', nickname);
      var connected_msg = '<b>' + nickname + ' is now connected.</b>';
 
      io.sockets.volatile.emit('broadcast_msg', connected_msg);
    });
  });
 
  socket.on('emit_msg', function (msg) {
    // Get the variable 'nickname'
    socket.get('nickname', function (err, nickname) {
      console.log('Chat message by', nickname);
      io.sockets.volatile.emit( 'broadcast_msg' , nickname + ': ' + msg );
    });
  });
 
  // Handle disconnection of clients
  socket.on('disconnect', function () {
    socket.get('nickname', function (err, nickname) {
      console.log('Disconnect', nickname);
      var disconnected_msg = '<b>' + nickname + ' has disconnected.</b>'
 
      // Broadcast to all users the disconnection message
      io.sockets.volatile.emit( 'broadcast_msg' , disconnected_msg);
    });
  });
});
*/


if (require.main === module) {
	startServer();
}

