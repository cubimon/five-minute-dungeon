extends Control

const CardStack = preload("res://scenes/game/cardstack.tscn")
const Enemy = preload("res://scenes/game/enemy.tscn")

@onready var pool_cards = $CardStacks/PoolCards
@onready var used_cards = $CardStacks/UsedCards
@onready var hand_cards: HBoxContainer = $HandCards
@onready var enemies: HBoxContainer = $Enemies

var hand_card_ui_nodes = {}
var enemy

func _ready() -> void:
	pool_cards.label.text = "Draw"
	used_cards.label.text = "Used cards"
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

func _on_draw_pressed() -> void:
	print("Draw card pressed")
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
	NetworkManager.room.send_message("play_card", { "id": hand_card.id })
