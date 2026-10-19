extends Control

@onready var player_list: GridContainer = $CenterContainer/VBoxContainer/PlayerList
@onready var room_label: Label = $CenterContainer/VBoxContainer/RoomLabel
var name_edit: LineEdit
var hero_select: OptionButton
var ready_check_box: CheckBox
var player_ui_nodes = {}

func _ready() -> void:
	NetworkManager.room.state_changed.connect(_on_state_changed)
	NetworkManager.callbacks.on_add("players", _add_player)
	NetworkManager.callbacks.on_remove("players", _remove_player)
	NetworkManager.callbacks.listen(
		"status",
		_on_room_state_changed)

func _add_player(player, session_id) -> void:
	print("Player added")
	var player_is_client = NetworkManager.room.get_session_id() == session_id
	if player_is_client:
		_add_client_player(player, session_id)
	else:
		_add_other_player(player, session_id)

func _add_client_player(player, session_id) -> void:
	name_edit = LineEdit.new()
	name_edit.custom_minimum_size.x = 300
	name_edit.text = player.name
	name_edit.text_changed.connect(_player_name_changed)
	player_list.add_child(name_edit)
	hero_select = OptionButton.new()
	hero_select.add_item("Mage")
	hero_select.add_item("Warrior")
	hero_select.item_selected.connect(_on_hero_selected)
	player_list.add_child(hero_select)
	ready_check_box = CheckBox.new()
	ready_check_box.text = "ready"
	ready_check_box.toggled.connect(_on_ready_changed)
	player_list.add_child(ready_check_box)
	NetworkManager.callbacks.listen(player, "isReady", func(is_ready, _prev):
		print("Client player ready changed ", is_ready)
		ready_check_box.button_pressed = is_ready
	)
	player_ui_nodes[session_id] = [name_edit, hero_select, ready_check_box]

func _add_other_player(player, session_id) -> void:
	var name_label = Label.new()
	name_label.text = player.name
	player_list.add_child(name_label)
	var hero_label = Label.new()
	hero_label.text = player.hero
	player_list.add_child(hero_label)
	var player_ready_check_box = CheckBox.new()
	player_list.add_child(player_ready_check_box)
	NetworkManager.callbacks.listen(player, "isReady", func(is_ready, _prev):
		print("Other player ready changed ", is_ready)
		player_ready_check_box.button_pressed = is_ready
	)
	player_ui_nodes[session_id] = [name_label, hero_label, player_ready_check_box]

func _remove_player(_player, session_id) -> void:
	if player_ui_nodes.has(session_id):
		for ui_element in player_ui_nodes[session_id]:
			ui_element.queue_free()
		player_ui_nodes.erase(session_id)

func _on_state_changed() -> void:
	# print(NetworkManager.room.state)
	if room_label.text == "":
		room_label.text = "Room code: " + NetworkManager.room.state.roomCode

func _player_name_changed(new_player_name: String) -> void:
	print("Player name changed to " + new_player_name)
	NetworkManager.room.send_message(
		"set_player_name",
		{ "name": new_player_name })

func _on_hero_selected(index: int) -> void:
	var hero_name = hero_select.get_item_text(index)
	NetworkManager.room.send_message(
		"select_hero",
		{ "name": hero_name })

func _on_ready_changed(is_ready) -> void:
	NetworkManager.room.send_message(
		"set_ready",
		is_ready)

func _on_room_state_changed(current_value, previous_value) -> void:
	print("room state changed from ", previous_value, " to ", current_value)
	if current_value == "PLAYING":
		get_tree().change_scene_to_file("res://scenes/game/game.tscn")
