extends "res://scenes/game/cards/card.gd"

@onready var label: Label = $Label

func setup(enemy) -> void:
	label.text = enemy.name
	var requirements = ""
	for requirement in enemy.requirements:
		var open = requirement.count - requirement.played
		requirements += "%s %0.f\n" % [requirement.type, open]
	label.text += "\n" + requirements
