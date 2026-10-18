extends Control

@onready var create_button: Button = $CenterContainer/VBoxContainer/Create
@onready var join_button: Button = $CenterContainer/VBoxContainer/Join
@onready var room_code_edit: LineEdit = $CenterContainer/VBoxContainer/RoomCodeEdit

func _ready() -> void:
	join_button.pressed.connect(_on_join_button_pressed)
	create_button.pressed.connect(_on_create_button_pressed)
	NetworkManager.connect_to_server()

func _on_create_button_pressed() -> void:
	print("Creating new room")
	NetworkManager.create_room()
	get_tree().change_scene_to_file("res://scenes/lobby/lobby.tscn")

func _on_join_button_pressed() -> void:
	if not room_code_edit.is_visible_in_tree():
		room_code_edit.visible = true
		print("Showing room code edit to user")
		return
	print("Now joining room")
	var room_code = room_code_edit.text
	NetworkManager.join_room(room_code)
	get_tree().change_scene_to_file("res://scenes/lobby/lobby.tscn")
