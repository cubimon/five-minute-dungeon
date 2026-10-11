class_name CardStack
extends Node2D

const Card = preload("res://scenes/game/cards/card.gd")

var cards = []

func _ready() -> void:
	cards = []

func push_card(card: Card) -> void:
	cards.push_back(card)

func shuffle() -> void:
	cards.shuffle()
