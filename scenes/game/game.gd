extends Control

const CardStack = preload("res://scenes/game/cardstack.tscn")
const Enemy = preload("res://scenes/game/enemy.tscn")

@onready var hand_cards: HBoxContainer = $HandCards
@onready var enemies: HBoxContainer = $Enemies

var hand_card_ui_nodes = {}
var enemy

func _ready() -> void:
	var session_id = NetworkManager.room.get_session_id()
	var player = NetworkManager.room.state.players[session_id]
	for hand_card in player.handCards:
		print("Adding handcard ", hand_card)
		var card = CardFactory.create_card(hand_card.type)
		card.pressed.connect(_on_hand_card_pressed.bind(hand_card))
		hand_cards.add_child(card)
		hand_card_ui_nodes[int(hand_card.id)] = card
	NetworkManager.room.message_received.connect(_message_received)
	var current_enemy = NetworkManager.room.state.currentEnemy
	NetworkManager.callbacks.listen("currentEnemy", _enemy_changed)
	NetworkManager.callbacks.listen(current_enemy, "requirements", _enemy_changed)
	enemy = Enemy.instantiate()
	enemies.add_child(enemy)
	enemy.setup(current_enemy)

func _enemy_changed() -> void:
	print("enemy changed")

func _message_received(type, message) -> void:
	print("Message received: ", type)
	if type == "played_card":
		var id = int(message.id)
		print("Played card ", id)
		if hand_card_ui_nodes.has(id):
			hand_card_ui_nodes[id].queue_free()
		hand_card_ui_nodes.erase(id)
	if type == "updated_enemy":
		print("Updated enemy")
		enemy.setup(message)

func _add_hand_card(hand_card) -> void:
	print("Adding handcard ", hand_card)
	var card = CardFactory.create_card(hand_card.type)
	hand_cards.add_child(card)
	hand_card_ui_nodes[hand_card.id] = card

func _remove_hand_card(hand_card) -> void:
	print("Removing handcard ", hand_card)
	if hand_card_ui_nodes.has(hand_card.id):
		hand_card_ui_nodes[hand_card.id].queue_free()
	hand_card_ui_nodes.erase(hand_card.id)

func _on_hand_card_pressed(hand_card) -> void:
	print("Hand played ", hand_card)
	NetworkManager.room.send_message("play_card", { "id": hand_card.id })
