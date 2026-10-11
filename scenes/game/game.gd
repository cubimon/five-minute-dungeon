extends Node2D

const CardStack = preload("res://scenes/game/cardstack.tscn")

var hand = []
var available_cards: CardStack = null
var used_cards: CardStack = null

func _ready() -> void:
	available_cards = CardStack.instantiate()
	for i in range(5):
		var card = CardFactory.create_card(CardFactory.CardType.ATTACK)
		available_cards.push_card(card)
	available_cards.shuffle()
	used_cards = CardStack.instantiate()
