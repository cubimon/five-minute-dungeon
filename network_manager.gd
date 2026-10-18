extends Node

var client: Colyseus.Client
var room: Colyseus.Room
var callbacks: Colyseus.Callbacks

func connect_to_server() -> void:
	client = Colyseus.Client.new("ws://localhost:2567")

func create_room() -> void:
	if room:
		await room.leave()
	room = await client.join_or_create("game_room")
	callbacks = Colyseus.Callbacks.of(room)
	
func join_room(code) -> void:
	room = await client.join("game_room", { "room_code": code })
	callbacks = Colyseus.Callbacks.of(room)

func leave_room() -> void:
	if room:
		await room.leave()
