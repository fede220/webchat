// Require dependencies
var connect = require('connect');
var http = require('http');
var app = connect();
 
app.use(connect.static(__dirname + "/static"));
app.use(handler);

// creating the server ( localhost:8000 )
var server = http.createServer(app).listen(8000);

var fs = require('fs');
var io = require('socket.io').listen(server);
 
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
}
 
// creating a new websocket to keep the content updated without any AJAX request
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
