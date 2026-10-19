extends "res://scenes/game/cards/card.gd"

func setup(enemy) -> void:
	card_text = enemy.name
	var requirements = ""
	for requirement in enemy.requirements:
		var open = requirement.count - requirement.played
		requirements += "%s %0.f\n" % [requirement.type, open]
	card_text += "\n" + requirements
