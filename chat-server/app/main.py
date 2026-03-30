import socketio
from app.app_factory import create_api_app
from app.realtime.socket_server import sio


api = create_api_app()
app = socketio.ASGIApp(sio, api, socketio_path="/socket.io")
