extends Control

const CardStack = preload("res://scenes/game/cardstack.tscn")
const Enemy = preload("res://scenes/game/enemy.tscn")

@onready var pool_cards = $CardStacks/PoolCards
@onready var used_cards = $CardStacks/UsedCards
@onready var hand_cards: HBoxContainer = $HandCards
@onready var enemies: HBoxContainer = $Enemies
@onready var special_card = $SpecialCard
@onready var timer_label: Label = $TimerLabel
@onready var timer: Timer = $Timer

var hand_card_ui_nodes = {}
var enemy
var total_seconds = 5*60
var time_left: int
var game_over = false

func _ready() -> void:
	pool_cards.pressed.connect(_on_draw_pressed)
	var session_id = NetworkManager.room.get_session_id()
	var player = NetworkManager.room.state.players[session_id]
	for hand_card in player.handCards:
		_add_hand_card(hand_card)
	NetworkManager.room.message_received.connect(_message_received)
	var current_enemy = NetworkManager.room.state.currentEnemy
	enemy = Enemy.instantiate()
	enemies.add_child(enemy)
	enemy.setup(current_enemy)
	special_card.pressed.connect(_on_special_pressed)
	# timer
	time_left = total_seconds
	timer.timeout.connect(_on_timeout)
	update_label()
	NetworkManager.room.state_changed.connect(_state_changed)

func _message_received(type, message) -> void:
	print("Message received: ", type)
	if type == "played_card":
		var id = int(message.id)
		_remove_hand_card(id)
	if type == "updated_enemy":
		print("Updated enemy")
		enemy.setup(message)
	if type == "drawn_card":
		_add_hand_card(message)
	if type == "frozen":
		print("frozen")
		timer.stop()
	if type == "unfrozen":
		print("unfrozen")
		timer.start()
	if type == "game_over":
		game_over = true

func _on_draw_pressed() -> void:
	print("Draw card pressed")
	if game_over:
		return
	NetworkManager.room.send_message("draw")

func _add_hand_card(hand_card) -> void:
	print("Adding handcard ", hand_card)
	var card = CardFactory.create_card(hand_card.type)
	card.pressed.connect(_on_hand_card_pressed.bind(hand_card))
	hand_cards.add_child(card)
	hand_card_ui_nodes[int(hand_card.id)] = card

func _remove_hand_card(id) -> void:
	print("Removing handcard ", id)
	if hand_card_ui_nodes.has(id):
		hand_card_ui_nodes[id].queue_free()
	hand_card_ui_nodes.erase(id)

func _on_hand_card_pressed(hand_card) -> void:
	print("Hand played ", hand_card)
	if game_over:
		return
	NetworkManager.room.send_message("play_card", { "id": hand_card.id })

func _on_special_pressed() -> void:
	print("Special played")
	if game_over:
		return
	NetworkManager.room.send_message("special")

func _on_timeout() -> void:
	if time_left > 0:
		time_left -= 1
		update_label()
		if time_left <= 0:
			timer.stop()
			print("Timer over")
			game_over = true

func update_label() -> void:
	timer_label.text = "Time: " + str(time_left) + "s"

func reset_timer(new_time: int = total_seconds) -> void:
	timer.stop()
	time_left = new_time
	update_label()
	timer.start()

func _state_changed() -> void:
	print("State changed")
