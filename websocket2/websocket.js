var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var redis = require('socket.io-redis');
var port = process.env.PORT || 3000;
var serverName = process.env.NAME || 'Unknown';
var instance =  parseInt(process.env.NODE_APP_INSTANCE || 0);


io.adapter(redis({ host: 'psetools_redis', port: 6379 }));

server.listen(port, function() {
  console.log('Server listening at port %d', port);
  console.log('Hello, I\'m %s, how can I help?', serverName);
});

app.all('/', function(req, res) {
	res.header('Access-Control-Allow-Origin', '*');
	res.json({'success': true});
});

app.all('/emit', function(req, res) {

	res.header('Access-Control-Allow-Origin', '*');

	var room  	= req.query.room;
	var event 	= req.query.event;
	var data  	= req.query.data;

	try {
		data = JSON.parse(data);
	} catch (e) {
		data = req.query.data;
	}

	if (room) {
		console.log(serverName, room, event, data);
		io.sockets.in(room).emit(event, data);
	} else {
		console.log(serverName, event, data);
		io.sockets.emit(event, data);
	}

	res.json({
		'success': true,
		'server': serverName,
		'instance': instance,
	});

});

io.on('connection', function(socket) {

	console.log('a connection has been created: ' + io.engine.clientsCount);

	socket.on('subscribe', function(room) { 
		console.log('joining room', room);
		socket.join(room);
	});

	socket.on('unsubscribe', function(room) {  
		console.log('leaving room', room);
		socket.leave(room);
	});

	socket.on('disconnect', function() {
		console.log('a connection has been terminated: ' + io.engine.clientsCount);
	});

	// PSE TOOLS
	socket.stock  		= null;
	socket.marketdepth  = null;
	socket.charts 		= {};
	socket.charts2 		= {};
	socket.charts3 		= [];

	socket.on('stock', function(newValue, callback) {

		if (newValue != socket.stock) {
			
			if (socket.stock && newValue) {
				socket.leave(socket.stock);
				socket.stock = null;
			}

			if (newValue) {
				socket.join(newValue);
				socket.stock = newValue;
			}

		}

		var response = {success: true};

		if (callback) callback(response);

	});

	socket.on('subscribeMarketdepth', function(stock) {

		if (socket.marketdepth != stock) {
			
			if (socket.marketdepth && stock) {
				socket.leave(socket.marketdepth);
				socket.marketdepth = null;
			}

			if (stock) {
				socket.join(stock);
				socket.marketdepth = stock;
			}

		}

	});

	socket.on('subscribeBars', function(listenerGuid, callback) { 
		if (socket.charts.hasOwnProperty(listenerGuid)) {
		    return;
		}
		socket.charts[listenerGuid] = listenerGuid;
		socket.join(listenerGuid);
	});

	socket.on('unsubscribeBars', function(listenerGuid) {  
		if (socket.charts.hasOwnProperty(listenerGuid)) {
        	delete socket.charts[listenerGuid];
			socket.leave(listenerGuid);
        }
	});

	socket.on('subscribeBars2', function(listenerGuid, callback) { 

		if (socket.charts2.hasOwnProperty(listenerGuid)) {
			socket.charts2[listenerGuid]++;
		    return;
		}

		socket.charts2[listenerGuid] = 1;

		socket.join(listenerGuid);

	});

	socket.on('unsubscribeBars2', function(listenerGuid) {  
		if (socket.charts2.hasOwnProperty(listenerGuid)) {

			socket.charts2[listenerGuid]--;

			if (socket.charts2[listenerGuid] <= 0) {

				socket.leave(listenerGuid);

	        	delete socket.charts2[listenerGuid];

			}

        }
	});

	socket.on('subscribeBars3', function(listenerGuid, id) { 

		if (socket.charts3.hasOwnProperty(listenerGuid)) {
			socket.charts3[listenerGuid].push(id);
			socket.charts3[listenerGuid].reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
		    return;
		}

		socket.join(listenerGuid);

		socket.charts3[listenerGuid] = [id];

	});

	socket.on('unsubscribeBars3', function(listenerGuid, id) {  
		if (socket.charts3.hasOwnProperty(listenerGuid)) {
			
			socket.charts3[listenerGuid] = socket.charts3[listenerGuid].filter(function(item) { 
			    return item !== id;
			});

			if (socket.charts3[listenerGuid].length == 0) {

				socket.leave(listenerGuid);

	        	delete socket.charts3[listenerGuid];

			}

        }
	});

});