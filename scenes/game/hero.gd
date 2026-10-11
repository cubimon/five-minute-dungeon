extends Node2D

const CardStack = preload("res://scenes/game/cardstack.tscn")

@export var hero_name: String = "unknown"
var available_cards: CardStack = CardStack.instantiate()
var used_cards: CardStack = CardStack.instantiate()
