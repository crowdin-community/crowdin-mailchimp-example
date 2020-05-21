const io = require('socket.io')();

io.on('connection', (socket) => {
  socket.on('createTunnel', (data) => {
    socket.join(data.tunnelId);
  });
});

const emitEvent = (message, res) => {
  const {domain, aud, context: { project_id }} = res.origin;
  io.to(`${domain}__${aud}__${project_id}`).emit('message', message);
};

module.exports = {io, emitEvent};