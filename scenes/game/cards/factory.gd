class_name CardFactory
extends Node

const CARD_SCENES = {
	"ATTACK": preload("res://scenes/game/cards/attackcard.tscn"),
	"SHIELD": preload("res://scenes/game/cards/shieldcard.tscn"),
	"MAGIC": preload("res://scenes/game/cards/magiccard.tscn"),
	"JUMP": preload("res://scenes/game/cards/jumpcard.tscn"),
}

static func create_card(card_type: String) -> Node:
	# Check if the enum type exists in our map
	if not CARD_SCENES.has(card_type):
		printerr("Invalid CardType passed to CardFactory!")
		return null

	# Retrieve the PackedScene blueprint
	var scene_blueprint: PackedScene = CARD_SCENES[card_type]

	# Instantiate and return the node
	var card_instance = scene_blueprint.instantiate()
	return card_instance
