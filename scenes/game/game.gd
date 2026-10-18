extends Control

const CardStack = preload("res://scenes/game/cardstack.tscn")

@onready var hand_cards: HBoxContainer = $HandCards

var hand_card_ui_nodes = {}

func _ready() -> void:
	var session_id = NetworkManager.room.get_session_id()
	var player = NetworkManager.room.state.players[session_id]
	for hand_card in player.handCards:
		print("Adding handcard ", hand_card)
		var card = CardFactory.create_card(hand_card.type)
		card.pressed.connect(_on_hand_card_pressed.bind(hand_card))
		hand_cards.add_child(card)
		hand_card_ui_nodes[hand_card.id] = card
	NetworkManager.callbacks.on_add(player, "handCards", _add_hand_card)
	NetworkManager.callbacks.on_remove(player, "handCards", _remove_hand_card)

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
	# TODO: play
	print("Hand card pressed ", hand_card)
