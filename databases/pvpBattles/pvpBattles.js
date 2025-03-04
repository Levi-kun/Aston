const pvpBattlesSchema = {
	collectionName: "pvpBattles",
	schema: {
		bsonType: "object",
		required: [
			"guild_id",
			"challenger_id",
			"challenged_id",
			"status",
			"created_at",
		],
		properties: {
			_id: { bsonType: "objectId" },
			guild_id: { bsonType: "string" },
			challenger_id: { bsonType: "string" },
			challenged_id: { bsonType: "string" },
			cards: {
				bsonType: "array",
				items: {
					bsonType: "object",
					required: [
						"card_id",
						"name",
						"power",
						"health",
						"isChallenger",
					],
					properties: {
						_id: { bsonType: "objectId" },
						card_id: { bsonType: "objectId" },
						name: { bsonType: "string" },
						power: { bsonType: "int" }, // Real-time power during battle
						health: { bsonType: "int" }, // Real-time health during battle
						rank: { bsonType: "string" },
						version: { bsonType: "string" },
						role: {
							bsonType: "string",
							enum: ["Attack", "Support"],
							description:
								"Defines whether the card is an Attack or Support card.",
						},
						isChallenger: {
							bsonType: "bool",
							description:
								"True if the card belongs to the challenger, false otherwise.",
						},
						move_sets: {
							bsonType: "array",
							items: {
								bsonType: "object",
								required: ["move_id", "move_name", "type"],
								properties: {
									move_id: { bsonType: "objectId" },
									move_name: { bsonType: "string" },
									type: {
										bsonType: "string",
										enum: [
											"BUFF",
											"DEBUFF",
											"FOCUS",
											"SPECIAL",
										],
										description:
											"Type of move being performed.",
									},
									targetAttribute: {
										bsonType: "string",
										description:
											"The stat this move affects.",
									},
									value: { bsonType: "int" },
									duration: {
										bsonType: "int",
										description:
											"Turns this move remains active.",
									},
									focusTurns: {
										bsonType: "int",
										description:
											"Tracks how many turns the FOCUS move has charged.",
									},
									requirementForm: {
										bsonType: "object",
										description:
											"Special condition for SPECIAL moves.",
										properties: {
											requirement: {
												bsonType: "object",
												properties: {
													type: {
														bsonType: "string",
													},
													value: { bsonType: "int" },
												},
											},
											newMove: {
												bsonType: "object",
												properties: {
													move_name: {
														bsonType: "string",
													},
													modifiers: {
														bsonType: "array",
														items: {
															bsonType: "object",
															properties: {
																type: {
																	bsonType:
																		"string",
																},
																target: {
																	bsonType:
																		"string",
																},
																value: {
																	bsonType:
																		"int",
																},
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
						effects: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									sourceCard: { bsonType: "string" },
									type: {
										bsonType: "string",
										enum: ["BUFF", "DEBUFF"],
									},
									targetAttribute: { bsonType: "string" },
									value: { bsonType: "int" },
									duration: { bsonType: "int" },
									appliedAt: { bsonType: "date" },
								},
							},
						},
						focusProgress: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									move_id: { bsonType: "objectId" },
									turnsLeft: { bsonType: "int" },
									target: { bsonType: "string" },
								},
							},
						},
					},
				},
			},
			active_card: {
				bsonType: "object",
				properties: {
					card_id: { bsonType: "objectId" },
					health: { bsonType: "int" },
				},
			},
			soul_card: {
				bsonType: "object",
				required: ["card_id", "health"],
				properties: {
					card_id: { bsonType: "objectId" },
					health: { bsonType: "int" },
				},
			},
			channel_id: {
				bsonType: "string",
				description: "Channel ID where the battle started.",
			},
			current_turn: { bsonType: "string" },
			status: { bsonType: "string" },
			created_at: { bsonType: "date" },
			winner_id: { bsonType: "string" },
			loser_id: { bsonType: "string" },
			turnCount: { bsonType: "int" },
			finished_at: { bsonType: "date" },
		},
	},
};

module.exports = pvpBattlesSchema;
