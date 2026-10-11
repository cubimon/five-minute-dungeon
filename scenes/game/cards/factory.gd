class_name CardFactory
extends Node

enum CardType {
	ATTACK,     # 0
	SHIELD,     # 1
	MAGIC,      # 2
	JUMP,       # 3
}

const CARD_SCENES = {
	CardType.ATTACK: preload("res://scenes/game/cards/attackcard.tscn"),
	CardType.SHIELD: preload("res://scenes/game/cards/shieldcard.tscn"),
	CardType.MAGIC: preload("res://scenes/game/cards/magiccard.tscn"),
	CardType.JUMP: preload("res://scenes/game/cards/jumpcard.tscn"),
}

static func create_card(card_type: CardType) -> Node:
	# Check if the enum type exists in our map
	if not CARD_SCENES.has(card_type):
		printerr("Invalid CardType passed to CardFactory!")
		return null

	# Retrieve the PackedScene blueprint
	var scene_blueprint: PackedScene = CARD_SCENES[card_type]

	# Instantiate and return the node
	var card_instance = scene_blueprint.instantiate()
	return card_instance
