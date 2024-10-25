const { Query } = require("./query");

async function monitorCollection(data) {
	const query = new Query("pvpBattles");

	const doucmentId = data._id;
	const date = new Date(data.created_at);

	const tenMinutes = 0.1 * 60 * 1000;

	if (Date.now() < date - tenMinutes) {
		await query.updateOne({ _id: data._id }, { status: "finished" });
	}
}

module.exports = {
	monitorCollection,
};
