extends TextureButton

@export var card_text: String = "Unknown" :
	set(value):
		card_text = value
		if label:
			label.text = value

@onready var label: Label = $Label
@onready var sprite_2d: Sprite2D = $Sprite2D

func _ready() -> void:
	label.text = card_text
