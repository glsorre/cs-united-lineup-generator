export async function getPlayers() {
    const response  = await fetch('https://raw.githubusercontent.com/glsorre/cs-united-lineup-generator/master/public/playersLists/data.json', {
        method: 'GET',
        headers: {
            accept: 'application/json', 
        }
    });

    const json = await response.json();
    const data = json.players.sort((a, b) => {
        return a.position.localeCompare(b.position) || a.surname.localeCompare(b.surname);
    });

    for (let player of data) {
        player.inLineup = false;
    }

    return data;
}